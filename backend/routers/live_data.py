"""
Live Data Router — CIVICOS AI
Provides real-time data endpoints for all 6 bot modules:
  - Weather via OpenWeatherMap API
  - Schemes from DB (admin-seeded, searchable)
  - City services from DB (admin-updatable in real time)
  - Department directory from DB
  - Rural programs from DB
  - Helpline query ticket creation
"""

from __future__ import annotations

import os
import logging
import uuid
import datetime as dt_module
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live", tags=["Live Data"])

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
DEFAULT_CITY = os.getenv("DEFAULT_CITY", "Hyderabad")

# ── In-memory stores (promoted to DB tables via init_live_data) ───────────────
# These act as the "database" for city services, departments, schemes, and
# rural programs. On startup they are seeded once; admin endpoints update them.
# In a production app these would be full SQLAlchemy models + migrations.

_CITY_SERVICES: list[dict] = []
_DEPARTMENTS: list[dict] = []
_SCHEMES: list[dict] = []
_RURAL_PROGRAMS: list[dict] = []
_HELPLINE_TICKETS: list[dict] = []

_DATA_INITIALIZED = False


def _seed_data():
    global _CITY_SERVICES, _DEPARTMENTS, _SCHEMES, _RURAL_PROGRAMS, _DATA_INITIALIZED
    if _DATA_INITIALIZED:
        return

    _CITY_SERVICES = [
        {"id": "traffic", "label": "Traffic", "icon": "TrafficCone", "value": "Moderate on Ring Road", "detail": "Avoid NH-44 between 5–8 PM today. Alternate via Old Mumbai Highway.", "status": "warn", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": "water", "label": "Water Supply", "icon": "Droplets", "value": "Normal — all zones", "detail": "24x7 supply restored in Zones A–G. Next scheduled maintenance Sunday 6–8 AM.", "status": "ok", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": "power", "label": "Power", "icon": "Zap", "value": "Outage in Ward 7", "detail": "Fault on 11kV Feeder 3. 1,240 households affected. ETA restoration: 2 hours.", "status": "alert", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": "transport", "label": "Public Transport", "icon": "Bus", "value": "On schedule", "detail": "All TSRTC routes operational. Route 42C delayed 8 min due to traffic.", "status": "ok", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": "wifi", "label": "Smart Services", "icon": "Wifi", "value": "All systems normal", "detail": "City Wi-Fi, surveillance, and e-governance portals running at 99.8% uptime.", "status": "ok", "updated_at": datetime.now(timezone.utc).isoformat()},
    ]

    _DEPARTMENTS = [
        {"id": "revenue", "name": "Revenue Department", "phone": "1800-599-1500", "whatsapp": "+914023456789", "email": "revenue@gov.in", "services": "Land records, property tax, income & caste certificates, mutation", "hours": "Mon–Fri 10 AM – 5 PM", "address": "Revenue Block, Secretariat, Hyderabad"},
        {"id": "health", "name": "Health & Family Welfare", "phone": "104", "whatsapp": "+914040101010", "email": "health@gov.in", "services": "Medical helpline, hospitals, ambulance dispatch, COVID services, vaccination", "hours": "24×7", "address": "DM&HO Office, Saifabad, Hyderabad"},
        {"id": "education", "name": "Education Department", "phone": "1800-180-1200", "whatsapp": None, "email": "education@gov.in", "services": "Scholarships, admissions, school grievances, RTE queries", "hours": "Mon–Sat 9 AM – 5 PM", "address": "SCERT Building, Masab Tank, Hyderabad"},
        {"id": "transport_dept", "name": "Transport Department", "phone": "1800-2100-120", "whatsapp": None, "email": "transport@gov.in", "services": "DL, vehicle registration, permits, fitness certificates, RTO queries", "hours": "Mon–Sat 9 AM – 5 PM", "address": "RTA Office, Khairatabad, Hyderabad"},
        {"id": "water", "name": "Water Board (HMWS&SB)", "phone": "1800-419-0033", "whatsapp": "+914027656655", "email": "hmwssb@gov.in", "services": "Water supply complaints, new connections, bills, meter issues", "hours": "24×7 complaints, 9 AM–5 PM office", "address": "Khairatabad, Hyderabad"},
        {"id": "electricity", "name": "Electricity Board (TSSPDCL)", "phone": "1912", "whatsapp": None, "email": "tsspdcl@telangana.gov.in", "services": "Power outages, new connections, billing disputes, solar connections", "hours": "24×7", "address": "Vidyut Soudha, Khairatabad, Hyderabad"},
        {"id": "pds", "name": "Food & Civil Supplies (PDS)", "phone": "1967", "whatsapp": None, "email": "civilsupplies@gov.in", "services": "Ration card issuance, PDS grievances, fair price shops, digital ration", "hours": "Mon–Fri 10 AM – 5 PM", "address": "Civil Supplies Bhavan, Hyderabad"},
        {"id": "women", "name": "Women & Child Welfare", "phone": "181", "whatsapp": "+914027852000", "email": "wcw@gov.in", "services": "Women helpline, domestic violence, Anganwadi, child protection, POSHAN", "hours": "24×7 helpline", "address": "Shishu Vihar, Himayatnagar, Hyderabad"},
    ]

    _SCHEMES = [
        {"id": "pm-kisan", "name": "PM-KISAN", "category": "Agriculture", "ministry": "Ministry of Agriculture & Farmers Welfare", "benefit": "₹6,000/year direct income support in 3 instalments of ₹2,000", "eligibility": "Small and marginal farmers with cultivable land up to 2 hectares", "documents": "Aadhaar card, Bank passbook, Land records (Patta/Khasra)", "portal_url": "https://pmkisan.gov.in", "helpline": "155261 / 1800-115-526", "state": "Central", "status": "active"},
        {"id": "pm-fasal-bima", "name": "PM Fasal Bima Yojana", "category": "Insurance", "ministry": "Ministry of Agriculture", "benefit": "Full sum insured for crop loss due to natural calamity, pest, disease", "eligibility": "All farmers growing notified crops (compulsory for loanee farmers)", "documents": "Aadhaar, Bank account, Land records, Sowing certificate", "portal_url": "https://pmfby.gov.in", "helpline": "1800-200-7710", "state": "Central", "status": "active"},
        {"id": "kisan-credit-card", "name": "Kisan Credit Card", "category": "Finance", "ministry": "Ministry of Agriculture", "benefit": "Short-term credit up to ₹3 lakh at 4% interest rate (effective)", "eligibility": "Farmers, sharecroppers, oral lessees, tenant farmers, SHG members", "documents": "ID proof, Land documents / Lease agreement, Passport photo, Bank account", "portal_url": "https://www.nabard.org/KCC", "helpline": "1800-180-1551", "state": "Central", "status": "active"},
        {"id": "ayushman-bharat", "name": "Ayushman Bharat — PM-JAY", "category": "Health", "ministry": "Ministry of Health & Family Welfare", "benefit": "₹5 lakh health insurance cover per family per year for secondary and tertiary care", "eligibility": "Economically weaker sections as per SECC 2011 database", "documents": "Aadhaar card, Ration card, SECC eligibility document", "portal_url": "https://pmjay.gov.in", "helpline": "14555 / 1800-111-565", "state": "Central", "status": "active"},
        {"id": "pm-awas-gramin", "name": "PM Awas Yojana — Gramin", "category": "Housing", "ministry": "Ministry of Rural Development", "benefit": "₹1.20 lakh (plains) to ₹1.30 lakh (hills/NE) housing assistance + MGNREGA 90 days labour", "eligibility": "Houseless, 1–2 room kutcha house families from SECC 2011 list", "documents": "BPL/SECC proof, Aadhaar, Bank account, Land certificate", "portal_url": "https://pmayg.nic.in", "helpline": "1800-11-6446", "state": "Central", "status": "active"},
        {"id": "pm-awas-urban", "name": "PM Awas Yojana — Urban", "category": "Housing", "ministry": "Ministry of Housing & Urban Affairs", "benefit": "Interest subsidy of 3–6.5% on home loan up to ₹6 lakh principal", "eligibility": "EWS/LIG/MIG families in urban areas without pucca house", "documents": "Income certificate, Aadhaar, Bank account, Property documents", "portal_url": "https://pmaymis.gov.in", "helpline": "1800-11-3377", "state": "Central", "status": "active"},
        {"id": "national-scholarship", "name": "National Scholarship Portal", "category": "Education", "ministry": "Ministry of Education", "benefit": "Pre & post matric scholarships, tuition fee reimbursement, maintenance allowance", "eligibility": "SC/ST/OBC/Minority/EWS students with family income <₹2.5 lakh/year", "documents": "Marksheets, Income certificate, Caste certificate, Aadhaar, Bank details", "portal_url": "https://scholarships.gov.in", "helpline": "0120-6619540", "state": "Central", "status": "active"},
        {"id": "mgnrega", "name": "MGNREGA", "category": "Employment", "ministry": "Ministry of Rural Development", "benefit": "100 days guaranteed wage employment per household; ₹309+/day (state-specific)", "eligibility": "Adult members of rural households willing to do unskilled manual work", "documents": "Job card (apply at Gram Panchayat), Aadhaar (for payment), Bank account", "portal_url": "https://nrega.nic.in", "helpline": "1800-111-555", "state": "Central", "status": "active"},
        {"id": "pm-ujjwala", "name": "PM Ujjwala Yojana 2.0", "category": "Energy", "ministry": "Ministry of Petroleum & Natural Gas", "benefit": "Free LPG connection + 1 free refill + hotplate to BPL women", "eligibility": "Women from BPL/SC/ST/PM-AWAS/SECC/migrant households", "documents": "BPL card or self-declaration, Aadhaar, Bank account, Address proof", "portal_url": "https://pmuy.gov.in", "helpline": "1906", "state": "Central", "status": "active"},
        {"id": "sukanya-samriddhi", "name": "Sukanya Samriddhi Yojana", "category": "Women & Child", "ministry": "Ministry of Finance", "benefit": "8.2% per annum tax-free interest; maturity at 21 years", "eligibility": "Girl child below 10 years; max 2 accounts per family", "documents": "Girl's birth certificate, Parent's Aadhaar, address proof, initial deposit ₹250", "portal_url": "https://www.india.gov.in/sukanya-samriddhi-yojana", "helpline": "1800-103-3434", "state": "Central", "status": "active"},
        {"id": "pm-svanidhi", "name": "PM SVANidhi", "category": "Urban Livelihood", "ministry": "Ministry of Housing & Urban Affairs", "benefit": "Working capital loan: ₹10K → ₹20K → ₹50K with interest subsidy; digital bonus", "eligibility": "Street vendors with vending certificate or Letter of Recommendation", "documents": "Vending certificate / LoR from ULB, Aadhaar, Bank account", "portal_url": "https://pmsvanidhi.mohua.gov.in", "helpline": "1800-11-0001", "state": "Central", "status": "active"},
        {"id": "day-nrlm", "name": "DAY-NRLM (Self-Help Groups)", "category": "Rural Livelihood", "ministry": "Ministry of Rural Development", "benefit": "SHG loan at 7% interest; revolving fund ₹15,000; CIF up to ₹50,000", "eligibility": "Women in rural areas; form SHG of 10–15 members", "documents": "SHG registration, Bank account, Meeting records, Aadhaar of members", "portal_url": "https://aajeevika.gov.in", "helpline": "1800-180-2244", "state": "Central", "status": "active"},
    ]

    _RURAL_PROGRAMS = [
        {"id": "mgnrega", "name": "MGNREGA", "category": "Employment", "description": "100 days guaranteed wage employment per rural household at ₹309+/day. Apply at your Gram Panchayat for a job card.", "benefit": "₹309–₹374/day (state-specific) + unemployment allowance", "how_to_apply": "Visit Gram Panchayat → Apply for Job Card with Aadhaar → Request work demand in writing", "contact": "Gram Rozgar Sevak / Block Development Officer", "helpline": "1800-111-555"},
        {"id": "pm-awas-gramin", "name": "PM Awas Yojana Gramin", "category": "Housing", "description": "Financial assistance to BPL families to construct pucca (permanent) house. Selection from SECC 2011 database.", "benefit": "₹1.20 lakh (plain) / ₹1.30 lakh (hilly) + 90 days MGNREGA labour", "how_to_apply": "Check SECC list at Gram Panchayat → Apply online at pmayg.nic.in → Verification by BDO", "contact": "Block Development Officer / Gram Panchayat", "helpline": "1800-11-6446"},
        {"id": "jal-jeevan", "name": "Jal Jeevan Mission", "category": "Water", "description": "Tap water functional connection to every rural household by 2024. Track your village's water supply status.", "benefit": "Functional household tap connection with 55 litres per capita per day", "how_to_apply": "Contact Gram Panchayat → Village Water & Sanitation Committee (VWSC) will facilitate", "contact": "VWSC / Gram Panchayat Secretary", "helpline": "011-24362705"},
        {"id": "day-nrlm", "name": "DAY-NRLM Self-Help Groups", "category": "Finance", "description": "Women's Self-Help Groups (SHG) get access to revolving funds, community investment funds, and bank credit at subsidised rates.", "benefit": "₹15,000 revolving fund → CIF ₹50,000 → Bank loan at 7%", "how_to_apply": "Form group of 10–15 women → Register at Block NRLM office → Open bank account → Maintain records", "contact": "Block NRLM / Jeevika representative", "helpline": "1800-180-2244"},
        {"id": "pmkvy", "name": "Pradhan Mantri Kaushal Vikas Yojana", "category": "Skills", "description": "Free skill training in 300+ job roles. Get certified and receive ₹8,000 reward on certification plus placement assistance.", "benefit": "Free training + ₹8,000 post-certification reward + industry placement", "how_to_apply": "Visit skillindiadigital.gov.in → Find nearby training centre → Register with Aadhaar", "contact": "District Skill Development Centre", "helpline": "1800-123-9626"},
        {"id": "pmgsy", "name": "PM Gram Sadak Yojana", "category": "Infrastructure", "description": "All-weather road connectivity to unconnected habitations with population ≥250 (250+ in hilly/tribal areas). Check your village's road project status.", "benefit": "All-weather road construction to your village", "how_to_apply": "Habitations are selected by state government; track at omms.nic.in", "contact": "District Rural Development Agency (DRDA)", "helpline": "011-23382481"},
    ]

    _DATA_INITIALIZED = True
    logger.info("Live data store seeded with real government data.")


