"""
Agriculture Router — CivicSaathi
Live mandi prices via data.gov.in (Agmarknet), crop diagnostics via Groq AI.
"""

from __future__ import annotations

import asyncio
import os
import json
import logging
import time
from typing import Optional, Any

import httpx
from fastapi import APIRouter, Query, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from groq import Groq

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agriculture", tags=["Agriculture"])

COMMODITIES_KEY = os.getenv("COMMODITIES_PRICES", "")
GROQ_API_KEY    = os.getenv("GROQ_API_KEY", "")

AGMARKNET_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

TRACKED_CROPS = [
    "Wheat", "Rice", "Maize", "Cotton", "Soybean",
    "Tomato", "Onion", "Potato", "Sugarcane", "Mustard",
]

# ── Simple in-memory cache (TTL = 30 minutes) ─────────────────────────────────
_cache: dict[str, tuple[list, float]] = {}  # key -> (records, timestamp)
_CACHE_TTL = 1800  # seconds


def _cache_key(commodity: str, state: Optional[str]) -> str:
    return f"{commodity}|{state or ''}"

# ── Pydantic schemas ──────────────────────────────────────────────────────────

class MarketSummary(BaseModel):
    crop: str
    price: str
    modal_price: float
    min_price: float
    max_price: float
    unit: str = "/q"
    market: str
    state: str
    arrival_date: str
    records_found: int
    source: str = "data.gov.in"

class MandiRecord(BaseModel):
    commodity: str
    state: str
    district: str
    market: str
    variety: str
    arrival_date: str
    min_price: float
    max_price: float
    modal_price: float

class DiagnosisResponse(BaseModel):
    diagnosis: str
    confidence: int
    treatment: list[str]
    schemes: list[str]
    is_mock: bool

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    diagnosis_context: str

class CropCalendarRequest(BaseModel):
    state: str
    season: str          # kharif | rabi | zaid
    soil_type: str       # loamy | sandy | clayey | black | red

class YieldPredictRequest(BaseModel):
    crop: str
    area_acres: float
    soil_type: str
    rainfall_mm: float
    state: str

class IrrigationRequest(BaseModel):
    crop: str
    soil_moisture_pct: float
    temp_c: float
    humidity_pct: float
    crop_stage: str      # sowing | vegetative | flowering | maturity

# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt_price(p: float) -> str:
    return f"₹{int(p):,}"


# Global placeholder for the semaphore. Will be created lazily inside the event loop.
_semaphore: Optional[asyncio.Semaphore] = None

async def _fetch_commodity(commodity: str, state: Optional[str] = None) -> list[dict]:
    """Fetch mandi records for one commodity. Cached for 30 min."""
    if not COMMODITIES_KEY:
        return []

    key = _cache_key(commodity, state)
    cached = _cache.get(key)
    if cached and (time.monotonic() - cached[1]) < _CACHE_TTL:
        return cached[0]

    params: dict = {
        "api-key": COMMODITIES_KEY,
        "format": "json",
        "limit": "100",
        "filters[commodity]": commodity,
    }
    if state:
        params["filters[state]"] = state

    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(3)

    async with _semaphore:
        try:
            # Using a custom User-Agent to prevent API silently dropping connections (ReadTimeout)
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
                r = await client.get(AGMARKNET_URL, params=params)
                r.raise_for_status()
                records = r.json().get("records", [])
                _cache[key] = (records, time.monotonic())
                return records
        except asyncio.CancelledError:
            raise  # let asyncio.gather handle it
        except Exception as exc:
            logger.exception("Agmarknet fetch failed for %s", commodity)
            return []


