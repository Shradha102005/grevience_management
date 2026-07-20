"""
voice_call.py — CivicSaathi
Conversational AI voice calls via Twilio.

Fixes applied:
  - SPEECH_TIMEOUT reduced to "1" (from 3) → faster response after user speaks
  - max_tokens reduced to 60 → faster Groq reply for phone conversations
  - Session recovery from DB → if server hot-reloads mid-call, context is
    rebuilt from the campaign's actual DB record so the AI always knows
    exactly which candidate/theme/speech it's talking about
  - System prompt is now campaign-specific, not generic
"""

from __future__ import annotations

import os
import logging
import xml.etree.ElementTree as ET
from typing import Any

from fastapi import APIRouter, Form, Query
from fastapi.responses import Response
from groq import Groq

logger = logging.getLogger(__name__)
router = APIRouter(tags=["voice"])

# ── Config ───────────────────────────────────────────────────────────────────

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
BASE_URL: str = os.getenv("TWILIO_CALL_BASE_URL", "").rstrip("/")

# In-memory session store: call_sid → {history, session_id, turns, campaign_context}
# Recovered from DB automatically if server restarts mid-call.
_sessions: dict[str, dict[str, Any]] = {}

SPEECH_TIMEOUT = "auto"  # Twilio intelligent detection — best for conversational barge-in
LANGUAGE = "en-IN"
VOICE = "Polly.Aditi"  # Indian English TTS (Amazon Polly via Twilio)


# ── TwiML builder ────────────────────────────────────────────────────────────

def _twiml_response(text: str, gather_action: str | None = None) -> str:
    """
    Build a TwiML <Response>:
      - <Gather input="speech"> wrapping <Say> so caller can barge in
      - On silence: re-prompt once, then hang up
      - No gather_action → <Say> + <Hangup>
    """
    root = ET.Element("Response")

    if gather_action:
        gather = ET.SubElement(root, "Gather", {
            "input": "speech",
            "action": gather_action,
            "method": "POST",
            "speechTimeout": SPEECH_TIMEOUT,   # "auto" = intelligent barge-in detection
            "language": LANGUAGE,
            "actionOnEmptyResult": "true",     # fire even on partial/ambiguous barge-in
            # NOTE: enhanced="true" removed — it uses a different STT pipeline
            # that doesn't support barge-in reliably
        })
        say = ET.SubElement(gather, "Say", {"voice": VOICE, "language": LANGUAGE})
        say.text = text

        # Silence fallback — re-prompt once
        fs = ET.SubElement(root, "Say", {"voice": VOICE, "language": LANGUAGE})
        fs.text = "Sorry, I could not hear you. Could you please repeat?"
        fg = ET.SubElement(root, "Gather", {
            "input": "speech",
            "action": gather_action,
            "method": "POST",
            "speechTimeout": SPEECH_TIMEOUT,
            "language": LANGUAGE,
        })
        fgs = ET.SubElement(fg, "Say", {"voice": VOICE, "language": LANGUAGE})
        fgs.text = "Go ahead, I am listening."

        hs = ET.SubElement(root, "Say", {"voice": VOICE, "language": LANGUAGE})
        hs.text = "No response received. Thank you for your time. Goodbye."
        ET.SubElement(root, "Hangup")
    else:
        say = ET.SubElement(root, "Say", {"voice": VOICE, "language": LANGUAGE})
        say.text = text
        ET.SubElement(root, "Hangup")

    return '<?xml version="1.0" encoding="UTF-8"?>' + ET.tostring(root, encoding="unicode")


def _xml(xml: str) -> Response:
    return Response(content=xml, media_type="application/xml")


# ── Session helpers ───────────────────────────────────────────────────────────