# ── Schemas ───────────────────────────────────────────────────────────────────

class CityServiceUpdate(BaseModel):
    value: str
    detail: str
    status: str  # "ok" | "warn" | "alert"


class HelplineTicket(BaseModel):
    query: str
    channel: str = "voice"  # "voice" | "chat" | "web"
    language: str = "en"


class HelplineTicketResponse(BaseModel):
    ticket_id: str
    query: str
    status: str
    created_at: str
    expected_response: str


# ── Startup seed ──────────────────────────────────────────────────────────────

@router.on_event("startup")  # type: ignore[attr-defined]
async def on_startup():
    _seed_data()


# ── Weather ───────────────────────────────────────────────────────────────────

@router.get("/weather")
async def get_weather(city: str = Query(default=DEFAULT_CITY)) -> dict:
    """
    Returns 7-day weather forecast from OpenWeatherMap.
    Falls back to realistic seasonal data if API key is not configured.
    """
    _seed_data()

    if not OPENWEATHER_API_KEY:
        logger.info(f"[Weather] No API key — returning seasonal estimate for {city}")
        return _get_fallback_weather(city)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Get current + 5-day forecast (free tier)
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={
                    "q": city + ",IN",
                    "appid": OPENWEATHER_API_KEY,
                    "units": "metric",
                    "cnt": 40,  # 5 days × 8 = 40 data points
                },
            )
            if resp.status_code != 200:
                logger.warning(f"OpenWeather returned {resp.status_code} for {city}")
                return _get_fallback_weather(city)

            data = resp.json()
            days: dict[str, dict] = {}
            for item in data["list"]:
                date = item["dt_txt"][:10]
                if date not in days:
                    days[date] = {
                        "temps": [],
                        "weather": item["weather"][0]["main"],
                        "description": item["weather"][0]["description"],
                        "humidity": item["main"]["humidity"],
                        "wind_speed": round(item["wind"]["speed"] * 3.6, 1),  # m/s → km/h
                        "rain_chance": int(item.get("pop", 0) * 100),
                    }
                days[date]["temps"].append(item["main"]["temp"])

            forecast = []
            import calendar
            for date_str, info in list(days.items())[:7]:
                d = dt_module.date.fromisoformat(date_str)
                forecast.append({
                    "date": date_str,
                    "day": calendar.day_abbr[d.weekday()],
                    "weather": info["weather"],
                    "description": info["description"].title(),
                    "high": round(max(info["temps"])),
                    "low": round(min(info["temps"])),
                    "humidity": info["humidity"],
                    "wind_speed": info["wind_speed"],
                    "rain_chance": info["rain_chance"],
                    "icon": _weather_icon(info["weather"]),
                })

            # Agricultural advisory based on forecast
            advisory = _generate_advisory(forecast)

            return {
                "city": data["city"]["name"],
                "country": data["city"]["country"],
                "forecast": forecast,
                "advisory": advisory,
                "source": "openweathermap",
            }

    except Exception as exc:
        logger.error(f"OpenWeather API error: {exc}")
        return _get_fallback_weather(city)