def _aggregate(records: list[dict]) -> Optional[dict]:
    if not records:
        return None
    latest_date = sorted({r.get("arrival_date", "") for r in records}, reverse=True)[0]
    today = [r for r in records if r.get("arrival_date") == latest_date] or records

    modals = [float(r["modal_price"]) for r in today if r.get("modal_price")]
    if not modals:
        return None

    return {
        "modal_price":   round(sum(modals) / len(modals), 2),
        "min_price":     round(min(float(r.get("min_price", 0)) for r in today), 2),
        "max_price":     round(max(float(r.get("max_price", 0)) for r in today), 2),
        "market":        today[0].get("market", ""),
        "state":         today[0].get("state", ""),
        "arrival_date":  latest_date,
        "records_found": len(today),
    }

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/market-prices", response_model=list[MarketSummary])
async def get_market_prices(
    state: Optional[str] = Query(None, description="Filter by state e.g. 'Telangana'"),
    crops: Optional[str] = Query(None, description="Comma-separated crop names"),
):
    """Live mandi modal prices from data.gov.in Agmarknet. Prices in ₹/quintal."""
    if not COMMODITIES_KEY:
        raise HTTPException(503, "COMMODITIES_PRICES API key not configured")

    wanted = [c.strip() for c in crops.split(",") if c.strip()] if crops else TRACKED_CROPS

    # Fetch all crops concurrently; return_exceptions=True means one failure
    # won't cancel the rest — failed crops just return empty lists.
    tasks = [_fetch_commodity(crop, state) for crop in wanted]
    all_records = await asyncio.gather(*tasks, return_exceptions=True)

    results: list[MarketSummary] = []
    for crop, records in zip(wanted, all_records):
        if not isinstance(records, list):
            logger.warning("Skipping %s due to exception: %s", crop, records)
            continue
        agg = _aggregate(records)
        if agg:
            results.append(MarketSummary(
                crop=crop,
                price=_fmt_price(agg["modal_price"]),
                modal_price=agg["modal_price"],
                min_price=agg["min_price"],
                max_price=agg["max_price"],
                market=agg["market"],
                state=agg["state"],
                arrival_date=agg["arrival_date"],
                records_found=agg["records_found"],
            ))
    return results


@router.get("/market-prices/{commodity}", response_model=list[MandiRecord])
async def get_commodity_detail(
    commodity: str,
    state: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    """Raw mandi records for a commodity (drill-down view)."""
    if not COMMODITIES_KEY:
        raise HTTPException(503, "COMMODITIES_PRICES API key not configured")

    records = await _fetch_commodity(commodity, state)
    records_sorted = sorted(records, key=lambda r: r.get("arrival_date", ""), reverse=True)
    out = []
    for r in records_sorted[:limit]:
        try:
            out.append(MandiRecord(
                commodity=r["commodity"],
                state=r["state"],
                district=r["district"],
                market=r["market"],
                variety=r["variety"],
                arrival_date=r["arrival_date"],
                min_price=float(r["min_price"]),
                max_price=float(r["max_price"]),
                modal_price=float(r["modal_price"]),
            ))
        except Exception:
            continue
    return out


@router.post("/analyze", response_model=DiagnosisResponse)
async def analyze_crop(
    image: UploadFile = File(...),
    description: str  = Form("Analyze this crop for diseases"),
    language: str     = Form("en"),
):
    """AI crop disease diagnosis via Groq LLaMA. Falls back to mock if unavailable."""
    if not GROQ_API_KEY:
        return _mock_diagnosis()

    try:
        client = Groq(api_key=GROQ_API_KEY)
        system_prompt = (
            "You are an expert Indian agricultural scientist. "
            "Based on the farmer's crop symptom description, respond ONLY with a valid JSON object "
            "in this exact format (no markdown, no extra text):\n"
            '{"diagnosis": "<disease or condition name>", "confidence": <integer 60-99>, '
            '"treatment": ["<step 1>", "<step 2>", "<step 3>", "<step 4>"], '
            '"schemes": ["<scheme 1>", "<scheme 2>", "<scheme 3>"]}'
        )
        user_msg = (
            f"A farmer reports the following crop symptoms: {description}. "
            "Diagnose the most likely disease or deficiency, give a confidence percentage, "
            "4 specific treatment steps, and 3 relevant Indian government schemes."
        )
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_msg},
            ],
            max_tokens=700,
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        raw  = (resp.choices[0].message.content or "").strip()
        data = json.loads(raw)
        return DiagnosisResponse(
            diagnosis=data.get("diagnosis", "Unknown"),
            confidence=int(data.get("confidence", 75)),
            treatment=data.get("treatment", []),
            schemes=data.get("schemes", []),
            is_mock=False,
        )
    except Exception as exc:
        logger.warning("Groq diagnosis failed: %s", exc)
        return _mock_diagnosis()


def _mock_diagnosis() -> DiagnosisResponse:
    return DiagnosisResponse(
        diagnosis="Bacterial Leaf Blight",
        confidence=87,
        treatment=[
            "Apply copper-based bactericide (Blitox 50) at 3g/L every 7 days",
            "Remove and destroy all infected plant material immediately",
            "Switch from overhead to drip/furrow irrigation to reduce leaf wetness",
            "Apply potassium fertiliser to strengthen plant cell walls",
        ],
        schemes=["PM Fasal Bima Yojana", "Rashtriya Krishi Vikas Yojana", "PKVY Organic Mission"],
        is_mock=True,
    )


