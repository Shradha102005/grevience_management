"""
Voice Router — CivicSaathi
STT  → Sarvam AI  saaras:v3   (best-in-class Indian language speech recognition)
TTS  → Sarvam AI  bulbul:v3   (natural Indian neural voices, 10 languages)
Falls back to mock responses if SARVAMAI key is not configured.
"""

from __future__ import annotations

import os
import logging
import base64
import time
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ── Sarvam AI config ──────────────────────────────────────────────────────────
SARVAM_API_KEY = os.getenv("SARVAMAI", "")
SARVAM_BASE    = "https://api.sarvam.ai"
_MOCK_VOICE    = not bool(SARVAM_API_KEY)

if _MOCK_VOICE:
    logger.warning("SARVAMAI key not set — voice running in mock mode")
else:
    logger.info("Sarvam AI voice client ready (STT: saaras:v3 / TTS: bulbul:v3)")

router = APIRouter(prefix="/voice", tags=["Voice"])

# ── Language maps ─────────────────────────────────────────────────────────────
# Sarvam language codes (BCP-47 short → Sarvam full)
SARVAM_LANG_MAP: dict[str, str] = {
    "en": "en-IN",
    "hi": "hi-IN",
    "te": "te-IN",
    "ta": "ta-IN",
    "kn": "kn-IN",
    "ml": "ml-IN",
    "mr": "mr-IN",
    "bn": "bn-IN",
    "gu": "gu-IN",
    "pa": "pa-IN",
}

# Sarvam TTS speaker map — bulbul:v3 valid speakers:
# aditya, ritu, ashutosh, priya, neha, rahul, pooja, rohan, simran, kavya,
# amit, dev, ishita, shreya, ratan, varun, manan, sumit, roopa, kabir, aayan,
# shubh, advait, anand, tanya, tarun, sunny, mani, gokul, vijay, shruti,
# suhani, mohit, kavitha, rehan, soham, rupali, niharika
SARVAM_SPEAKER_MAP: dict[str, str] = {
    "en": "priya",   # female English voice
    "hi": "priya",   # female Hindi voice
    "te": "priya",
    "ta": "priya",
    "kn": "priya",
    "ml": "priya",
    "mr": "priya",
    "bn": "priya",
    "gu": "priya",
    "pa": "priya",
}