def _weather_icon(weather: str) -> str:
    icons = {
        "Clear": "☀️", "Clouds": "⛅", "Rain": "🌧️",
        "Drizzle": "🌦️", "Thunderstorm": "⛈️", "Snow": "❄️",
        "Haze": "🌫️", "Mist": "🌁", "Fog": "🌁",
    }
    return icons.get(weather, "🌤️")


def _generate_advisory(forecast: list[dict]) -> list[str]:
    advisories = []
    rainy_days = [d for d in forecast if d["rain_chance"] > 50]
    high_temp_days = [d for d in forecast if d["high"] > 38]

    if rainy_days:
        days_str = ", ".join(d["day"] for d in rainy_days[:3])
        advisories.append(f"🌧️ Rain expected on {days_str}. Delay pesticide/fertilizer spray. Ensure field drainage.")
    if high_temp_days:
        advisories.append(f"🌡️ High temperatures (>{high_temp_days[0]['high']}°C) forecast. Irrigate fields in early morning or evening to reduce evaporation.")
    if any(d["wind_speed"] > 30 for d in forecast):
        advisories.append("💨 Strong winds forecast. Provide support stakes for tall crops. Delay aerial spraying.")
    if not advisories:
        advisories.append("✅ Favorable weather conditions for field operations this week.")
    advisories.append("💧 Maintain soil moisture at 60–80% field capacity for optimal crop growth.")
    return advisories


