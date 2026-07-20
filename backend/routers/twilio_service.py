"""
Twilio SMS & Voice Call service with graceful mock fallback.

If TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER are not set
in the environment, all calls succeed silently in "mock" mode - the UI still
works and delivery rows are recorded with status="mock".
"""

import os
import logging

logger = logging.getLogger(__name__)

# ── Top-level import (works with all linters/type-checkers) ──────────────────
try:
    from twilio.rest import Client as TwilioClient          # type: ignore[import-untyped]  # pyrefly: ignore
    from twilio.base.exceptions import TwilioRestException  # type: ignore[import-untyped]  # pyrefly: ignore
    _TWILIO_AVAILABLE = True
except ImportError:
    TwilioClient = None         # type: ignore[assignment,misc]
    TwilioRestException = None  # type: ignore[assignment,misc]
    _TWILIO_AVAILABLE = False
    logger.warning("twilio package not installed - running in mock mode")

# ── Read credentials ─────────────────────────────────────────────────────────
ACCOUNT_SID  = os.getenv("TWILIO_ACCOUNT_SID", "")  # pyrefly: ignore
AUTH_TOKEN   = os.getenv("TWILIO_AUTH_TOKEN", "")  # pyrefly: ignore
FROM_NUMBER  = os.getenv("TWILIO_FROM_NUMBER", "")  # pyrefly: ignore

_MOCK_MODE = not (_TWILIO_AVAILABLE and ACCOUNT_SID and AUTH_TOKEN and FROM_NUMBER)  # pyrefly: ignore

# ── Initialise client ────────────────────────────────────────────────────────
if not _MOCK_MODE and TwilioClient is not None:  # pyrefly: ignore
    try:
        _twilio = TwilioClient(ACCOUNT_SID, AUTH_TOKEN)
        logger.info("Twilio client initialised (live mode)")
    except Exception as exc:
        _twilio = None
        _MOCK_MODE = True
        logger.error(f"Failed to initialise Twilio client: {exc}")
else:
    _twilio = None
    if not _MOCK_MODE:
        logger.info("Twilio credentials not set - running in mock mode")


def is_mock() -> bool:
    """Return True when Twilio is not configured (mock mode)."""
    return _MOCK_MODE


def send_sms(to: str, message: str) -> dict:
    """
    Send an SMS via Twilio. Returns a dict with:
      { "sid": str | None, "status": "sent" | "mock" | "failed", "error": str | None }
    """
    if _MOCK_MODE:
        logger.info(f"[MOCK SMS] To: {to} | Msg: {message[:60]}...")
        return {"sid": None, "status": "mock", "error": None}

    # Force GSM-7 encoding by stripping non-ASCII characters (e.g. smart quotes, bullet points, em-dashes).
    # If Unicode characters are sent, Twilio switches to UCS-2 encoding which reduces the segment limit from 160 to 70 chars.
    # This leads to a massive segment bloat, causing Trial accounts to fail with Error 30044.
    safe_message = message.encode('ascii', 'ignore').decode('ascii')

    try:
        msg = _twilio.messages.create(  # type: ignore[union-attr]
            body=safe_message,
            from_=FROM_NUMBER,
            to=to,
        )
        logger.info(f"SMS sent to {to} - SID: {msg.sid}")
        return {"sid": msg.sid, "status": "sent", "error": None}
    except Exception as exc:
        logger.error(f"SMS failed to {to}: {exc}")
        return {"sid": None, "status": "failed", "error": str(exc)}


def make_call(to: str, message: str) -> dict:
    """
    Initiate a voice call via Twilio with a TwiML read-back message. Returns:
      { "sid": str | None, "status": "sent" | "mock" | "failed", "error": str | None }
    """
    if _MOCK_MODE:
        logger.info(f"[MOCK CALL] To: {to} | Msg: {message[:60]}...")
        return {"sid": None, "status": "mock", "error": None}

    twiml = (
        "<Response>"
        f"<Say voice='alice' language='en-IN'>{message}</Say>"
        "<Pause length='1'/>"
        f"<Say voice='alice' language='en-IN'>{message}</Say>"
        "</Response>"
    )

    try:
        call = _twilio.calls.create(  # type: ignore[union-attr]
            twiml=twiml,
            from_=FROM_NUMBER,
            to=to,
        )
        logger.info(f"Call initiated to {to} - SID: {call.sid}")
        return {"sid": call.sid, "status": "sent", "error": None}
    except Exception as exc:
        logger.error(f"Call failed to {to}: {exc}")
        return {"sid": None, "status": "failed", "error": str(exc)}



BASE_URL: str = os.getenv("TWILIO_CALL_BASE_URL", "").rstrip("/")


def make_conversational_call(to: str, session_id: str, opening_message: str) -> dict:
    """
    Start an interactive AI voice call.

    Instead of reading a static script and hanging up, Twilio will call back
    your webhook (voice_call.py) at each turn, enabling a real STT → Groq AI
    → TTS conversation loop.

    Returns:
      { "sid": str | None, "status": "sent" | "mock" | "failed", "error": str | None }
    """
    if _MOCK_MODE:
        logger.info("[MOCK CONV CALL] To: %s | session: %s", to, session_id)
        return {"sid": None, "status": "mock", "error": None}

    if not BASE_URL:
        logger.warning("TWILIO_CALL_BASE_URL not set — falling back to static call")
        return make_call(to, opening_message)

    import urllib.parse
    params = urllib.parse.urlencode({
        "session_id": session_id,
        "opening_message": opening_message,
    })
    start_url = f"{BASE_URL}/api/voice/call/start?{params}"
    status_url = f"{BASE_URL}/api/voice/call/status"

    try:
        call = _twilio.calls.create(  # type: ignore[union-attr]
            url=start_url,             # Twilio GETs this when call is answered
            status_callback=status_url,
            from_=FROM_NUMBER,
            to=to,
            method="GET",
        )
        logger.info("Conversational call initiated to %s — SID: %s", to, call.sid)
        return {"sid": call.sid, "status": "sent", "error": None}
    except Exception as exc:
        logger.error("Conversational call failed to %s: %s", to, exc)
        return {"sid": None, "status": "failed", "error": str(exc)}


def broadcast_alert(

    alert_title: str,
    alert_description: str,
    severity: str,
    recipients: list[dict],  # [{"phone": str, "do_sms": bool, "do_call": bool}]
) -> list[dict]:
    """
    Send SMS and/or calls to a list of recipients.

    Returns a list of result dicts matching recipient order:
      [{"phone": str, "sms": result_dict, "call": result_dict | None}]
    """
    sms_message = (
        f"ALERT [{severity.upper()}] - {alert_title}\n"
        f"{alert_description}\n"
        "Issued by: CivicSaathi Emergency Services. Stay safe and follow official instructions."
    )
    call_message = (
        f"This is an emergency alert from CivicSaathi. {severity} severity. "
        f"{alert_title}. {alert_description}. "
        "Please follow instructions from official authorities and move to safety immediately."
    )

    results = []
    for r in recipients:
        phone = r.get("phone", "")
        sms_result  = send_sms(phone, sms_message)   if r.get("do_sms")  else None
        call_result = make_call(phone, call_message)  if r.get("do_call") else None
        results.append({"phone": phone, "sms": sms_result, "call": call_result})

    return results
