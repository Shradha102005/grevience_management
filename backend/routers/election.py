"""
Election Campaign router - AI speech generation + Twilio outreach.

Roles:
  Admin / Officer → generate speeches, launch outreach campaigns, view history
  Citizen         → view campaign history only

Gemini integration:
  If GEMINI_API_KEY is set in .env, uses google-generativeai to generate a
  polished campaign speech.  If not set (or on error), falls back to a
  well-crafted template speech - the mock flag is persisted to the DB so the
  UI can display an appropriate notice.
"""

from __future__ import annotations

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import CampaignSession, CampaignDelivery, User
from schemas import (
    SpeechGenerateRequest,
    SpeechGenerateResponse,
    CampaignOutreachRequest,
    CampaignOutreachResponse,
    CampaignDeliveryResult,
    CampaignSessionResponse,
    MessageResponse,
)
from dependencies import get_current_user
from routers.twilio_service import send_sms, make_call, is_mock as twilio_is_mock

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/election", tags=["election"])

# ── Groq setup ──────────────────────────────────────────────────────────

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
_GROQ_AVAILABLE = False
_groq_client = None

if GROQ_API_KEY:
    try:
        from groq import Groq  # type: ignore[import-untyped]  # pyrefly: ignore
        _groq_client = Groq(api_key=GROQ_API_KEY)
        _GROQ_AVAILABLE = True
        logger.info("Groq client initialised for election speech generation.")
    except Exception as exc:
        logger.warning(f"Groq initialisation failed: {exc} - running in mock mode.")
else:
    logger.info("GROQ_API_KEY not set - election speech generator in mock mode.")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_role(user: User, *roles: str) -> None:
    if user.role not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required role: {' or '.join(roles)}",
        )


AUDIENCE_LABELS = {
    "youth": "Youth voters (18–29 years)",
    "farmers": "Farming communities",
    "urban": "Urban professionals",
    "senior": "Senior citizens",
    "all_voters": "All voters",
}


def _mock_speech(req: SpeechGenerateRequest) -> str:
    """Return a polished template speech when Groq is unavailable."""
    audience_label = AUDIENCE_LABELS.get(req.audience, "fellow citizens")
    points_list = "\n".join(
        f"  • {p.strip()}" for p in req.key_points.splitlines() if p.strip()
    )
    return (
        f"Campaign Message from {req.candidate_name}:\n"
        f"Dear {audience_label},\n"
        f"I stand before you to promise a better tomorrow through **{req.theme}**.\n"
        f"Together we will achieve:\n"
        f"{points_list}\n"
        f"Vote for progress. Vote for {req.candidate_name}.\n"
        f"Jai Hind!"
    )


def _generate_speech_with_groq(req: SpeechGenerateRequest) -> str:
    """Call Groq (llama-3.3-70b-versatile) to generate a custom campaign speech."""
    audience_label = AUDIENCE_LABELS.get(req.audience, req.audience)
    prompt = (
        f"You are an expert Indian political speechwriter. Write a compelling, heartfelt, and "
        f"culturally resonant election campaign speech in English.\n\n"
        f"Candidate name: {req.candidate_name}\n"
        f"Campaign theme: {req.theme}\n"
        f"Target audience: {audience_label}\n"
        f"Key talking points (include all of these):\n{req.key_points}\n\n"
        f"Requirements:\n"
        f"- Maximum Length: STRICTLY UNDER 350 characters (around 40-50 words) so it fits in a Trial Twilio SMS limit\n"
        f"- Tone: Inspiring, confident, warm, and personal\n"
        f"- Include a powerful opening, substantive paragraphs addressing the key points, "
        f"and a strong closing call-to-action\n"
        f"- End with an appropriate patriotic closing\n"
        f"- Do NOT use the em-dash (-) or other special Unicode characters, use standard hyphens (-)\n"
        f"- Do NOT include any stage directions or formatting notes\n"
        f"- Output only the speech text, no preamble"
    )
    chat = _groq_client.chat.completions.create(  # type: ignore[union-attr]
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are an expert Indian political speechwriter."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.85,
        max_tokens=1024,
    )
    return chat.choices[0].message.content.strip()


def _build_session_response(session: CampaignSession) -> CampaignSessionResponse:
    deliveries = session.deliveries
    sms_sent = sum(1 for d in deliveries if d.sms_status in ("sent", "mock"))
    calls_made = sum(1 for d in deliveries if d.call_status in ("sent", "mock"))
    total_reached = len({d.phone_number for d in deliveries if d.sms_status in ("sent", "mock") or d.call_status in ("sent", "mock")})
    return CampaignSessionResponse(
        id=session.id,
        candidate_name=session.candidate_name,
        theme=session.theme,
        audience=session.audience,
        key_points=session.key_points,
        generated_speech=session.generated_speech,
        is_mock_ai=session.is_mock_ai,
        created_by=session.created_by,
        created_at=session.created_at,
        creator_name=session.creator.name if session.creator is not None else None,
        total_reached=total_reached,
        sms_sent=sms_sent,
        calls_made=calls_made,
    )