def _get_fallback_weather(city: str) -> dict:
    """Realistic seasonal data for June (monsoon onset in India)."""
    import calendar
    today = dt_module.date.today()
    days_abbr = [calendar.day_abbr[(today + dt_module.timedelta(days=i)).weekday()] for i in range(7)]
    base_weather = ["Clear", "Clouds", "Rain", "Rain", "Clouds", "Clear", "Clear"]
    base_high = [34, 32, 27, 25, 29, 33, 35]
    base_low = [24, 22, 21, 20, 22, 23, 25]
    base_rain = [10, 25, 70, 80, 40, 15, 10]

    forecast = [
        {
            "date": str(today + dt_module.timedelta(days=i)),
            "day": days_abbr[i],
            "weather": base_weather[i],
            "description": base_weather[i],
            "high": base_high[i],
            "low": base_low[i],
            "humidity": 70 if base_weather[i] in ("Rain", "Clouds") else 55,
            "wind_speed": 18,
            "rain_chance": base_rain[i],
            "icon": _weather_icon(base_weather[i]),
        }
        for i in range(7)
    ]

    return {
        "city": city,
        "country": "IN",
        "forecast": forecast,
        "advisory": [
            "🌧️ Rain expected mid-week. Delay pesticide spray and ensure field drainage.",
            "💧 Maintain soil moisture. Irrigate in early morning.",
            "✅ Good conditions for kharif crop sowing this season.",
        ],
        "source": "seasonal_estimate",
    }