def _build_system_prompt(campaign: dict) -> str:
    """Build a campaign-specific system prompt so the AI knows who it is."""
    return (
        f"You are a friendly AI assistant making a phone call on behalf of "
        f"{campaign['candidate_name']}'s election campaign. "
        f"The campaign theme is: {campaign['theme']}. "
        f"The opening message you delivered was: {campaign['speech'][:300]}. "
        f"Answer any questions the voter has about the candidate, policies, or campaign. "
        f"Be warm, concise, and honest. Keep every reply under 35 words — this is a phone call. "
        f"If the caller wants to end the call (says bye, goodbye, not interested, etc.) "
        f"respond ONLY with: [END_CALL] followed by a brief farewell."
    )


def _recover_session_from_db(session_id: str) -> dict | None:
    """
    Attempt to rebuild a session from the DB campaign record.
    Called when the in-memory session is missing (e.g. server restarted mid-call).
    Returns a fresh session dict, or None if the DB is unavailable / record missing.
    """
    try:
        from database import SessionLocal
        from models import CampaignSession

        if SessionLocal is None:
            return None

        db = SessionLocal()
        try:
            import uuid as _uuid
            record = db.get(CampaignSession, _uuid.UUID(session_id))
            if not record:
                return None
            campaign = {
                "candidate_name": record.candidate_name,
                "theme": record.theme,
                "speech": record.generated_speech,
            }
            return {
                "session_id": session_id,
                "campaign": campaign,
                "system_prompt": _build_system_prompt(campaign),
                "history": [],
                "turns": 0,
            }
        finally:
            db.close()
    except Exception as exc:
        logger.warning("Could not recover session from DB: %s", exc)
        return None


# ── AI helper ─────────────────────────────────────────────────────────────────