# ── STT endpoint ──────────────────────────────────────────────────────────────
@router.post("/stt", summary="Speech-to-Text via Sarvam AI (saaras:v3)")
async def speech_to_text(
    audio: UploadFile = File(..., description="Audio file (webm, wav, mp3, ogg, m4a)"),
    language: Optional[str] = Form(None, description="BCP-47 language code e.g. 'hi', 'te'"),
):
    """
    Transcribe audio using Sarvam AI saaras:v3 — optimised for 10+ Indian languages.
    Returns { transcript: str, language: str, duration_ms: int }
    """
    if _MOCK_VOICE:
        return JSONResponse({
            "transcript": "यह एक मॉक ट्रांसक्रिप्शन है। SARVAMAI API key कॉन्फ़िगर नहीं है।",
            "language": language or "en",
            "duration_ms": 0,
        })

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Determine extension for the mime type
    content_type = audio.content_type or "audio/webm"
    ext_map = {
        "audio/webm": ("webm", "audio/webm"),
        "video/webm": ("webm", "audio/webm"),
        "audio/wav":  ("wav",  "audio/wav"),
        "audio/wave": ("wav",  "audio/wav"),
        "audio/ogg":  ("ogg",  "audio/ogg"),
        "audio/mpeg": ("mp3",  "audio/mpeg"),
        "audio/mp4":  ("m4a",  "audio/mp4"),
        "audio/m4a":  ("m4a",  "audio/mp4"),
        "audio/x-m4a":("m4a",  "audio/mp4"),
    }
    ext, mime = ext_map.get(content_type, ("webm", "audio/webm"))
    lang_code = SARVAM_LANG_MAP.get(language or "en", "en-IN")

    t0 = time.time()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{SARVAM_BASE}/speech-to-text",
                headers={"api-subscription-key": SARVAM_API_KEY},
                files={"file": (f"audio.{ext}", audio_bytes, mime)},
                data={
                    "model": "saaras:v3",
                    "language_code": lang_code,
                    "with_timestamps": "false",
                    "with_disfluencies": "false",
                },
            )
        duration_ms = int((time.time() - t0) * 1000)

        if resp.status_code != 200:
            logger.error(f"Sarvam STT error {resp.status_code}: {resp.text[:300]}")
            raise HTTPException(status_code=502, detail=f"Sarvam STT failed: {resp.status_code}")

        data = resp.json()
        # Sarvam returns { transcript: str } or { transcripts: [{ transcript }] }
        transcript = (
            data.get("transcript")
            or (data.get("transcripts", [{}])[0].get("transcript", ""))
            or ""
        ).strip()

        logger.info(f"STT ok: lang={lang_code} chars={len(transcript)} ms={duration_ms}")
        return JSONResponse({
            "transcript": transcript,
            "language": language or "en",
            "duration_ms": duration_ms,
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"STT exception: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


# ── TTS request schema ────────────────────────────────────────────────────────
class TTSRequest(BaseModel):
    text: str
    language: str = "en"
    speaker: Optional[str] = None  # override default speaker


# ── TTS endpoint ──────────────────────────────────────────────────────────────
@router.post("/tts", summary="Text-to-Speech via Sarvam AI (bulbul:v3)")
async def text_to_speech(req: TTSRequest):
    """
    Convert text to speech using Sarvam AI bulbul:v3.
    Returns audio/wav on success, or { fallback: true, text } JSON if unavailable.
    The frontend plays the audio blob directly, falling back to browser speechSynthesis.
    """
    if _MOCK_VOICE:
        return JSONResponse({"fallback": True, "text": req.text})

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text must not be empty")

    # Truncate to Sarvam's 500-char limit per request
    if len(text) > 500:
        text = text[:497] + "…"

    lang_code = SARVAM_LANG_MAP.get(req.language, "en-IN")
    speaker   = req.speaker or SARVAM_SPEAKER_MAP.get(req.language, "meera")

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{SARVAM_BASE}/text-to-speech",
                headers={
                    "api-subscription-key": SARVAM_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "inputs": [text],
                    "target_language_code": lang_code,
                    "speaker": speaker,
                    "model": "bulbul:v3",
                    "pace": 1.0,
                    "enable_preprocessing": True,
                },
            )

        if resp.status_code != 200:
            logger.error(f"Sarvam TTS error {resp.status_code}: {resp.text[:300]}")
            return JSONResponse({"fallback": True, "text": req.text})

        data = resp.json()
        # Sarvam returns { audios: ["<base64-wav>", ...] }
        audios = data.get("audios") or []
        if not audios:
            logger.warning("Sarvam TTS returned empty audios array")
            return JSONResponse({"fallback": True, "text": req.text})

        audio_b64 = audios[0]
        audio_bytes = base64.b64decode(audio_b64)

        logger.info(
            f"TTS ok: speaker={speaker} lang={lang_code} "
            f"chars={len(text)} bytes={len(audio_bytes)}"
        )
        return StreamingResponse(
            iter([audio_bytes]),
            media_type="audio/wav",
            headers={"Content-Length": str(len(audio_bytes))},
        )

    except Exception as exc:
        logger.error(f"TTS exception: {exc}")
        return JSONResponse({"fallback": True, "text": req.text})


# ── Voices list endpoint ───────────────────────────────────────────────────────
@router.get("/voices", summary="List available Sarvam TTS voices")
async def list_voices():
    """Return the available speaker voices for bulbul:v3."""
    return {
        "model": "bulbul:v3",
        "voices": [
            {"speaker": "priya",   "gender": "female", "style": "warm"},
            {"speaker": "neha",    "gender": "female", "style": "clear"},
            {"speaker": "ritu",    "gender": "female", "style": "natural"},
            {"speaker": "ishita",  "gender": "female", "style": "expressive"},
            {"speaker": "shreya",  "gender": "female", "style": "professional"},
            {"speaker": "simran",  "gender": "female", "style": "friendly"},
            {"speaker": "pooja",   "gender": "female", "style": "calm"},
            {"speaker": "kavya",   "gender": "female", "style": "youthful"},
            {"speaker": "rahul",   "gender": "male",   "style": "professional"},
            {"speaker": "aditya",  "gender": "male",   "style": "friendly"},
            {"speaker": "rohan",   "gender": "male",   "style": "energetic"},
            {"speaker": "amit",    "gender": "male",   "style": "warm"},
        ],
    }