# ── POST /generate-speech ─────────────────────────────────────────────────────

@router.post("/generate-speech", response_model=SpeechGenerateResponse, status_code=status.HTTP_201_CREATED)
def generate_speech(
    body: SpeechGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate an AI campaign speech and save it as a new campaign session."""
    _require_role(current_user, "admin", "officer")

    is_mock_ai = True
    try:
        if _GROQ_AVAILABLE:
            speech_text = _generate_speech_with_groq(body)
            is_mock_ai = False
        else:
            speech_text = _mock_speech(body)
    except Exception as exc:
        logger.error(f"Groq speech generation failed: {exc}")
        speech_text = _mock_speech(body)
        is_mock_ai = True

    session = CampaignSession(
        candidate_name=body.candidate_name,
        theme=body.theme,
        audience=body.audience,
        key_points=body.key_points,
        generated_speech=speech_text,
        is_mock_ai=is_mock_ai,
        created_by=current_user.id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return SpeechGenerateResponse(
        session_id=session.id,
        generated_speech=session.generated_speech,
        candidate_name=session.candidate_name,
        theme=session.theme,
        audience=session.audience,
        is_mock_ai=session.is_mock_ai,
        created_at=session.created_at,
    )


# ── POST /outreach ────────────────────────────────────────────────────────────

@router.post("/outreach", response_model=CampaignOutreachResponse)
def launch_outreach(
    body: CampaignOutreachRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send campaign SMS and/or voice calls via Twilio to a list of phone numbers."""
    _require_role(current_user, "admin", "officer")

    session = db.query(CampaignSession).filter(CampaignSession.id == body.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Campaign session not found.")

    # Strip non-ASCII characters to force GSM-7 encoding (prevents 70-char segment limit & Error 30044)
    # This removes smart quotes, bullet points, and em-dashes that the AI might generate.
    safe_speech = session.generated_speech.encode('ascii', 'ignore').decode('ascii')
    
    # Twilio limits SMS messages to 1600 characters. We'll send as much as possible.
    speech_preview = safe_speech[:1450].rstrip()
    if len(safe_speech) > 1450:
        speech_preview += "..."
    
    sms_text = (
        f"Campaign Message from {session.candidate_name}:\n"
        f"{speech_preview}\n"
        f"Theme: {session.theme} | CivicSaathi Campaign Platform"
    )
    call_text = (
        f"Hello, this is a campaign message from {session.candidate_name}. "
        f"{session.generated_speech[:1450]} "
        f"Thank you for listening. Vote wisely."
    )

    results: list[CampaignDeliveryResult] = []

    for phone in body.phones:
        sms_res = send_sms(phone, sms_text) if body.send_sms else None
        call_res = make_call(phone, call_text) if body.send_call else None

        delivery = CampaignDelivery(
            session_id=session.id,
            phone_number=phone,
            sms_status=sms_res["status"] if sms_res else None,
            sms_sid=sms_res.get("sid") if sms_res else None,
            call_status=call_res["status"] if call_res else None,
            call_sid=call_res.get("sid") if call_res else None,
            delivered_at=datetime.now(timezone.utc),
        )
        db.add(delivery)

        results.append(CampaignDeliveryResult(
            phone=phone,
            sms_status=sms_res["status"] if sms_res else None,
            call_status=call_res["status"] if call_res else None,
        ))

    db.commit()

    return CampaignOutreachResponse(
        session_id=session.id,
        total_phones=len(body.phones),
        results=results,
    )


# ── GET /campaigns - list all sessions ───────────────────────────────────────

@router.get("/campaigns", response_model=List[CampaignSessionResponse])
def list_campaigns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all campaign sessions, newest first. Admin/officer see all; citizen sees summaries."""
    sessions = (
        db.query(CampaignSession)
        .order_by(CampaignSession.created_at.desc())
        .all()
    )
    return [_build_session_response(s) for s in sessions]


# ── GET /campaigns/{id} - session detail ──────────────────────────────────────

@router.get("/campaigns/{session_id}", response_model=CampaignSessionResponse)
def get_campaign(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(CampaignSession).filter(CampaignSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Campaign session not found.")
    return _build_session_response(session)


# ── GET /twilio-status ────────────────────────────────────────────────────────

@router.get("/twilio-status")
def election_twilio_status(current_user: User = Depends(get_current_user)):
    """Return Groq and Twilio configuration mode."""
    return {
        "twilio_mode": "mock" if twilio_is_mock() else "live",
        "groq_mode": "mock" if not _GROQ_AVAILABLE else "live",
    }
