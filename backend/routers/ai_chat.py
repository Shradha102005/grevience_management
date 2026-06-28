"""
AI Chat Router — CIVICOS AI
Serves all 6 bot modules via a single Groq-powered endpoint.
Modules: scheme, helpline, smart-city, rural, agriculture, voice
"""

from __future__ import annotations

import os
import base64
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ── Groq client (graceful mock fallback) ──────────────────────────────────────
try:
    from groq import Groq  # type: ignore[import-untyped]
    _GROQ_AVAILABLE = True
except ImportError:
    Groq = None  # type: ignore[assignment,misc]
    _GROQ_AVAILABLE = False
    logger.warning("groq package not installed — AI running in mock mode")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
_MOCK_AI = not (_GROQ_AVAILABLE and GROQ_API_KEY)

if not _MOCK_AI and Groq is not None:
    _groq = Groq(api_key=GROQ_API_KEY)
    logger.info("Groq AI client initialised (live mode)")
else:
    _groq = None
    logger.info("Groq AI running in mock mode")

router = APIRouter(prefix="/ai", tags=["AI Chat"])

# ── Language map ──────────────────────────────────────────────────────────────
LANGUAGE_MAP: dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "te": "Telugu",
    "ta": "Tamil",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "bn": "Bengali",
}

# ── Module system prompts ─────────────────────────────────────────────────────
MODULE_PROMPTS: dict[str, str] = {
    "scheme": (
        "You are a Government Scheme Awareness Assistant for India. "
        "Help citizens discover and understand central and state government welfare schemes. "
        "Cover PM-KISAN, Ayushman Bharat, PM Awas Yojana, MGNREGA, Kisan Credit Card, "
        "PM Fasal Bima, National Scholarships, PM Ujjwala, Sukanya Samriddhi, and similar schemes. "
        "When asked, check eligibility based on the user's age, income, occupation, state, and family size. "
        "Explain how to apply, required documents, and expected benefits. "
        "Always be accurate about Indian government schemes and policies. "
        "If unsure about specific amounts, mention the official portal (myscheme.gov.in). "
        "Keep responses concise, friendly, and helpful."
    ),
    "helpline": (
        "You are a Public Information Helpline Assistant for Indian government services. "
        "Answer questions about government procedures, documentation, certificates, and services. "
        "Cover areas like: birth/death certificates, ration cards, driving licenses, passports, "
        "property tax, water/electricity bills, pension, PAN/Aadhaar, voter ID, and more. "
        "Provide accurate department contact info and process steps. "
        "Route users to the right department. Generate a query tracking reference when asked. "
        "Be patient, clear, and accessible to all citizen types."
    ),
    "smart-city": (
        "You are a Smart City Citizen Assistant. "
        "Help citizens with city services including traffic updates, water supply, power outages, "
        "public transport schedules, parking, waste management, and civic complaints. "
        "Provide real-time guidance on city infrastructure. "
        "Help register and track service complaints. "
        "Give updates on city development projects and citizen notifications. "
        "Be concise and service-oriented."
    ),
    "rural": (
        "You are a Rural Development Information Assistant for Indian villages. "
        "Help rural citizens understand programs like MGNREGA (work days, wages, rights), "
        "PMGSY (road connectivity), PM Awas Gramin (housing), Jal Jeevan Mission (drinking water), "
        "PMJDY (banking), PM SVANidhi, SHG (self-help group) loans, skill development programs, "
        "and village panchayat services. "
        "Use simple, clear language. Explain processes step by step. "
        "Mention required documents and where to apply (Block office, Gram Panchayat, CSC centre). "
        "Be especially supportive to first-time users of government services."
    ),
    "agriculture": (
        "You are an Agriculture Advisory Assistant for Indian farmers. "
        "Provide expert guidance on: crop selection by season and soil type, fertilizer and pesticide use, "
        "irrigation scheduling, pest and disease identification and treatment, weather-based farming decisions, "
        "soil health management, organic farming, market prices (MSP), and agricultural government schemes "
        "(PM-KISAN, PM Fasal Bima, Kisan Credit Card, soil health card). "
        "When a farmer describes crop symptoms, diagnose the likely disease or deficiency and recommend treatment. "
        "Be practical and use local crop names where possible. "
        "Mention when to consult the local Krishi Vigyan Kendra."
    ),
    "voice": (
        "You are the CIVICOS AI Digital Governance Voice Interface — a unified assistant for all citizen services. "
        "You can navigate between modules: scheme discovery, grievance filing, helpline queries, "
        "city services, rural development, agriculture advisory, disaster alerts, and election info. "
        "Understand natural language commands like 'register a complaint about road damage', "
        "'find farming schemes for me', 'check my grievance status', 'what schemes am I eligible for'. "
        "Provide direct answers or guide the user to the right section of the app. "
        "Be conversational, efficient, and handle multi-step requests. "
        "When a user asks to navigate, provide the path and a summary of what they'll find there."
    ),
}