@router.post("/analyze-chat")
async def analyze_chat(req: ChatRequest):
    """Conversational AI for follow-ups on the crop diagnosis."""
    if not GROQ_API_KEY:
        return {"reply": "Sorry, offline mode. Can't process follow-up questions without an active connection."}
    
    try:
        client = Groq(api_key=GROQ_API_KEY)
        # Format conversation history
        messages: list[Any] = [{"role": "system", "content": f"You are an expert Indian agricultural scientist. You just diagnosed a farmer's crop with the following context: {req.diagnosis_context}. Answer the farmer's follow-up questions concisely and practically."}]
        for m in req.messages:
            messages.append({"role": m.role, "content": m.content})
            
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )
        reply = (resp.choices[0].message.content or "").strip()
        return {"reply": reply}
    except Exception as exc:
        logger.warning("Groq chat failed: %s", exc)
        return {"reply": "I'm having trouble connecting right now. Please try again later."}


# ── AI Planner Endpoints ──────────────────────────────────────────────────────

def _groq_json(system: str, user: str) -> dict:
    """Helper: call Groq and parse JSON. Raises on failure."""
    client = Groq(api_key=GROQ_API_KEY)
    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=800, temperature=0.4,
        response_format={"type": "json_object"},
    )
    return json.loads((resp.choices[0].message.content or "{}").strip())


@router.post("/crop-calendar")
async def crop_calendar(req: CropCalendarRequest):
    """AI-generated crop sowing calendar for the given state/season/soil."""
    if not GROQ_API_KEY:
        return _mock_crop_calendar()
    try:
        system = (
            "You are an expert Indian agronomist. Return ONLY a valid JSON object. "
            'Schema: {"recommended_crops": [{"name": str, "sow_month": str, "harvest_month": str, '
            '"water_need": "low|medium|high", "expected_yield_q_per_acre": float, "notes": str}], '
            '"season_tip": str}'
        )
        user = f"State: {req.state}, Season: {req.season}, Soil: {req.soil_type}. Recommend top 5 crops."
        return _groq_json(system, user)
    except Exception as e:
        logger.warning("crop_calendar failed: %s", e)
        return _mock_crop_calendar()


@router.post("/yield-predict")
async def yield_predict(req: YieldPredictRequest):
    """AI yield prediction based on crop + environment parameters."""
    if not GROQ_API_KEY:
        return _mock_yield(req.crop, req.area_acres)
    try:
        system = (
            "You are an expert Indian agronomist. Return ONLY valid JSON. "
            'Schema: {"estimated_yield_kg": float, "yield_per_acre_kg": float, '
            '"confidence_pct": int, "grade": "excellent|good|average|below_average", '
            '"tips": [str, str, str]}'
        )
        user = (
            f"Crop: {req.crop}, Area: {req.area_acres} acres, Soil: {req.soil_type}, "
            f"Rainfall: {req.rainfall_mm}mm, State: {req.state}. Predict yield."
        )
        return _groq_json(system, user)
    except Exception as e:
        logger.warning("yield_predict failed: %s", e)
        return _mock_yield(req.crop, req.area_acres)


@router.post("/irrigation-advice")
async def irrigation_advice(req: IrrigationRequest):
    """Smart irrigation recommendation based on current soil and weather."""
    if not GROQ_API_KEY:
        return _mock_irrigation(req.soil_moisture_pct)
    try:
        system = (
            "You are a precision agriculture expert. Return ONLY valid JSON. "
            'Schema: {"should_irrigate": bool, "urgency": "immediate|within_24h|within_48h|not_needed", '
            '"next_irrigation_hours": int, "quantity_liters_per_acre": int, "reason": str, '
            '"warning": str}'
        )
        user = (
            f"Crop: {req.crop}, Stage: {req.crop_stage}, Soil moisture: {req.soil_moisture_pct}%, "
            f"Temp: {req.temp_c}°C, Humidity: {req.humidity_pct}%. Should I irrigate today?"
        )
        return _groq_json(system, user)
    except Exception as e:
        logger.warning("irrigation_advice failed: %s", e)
        return _mock_irrigation(req.soil_moisture_pct)


@router.get("/price-history/{crop}")
async def price_history(crop: str):
    """12-week synthetic price trend seeded by the current live modal price."""
    import random, math
    # Try to get current real price as seed
    records = await _fetch_commodity(crop, None)
    agg = _aggregate(records) if records else None
    base_price = agg["modal_price"] if agg else 1800.0

    # Generate 12 weeks of plausible price fluctuation using sine wave + noise
    weeks, prices = [], []
    for i in range(12):
        week_label = f"W{12 - i}"
        # Slight sine wave trend + random noise ±8%
        price = base_price * (1 + 0.05 * math.sin(i * 0.8) + random.uniform(-0.08, 0.08))
        weeks.insert(0, week_label)
        prices.insert(0, round(price, 2))

    return {"crop": crop, "weeks": weeks, "prices": prices, "unit": "₹/quintal", "current_price": base_price}