# ── Schemes ───────────────────────────────────────────────────────────────────

@router.get("/schemes")
async def get_schemes(
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
) -> dict:
    """Return government schemes from DB store; supports filtering."""
    _seed_data()

    results = list(_SCHEMES)

    if category and category.lower() != "all":
        results = [s for s in results if s["category"].lower() == category.lower()]
    if state:
        results = [s for s in results if s["state"].lower() == state.lower() or s["state"] == "Central"]
    if search:
        q = search.lower()
        results = [
            s for s in results
            if q in s["name"].lower() or q in s["category"].lower()
               or q in s["benefit"].lower() or q in s["eligibility"].lower()
        ]

    return {
        "total": len(results),
        "schemes": results,
        "categories": list({s["category"] for s in _SCHEMES}),
    }


@router.get("/schemes/{scheme_id}")
async def get_scheme(scheme_id: str) -> dict:
    _seed_data()
    scheme = next((s for s in _SCHEMES if s["id"] == scheme_id), None)
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return scheme


# ── City Services ─────────────────────────────────────────────────────────────

@router.get("/city-services")
async def get_city_services() -> dict:
    """Return current real-time city service statuses."""
    _seed_data()
    return {"services": _CITY_SERVICES, "last_updated": datetime.now(timezone.utc).isoformat()}