MOCK_RESPONSES: dict[str, str] = {
    "scheme": "Based on your profile, you may be eligible for PM-KISAN (₹6,000/year), Ayushman Bharat (₹5 lakh health cover), and Kisan Credit Card. Visit myscheme.gov.in to check full eligibility and apply.",
    "helpline": "I can help you with government services. For a birth certificate, visit your Municipal Corporation office with hospital discharge summary and parents' ID proof. The process takes 7-10 working days.",
    "smart-city": "Current city update: Traffic is moderate on Ring Road. Water supply is normal across all zones. Power outage in Ward 7 — estimated restoration in 2 hours. Bus routes are running on schedule.",
    "rural": "MGNREGA guarantees 100 days of employment per year at ₹309/day (varies by state). Register at your Gram Panchayat with your job card. Payment comes directly to your bank account within 15 days of work.",
    "agriculture": "Based on your description, this looks like bacterial leaf blight. Apply copper-based bactericide every 7 days for 3 weeks. Remove and destroy infected leaves. Avoid overhead irrigation. Check for PM Fasal Bima coverage.",
    "voice": "I understood your request. I can help you navigate to the right service, file complaints, check scheme eligibility, or get government information — all by voice. What would you like to do?",
}

# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    module: str
    message: str
    language: str = "en"
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    is_mock: bool


class TranslateRequest(BaseModel):
    text: str
    target_language: str  # e.g. "hi", "te"


class TranslateResponse(BaseModel):
    translated: str
    is_mock: bool


class AgricultureAnalysisResponse(BaseModel):
    diagnosis: str
    confidence: int
    treatment: list[str]
    schemes: list[str]
    is_mock: bool


# ── Helpers ───────────────────────────────────────────────────────────────────

def _call_groq(messages: list[dict[str, str]], max_tokens: int = 512) -> str:
    """Call Groq API and return the assistant reply string."""
    if _MOCK_AI or _groq is None:
        raise RuntimeError("Mock mode")
    resp = _groq.chat.completions.create(  # pyrefly: ignore
        model="llama-3.1-8b-instant",
        messages=messages,  # type: ignore[arg-type]
        max_tokens=max_tokens,
        temperature=0.7,
    )
    return resp.choices[0].message.content or ""


def _build_language_instruction(lang_code: str) -> str:
    lang_name = LANGUAGE_MAP.get(lang_code, "English")
    if lang_code == "en":
        return ""
    return f"\n\nIMPORTANT: The user has selected {lang_name} as their preferred language. Respond ENTIRELY in {lang_name} script and language. Do not mix languages."


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    """Universal chat endpoint for all 6 AI bot modules."""
    module = req.module.lower()
    if module not in MODULE_PROMPTS:
        raise HTTPException(status_code=400, detail=f"Unknown module: {module}")

    system_prompt = MODULE_PROMPTS[module] + _build_language_instruction(req.language)

    if _MOCK_AI:
        mock_reply = MOCK_RESPONSES.get(module, "I'm here to help! (AI running in mock mode)")
        return ChatResponse(reply=mock_reply, is_mock=True)

    try:
        messages: list[dict] = [{"role": "system", "content": system_prompt}]
        # Add conversation history (last 10 turns max)
        for h in req.history[-10:]:
            messages.append({"role": h.role, "content": h.content})
        messages.append({"role": "user", "content": req.message})

        reply = _call_groq(messages)
        return ChatResponse(reply=reply, is_mock=False)

    except Exception as exc:
        logger.error(f"Groq chat error (module={module}): {exc}")
        mock_reply = MOCK_RESPONSES.get(module, "I'm having trouble connecting. Please try again.")
        return ChatResponse(reply=mock_reply, is_mock=True)