@router.get("/subsidies")
async def get_subsidies():
    """Curated list of central government agricultural subsidies."""
    return {
        "subsidies": [
            {"name": "PM Fasal Bima Yojana (PMFBY)", "category": "Insurance", "benefit": "Up to 90% premium subsidy on crop insurance", "eligibility": "All farmers growing notified crops", "link": "https://pmfby.gov.in"},
            {"name": "Fertilizer Subsidy (Urea)", "category": "Input", "benefit": "₹45,000–55,000 crore annually; MRP fixed at ₹266.50 per 45kg bag", "eligibility": "All farmers", "link": "https://fert.nic.in"},
            {"name": "PM Kisan Samman Nidhi", "category": "Direct Benefit", "benefit": "₹6,000/year in 3 installments direct to bank account", "eligibility": "Small & marginal landholding farmers", "link": "https://pmkisan.gov.in"},
            {"name": "Soil Health Card Scheme", "category": "Advisory", "benefit": "Free soil testing + personalized fertilizer recommendations", "eligibility": "All farmers", "link": "https://soilhealth.dac.gov.in"},
            {"name": "PM KUSUM Scheme", "category": "Equipment", "benefit": "Up to 60% subsidy on solar-powered irrigation pumps", "eligibility": "Individual farmers, WUAs, FPOs", "link": "https://mnre.gov.in"},
            {"name": "National Food Security Mission", "category": "Seeds", "benefit": "50% subsidy on certified seeds of rice, wheat, pulses", "eligibility": "Farmers in notified districts", "link": "https://nfsm.gov.in"},
            {"name": "RKVY (Rashtriya Krishi Vikas Yojana)", "category": "Development", "benefit": "Grants for farm infrastructure, storage, processing units", "eligibility": "State governments + farmer groups", "link": "https://rkvy.nic.in"},
            {"name": "eNAM (National Agriculture Market)", "category": "Market Access", "benefit": "Online mandi platform — better price discovery, no middlemen", "eligibility": "All farmers with APL card", "link": "https://enam.gov.in"},
        ]
    }


# ── Mocks ─────────────────────────────────────────────────────────────────────

def _mock_crop_calendar():
    return {
        "recommended_crops": [
            {"name": "Paddy (Rice)", "sow_month": "June", "harvest_month": "October", "water_need": "high", "expected_yield_q_per_acre": 18.0, "notes": "Transplant 25-day-old seedlings. Maintain 5cm water level."},
            {"name": "Cotton", "sow_month": "May", "harvest_month": "December", "water_need": "medium", "expected_yield_q_per_acre": 8.5, "notes": "Requires deep, well-drained soil. Watch for bollworm."},
            {"name": "Soybean", "sow_month": "June", "harvest_month": "September", "water_need": "medium", "expected_yield_q_per_acre": 10.0, "notes": "Ideal for black soil. Apply Rhizobium seed treatment."},
            {"name": "Maize", "sow_month": "June", "harvest_month": "September", "water_need": "medium", "expected_yield_q_per_acre": 20.0, "notes": "Requires nitrogen-rich soil. 2 top dressings of Urea."},
            {"name": "Groundnut", "sow_month": "June", "harvest_month": "October", "water_need": "low", "expected_yield_q_per_acre": 12.0, "notes": "Sandy loam soil is ideal. Use gypsum for pod filling."},
        ],
        "season_tip": "Ensure soil moisture is at field capacity before sowing. Apply basal dose of NPK fertilizer.",
    }


def _mock_yield(crop: str, area: float):
    base_yield = {"Wheat": 1800, "Rice": 2000, "Cotton": 850, "Soybean": 1000, "Maize": 2200}.get(crop, 1500)
    return {
        "estimated_yield_kg": round(base_yield * area),
        "yield_per_acre_kg": base_yield,
        "confidence_pct": 78,
        "grade": "good",
        "tips": ["Apply 2nd dose of nitrogen fertilizer at tillering stage", "Ensure adequate drainage before harvesting", "Monitor for pest activity in the next 2 weeks"],
    }


def _mock_irrigation(moisture: float):
    irrigate = moisture < 45
    return {
        "should_irrigate": irrigate,
        "urgency": "within_24h" if moisture < 35 else ("within_48h" if moisture < 45 else "not_needed"),
        "next_irrigation_hours": 12 if moisture < 35 else (36 if moisture < 45 else 72),
        "quantity_liters_per_acre": 18000 if irrigate else 0,
        "reason": f"Soil moisture at {moisture}%. {'Below threshold for most kharif crops.' if irrigate else 'Adequate for current crop stage.'}",
        "warning": "Risk of wilting if delayed further." if moisture < 30 else "",
    }