def _get_ai_reply(session: dict, user_text: str) -> str:
    """Add user turn to history, call Groq, return reply text."""
    session["history"].append({"role": "user", "content": user_text})

    if not GROQ_API_KEY:
        reply = "Thank you for your question. Our candidate is fully committed to this campaign. Anything else?"
        session["history"].append({"role": "assistant", "content": reply})
        return reply

    try:
        client = Groq(api_key=GROQ_API_KEY)
        messages: list[Any] = [
            {"role": "system", "content": session["system_prompt"]}
        ] + session["history"]

        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",   # fastest Groq model
            messages=messages,               # type: ignore
            max_tokens=60,                   # ← was 120 — short = fast on a call
            temperature=0.5,
        )
        reply = (resp.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.warning("Groq voice turn failed: %s", exc)
        reply = "I am having a connectivity issue right now. Please try again later. Thank you."

    session["history"].append({"role": "assistant", "content": reply})
    return reply


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/call/start")
@router.post("/call/start")
def call_start(
    session_id: str = Query(...),
    opening_message: str = Query(default=""),
    CallSid: str = Query(default=""),
):
    """
    Twilio hits this when the call is answered.
    Initialises the session with campaign context from DB, speaks opening, listens.
    """
    try:
        call_sid = CallSid or f"dev_{session_id}"

        # Build session from DB so we have the real campaign data
        session = _recover_session_from_db(session_id)
        if session is None:
            campaign = {"candidate_name": "our candidate", "theme": "progress", "speech": opening_message}
            session = {
                "session_id": session_id,
                "campaign": campaign,
                "system_prompt": _build_system_prompt(campaign),
                "history": [],
                "turns": 0,
            }

        _sessions[call_sid] = session

        if not opening_message:
            opening_message = (
                f"Hello! This is CivicSaathi calling on behalf of "
                f"{session['campaign']['candidate_name']}'s campaign. "
                "Feel free to ask me anything about the candidate or their policies."
            )

        action_url = f"{BASE_URL}/api/voice/call/respond?session_id={session_id}"
        twiml = _twiml_response(text=opening_message, gather_action=action_url)
        logger.info("Call started: CallSid=%s session=%s candidate=%s",
                    call_sid, session_id, session["campaign"]["candidate_name"])
        return _xml(twiml)
    except Exception as exc:
        logger.error("call_start crashed: %s", exc, exc_info=True)
        return _xml(_twiml_response("We are sorry, there was a technical issue starting this call. Please try again later. Goodbye."))


@router.post("/call/respond")
async def call_respond(
    session_id: str = Query(...),
    CallSid: str = Form(default=""),
    SpeechResult: str = Form(default=""),
    Confidence: str = Form(default="0"),
):
    """
    Twilio POSTs here with STT transcript after each user turn.
    Sends transcript to Groq → returns TwiML with AI reply + next <Gather>.
    """
    try:
        call_sid = CallSid or f"dev_{session_id}"
        session = _sessions.get(call_sid)

        # ── Recover session if server restarted mid-call ──────────────────────
        if not session:
            logger.warning("Session missing for CallSid=%s — recovering from DB", call_sid)
            session = _recover_session_from_db(session_id)
            if session:
                _sessions[call_sid] = session
                logger.info("Session recovered for CallSid=%s campaign=%s",
                            call_sid, session["campaign"]["candidate_name"])
            else:
                logger.warning("DB recovery also failed — using generic session for %s", call_sid)
                campaign = {"candidate_name": "our candidate", "theme": "progress", "speech": ""}
                session = {
                    "session_id": session_id,
                    "campaign": campaign,
                    "system_prompt": _build_system_prompt(campaign),
                    "history": [],
                    "turns": 0,
                }
                _sessions[call_sid] = session

        session["turns"] += 1
        user_text = SpeechResult.strip()
        logger.info("CallSid=%s Turn=%d Conf=%s Said=%r", call_sid, session["turns"], Confidence, user_text)

        action_url = f"{BASE_URL}/api/voice/call/respond?session_id={session_id}"

        if not user_text:
            twiml = _twiml_response(
                "Sorry, I did not catch that. Could you say that again?",
                gather_action=action_url,
            )
            return _xml(twiml)

        ai_reply = _get_ai_reply(session, user_text)

        if ai_reply.startswith("[END_CALL]"):
            farewell = ai_reply.replace("[END_CALL]", "").strip() or \
                       "Thank you for your time. Have a wonderful day. Goodbye!"
            _sessions.pop(call_sid, None)
            return _xml(_twiml_response(farewell))

        return _xml(_twiml_response(text=ai_reply, gather_action=action_url))
    except Exception as exc:
        logger.error("call_respond crashed: %s", exc, exc_info=True)
        action_url = f"{BASE_URL}/api/voice/call/respond?session_id={session_id}"
        return _xml(_twiml_response(
            "Sorry, I had a momentary issue. Could you repeat what you said?",
            gather_action=action_url,
        ))


@router.get("/call/status")
def call_status_get(CallSid: str = Query(default="")):
    """Debug — see current session state for a live call."""
    session = _sessions.get(CallSid)
    if not session:
        return {"status": "not_found", "active_calls": len(_sessions)}
    return {
        "call_sid": CallSid,
        "candidate": session["campaign"]["candidate_name"],
        "theme": session["campaign"]["theme"],
        "turns": session["turns"],
        "history_turns": len(session["history"]),
    }


@router.post("/call/status")
async def call_status_post(
    CallSid: str = Form(default=""),
    CallStatus: str = Form(default=""),
    Duration: str = Form(default=""),
):
    """
    Twilio POSTs here for call lifecycle events (ringing, answered, completed, etc.).
    We use it to clean up finished sessions from memory.
    """
    terminal_statuses = {"completed", "failed", "busy", "no-answer", "canceled"}
    if CallStatus in terminal_statuses:
        removed = _sessions.pop(CallSid, None)
        logger.info(
            "Call %s ended with status=%s duration=%ss — session %s",
            CallSid, CallStatus, Duration,
            "cleaned up" if removed else "was already gone",
        )
    else:
        logger.info("Call %s status update: %s", CallSid, CallStatus)
    # Twilio ignores the response body for status callbacks — just return 200
    return {"ok": True}