@router.post("/translate", response_model=TranslateResponse)
async def translate(req: TranslateRequest) -> TranslateResponse:
    """Translate text to the target language using Groq."""
    lang_name = LANGUAGE_MAP.get(req.target_language, "English")
    if req.target_language == "en":
        return TranslateResponse(translated=req.text, is_mock=False)

    if _MOCK_AI:
        return TranslateResponse(translated=req.text + f" [{lang_name}]", is_mock=True)

    try:
        messages = [
            {
                "role": "system",
                "content": f"You are a professional translator. Translate the following text to {lang_name}. Output ONLY the translated text, nothing else.",
            },
            {"role": "user", "content": req.text},
        ]
        translated = _call_groq(messages, max_tokens=256)
        return TranslateResponse(translated=translated, is_mock=False)
    except Exception as exc:
        logger.error(f"Groq translate error: {exc}")
        return TranslateResponse(translated=req.text, is_mock=True)


@router.post("/agriculture/analyze", response_model=AgricultureAnalysisResponse)
async def agriculture_analyze(
    image: UploadFile = File(...),
    description: str = Form(default=""),
    language: str = Form(default="en"),
) -> AgricultureAnalysisResponse:
    """Analyze crop symptoms and return AI disease/pest diagnosis."""
    import json, re

    mock_result = AgricultureAnalysisResponse(
        diagnosis="Bacterial Leaf Blight",
        confidence=87,
        treatment=[
            "Apply copper-based bactericide (e.g., Blitox) every 7 days for 3 weeks",
            "Remove and destroy all infected leaves immediately",
            "Avoid overhead irrigation — switch to drip irrigation",
            "Apply nitrogen fertilizer cautiously — excess worsens blight",
        ],
        schemes=[
            "PM Fasal Bima Yojana — claim crop loss insurance",
            "Rashtriya Krishi Vikas Yojana — technical assistance available",
            "Kisan Call Centre — dial 1800-180-1551 for expert advice",
        ],
        is_mock=True,
    )

    if _MOCK_AI or _groq is None:
        return mock_result

    symptom = description.strip() or "general crop disease symptoms"
    lang_instruction = _build_language_instruction(language)

    system_prompt = (
        "You are an expert Indian agricultural scientist. "
        "Based on the farmer's crop symptom description, respond ONLY with a valid JSON object "
        "in this exact format (no markdown, no extra text):\n"
        '{"diagnosis": "<disease or condition name>", "confidence": <integer 60-99>, '
        '"treatment": ["<step 1>", "<step 2>", "<step 3>", "<step 4>"], '
        '"schemes": ["<scheme 1>", "<scheme 2>", "<scheme 3>"]}'
        + lang_instruction
    )

    user_msg = (
        f"A farmer reports the following crop symptoms: {symptom}. "
        "Diagnose the most likely disease or deficiency, give a confidence percentage, "
        "4 specific treatment steps, and 3 relevant Indian government schemes."
    )

    try:
        resp = _groq.chat.completions.create(  # pyrefly: ignore
            model="llama-3.1-8b-instant",
            messages=[  # type: ignore[arg-type]
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=700,
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        raw = (resp.choices[0].message.content or "").strip()

        # Primary parse
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            # Fallback: extract first {...} block from response
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            data = json.loads(match.group()) if match else {}

        return AgricultureAnalysisResponse(
            diagnosis=str(data.get("diagnosis", "Unknown condition")),
            confidence=int(data.get("confidence", 80)),
            treatment=list(data.get("treatment", [])),
            schemes=list(data.get("schemes", [])),
            is_mock=False,
        )

    except Exception as exc:
        logger.error(f"Agriculture analyze error: {exc}")
        return mock_result



@router.get("/status")
def ai_status() -> dict:
    """Return current AI mode (live or mock)."""
    return {
        "mode": "mock" if _MOCK_AI else "live",
        "model": "llama-3.1-8b-instant" if not _MOCK_AI else None,
        "supported_modules": list(MODULE_PROMPTS.keys()),
        "supported_languages": LANGUAGE_MAP,
    }