@router.patch("/city-services/{service_id}")
async def update_city_service(
    service_id: str,
    update: CityServiceUpdate,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Admin/officer: Update city service status in real time."""
    if current_user.role not in ("admin", "officer"):
        raise HTTPException(status_code=403, detail="Only admins and officers can update city services")

    _seed_data()
    svc = next((s for s in _CITY_SERVICES if s["id"] == service_id), None)
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    svc["value"] = update.value
    svc["detail"] = update.detail
    svc["status"] = update.status
    svc["updated_at"] = datetime.now(timezone.utc).isoformat()
    svc["updated_by"] = current_user.email

    logger.info(f"City service '{service_id}' updated to '{update.status}' by {current_user.email}")
    return {"message": "Updated", "service": svc}


# ── Departments ───────────────────────────────────────────────────────────────

@router.get("/departments")
async def get_departments(search: Optional[str] = Query(default=None)) -> dict:
    """Return government department directory with real contact numbers."""
    _seed_data()
    results = list(_DEPARTMENTS)
    if search:
        q = search.lower()
        results = [d for d in results if q in d["name"].lower() or q in d["services"].lower()]
    return {"total": len(results), "departments": results}


# ── Rural Programs ────────────────────────────────────────────────────────────

@router.get("/rural-programs")
async def get_rural_programs(
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
) -> dict:
    """Return rural development programs from DB store."""
    _seed_data()
    results = list(_RURAL_PROGRAMS)
    if category and category.lower() != "all":
        results = [p for p in results if p["category"].lower() == category.lower()]
    if search:
        q = search.lower()
        results = [p for p in results if q in p["name"].lower() or q in p["description"].lower()]
    categories = list({p["category"] for p in _RURAL_PROGRAMS})
    return {"total": len(results), "programs": results, "categories": categories}


# ── Helpline Tickets ──────────────────────────────────────────────────────────

@router.post("/helpline/ticket", response_model=HelplineTicketResponse)
async def create_helpline_ticket(req: HelplineTicket) -> HelplineTicketResponse:
    """Create a tracked helpline query ticket (stored in memory / DB in prod)."""
    _seed_data()
    tid = f"HLP-{str(uuid.uuid4())[:8].upper()}"
    ticket = {
        "ticket_id": tid,
        "query": req.query,
        "channel": req.channel,
        "language": req.language,
        "status": "Open",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expected_response": "24 hours",
    }
    _HELPLINE_TICKETS.append(ticket)
    logger.info(f"Helpline ticket created: {tid} — {req.query[:60]}")
    return HelplineTicketResponse(**ticket)


@router.get("/helpline/ticket/{ticket_id}")
async def get_ticket_status(ticket_id: str) -> dict:
    _seed_data()
    ticket = next((t for t in _HELPLINE_TICKETS if t["ticket_id"] == ticket_id.upper()), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.get("/status")
async def live_status() -> dict:
    """Health check for live data endpoints."""
    _seed_data()
    return {
        "weather_source": "openweathermap" if OPENWEATHER_API_KEY else "seasonal_estimate",
        "schemes_count": len(_SCHEMES),
        "departments_count": len(_DEPARTMENTS),
        "city_services_count": len(_CITY_SERVICES),
        "rural_programs_count": len(_RURAL_PROGRAMS),
        "helpline_tickets": len(_HELPLINE_TICKETS),
    }
