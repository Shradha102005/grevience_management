"""
Voice Router — CivicSaathi
STT via Groq Whisper (server-side, key never exposed to browser)
TTS via edge-tts (free, no key needed) with browser speechSynthesis fallback
"""

from __future__ import annotations

import os
import logging
import tempfile
import time
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ── Groq client ───────────────────────────────────────────────────────────────
try:
    from groq import Groq  # type: ignore[import-untyped]
    _GROQ_AVAILABLE = True
except ImportError:
    Groq = None  # type: ignore[assignment,misc]
    _GROQ_AVAILABLE = False
    logger.warning("groq package not installed — STT running in mock mode")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
_MOCK_STT = not (_GROQ_AVAILABLE and GROQ_API_KEY)

if not _MOCK_STT and Groq is not None:
    _groq = Groq(api_key=GROQ_API_KEY)
    logger.info("Groq STT client initialised (live mode)")
else:
    _groq = None
    logger.info("Groq STT running in mock mode")

router = APIRouter(prefix="/voice", tags=["Voice"])

# ── Language code map (BCP-47 → Whisper prompt hint) ─────────────────────────
LANG_HINTS: dict[str, str] = {
    "en": "English",
    "hi": "हिंदी",
    "te": "తెలుగు",
    "ta": "தமிழ்",
    "kn": "ಕನ್ನಡ",
    "ml": "മലയാളം",
    "mr": "मराठी",
    "bn": "বাংলা",
}

# ── edge-tts voice map (BCP-47 → Microsoft Neural voice name) ────────────────
EDGE_TTS_VOICES: dict[str, str] = {
    "en": "en-IN-NeerjaNeural",
    "hi": "hi-IN-SwaraNeural",
    "te": "te-IN-ShrutiNeural",
    "ta": "ta-IN-PallaviNeural",
    "kn": "kn-IN-SapnaNeural",
    "ml": "ml-IN-SobhanaNeural",
    "mr": "mr-IN-AarohiNeural",
    "bn": "bn-IN-TanishaaNeural",
}

# ── STT endpoint ──────────────────────────────────────────────────────────────
@router.post("/stt", summary="Speech-to-Text via Groq Whisper")
async def speech_to_text(
    audio: UploadFile = File(..., description="Audio file (webm, wav, mp3, ogg, m4a)"),
    language: Optional[str] = Form(None, description="BCP-47 language code e.g. 'hi', 'te'"),
):
    """
    Transcribe audio using Groq Whisper large-v3-turbo.
    Returns { transcript: str, language: str, duration_ms: int }
    """
    if _MOCK_STT:
        return JSONResponse({
            "transcript": "Hello, this is a mock transcription because GROQ_API_KEY is not configured.",
            "language": language or "en",
            "duration_ms": 0,
        })

    # Read audio bytes
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    content_type = audio.content_type or "audio/webm"
    ext_map = {
        "audio/webm": "webm",
        "audio/wav": "wav",
        "audio/wave": "wav",
        "audio/ogg": "ogg",
        "audio/mpeg": "mp3",
        "audio/mp4": "m4a",
        "audio/m4a": "m4a",
        "audio/x-m4a": "m4a",
        "video/webm": "webm",
    }
    ext = ext_map.get(content_type, "webm")

    t0 = time.time()
    tmp_path: str = ""
    try:
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        prompt_hint = LANG_HINTS.get(language or "en", "")

        with open(tmp_path, "rb") as f:
            transcription = _groq.audio.transcriptions.create(
                file=(f"audio.{ext}", f, content_type),
                model="whisper-large-v3-turbo",
                language=language if language != "en" else None,
                prompt=prompt_hint,
                response_format="json",
            )

        duration_ms = int((time.time() - t0) * 1000)

        return JSONResponse({
            "transcript": transcription.text.strip(),
            "language": language or "en",
            "duration_ms": duration_ms,
        })

    except Exception as e:
        logger.error(f"STT error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


# ── TTS request schema ────────────────────────────────────────────────────────
class TTSRequest(BaseModel):
    text: str
    language: str = "en"


# ── TTS endpoint ──────────────────────────────────────────────────────────────
@router.post("/tts", summary="Text-to-Speech via edge-tts")
async def text_to_speech(req: TTSRequest):
    """
    Convert text to speech using edge-tts (Microsoft Neural voices, no API key needed).
    Returns audio/mpeg on success.
    Falls back to { fallback: true, text } JSON if edge-tts is missing or fails —
    the frontend speakText() will then use browser speechSynthesis automatically.
    """
    try:
        import edge_tts  # type: ignore[import-untyped]
    except ImportError:
        logger.warning("TTS: edge-tts package not installed — returning fallback JSON")
        return JSONResponse({"fallback": True, "text": req.text})

    voice = EDGE_TTS_VOICES.get(req.language, EDGE_TTS_VOICES["en"])
    text  = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text must not be empty")

    try:
        communicate = edge_tts.Communicate(text, voice)

        # Collect all audio chunks into memory then stream back
        audio_chunks: list[bytes] = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])

        if not audio_chunks:
            raise RuntimeError("edge-tts returned no audio data")

        audio_bytes = b"".join(audio_chunks)
        logger.info(
            f"TTS success: voice={voice} lang={req.language} "
            f"chars={len(text)} bytes={len(audio_bytes)}"
        )

        return StreamingResponse(
            iter([audio_bytes]),
            media_type="audio/mpeg",
            headers={"Content-Length": str(len(audio_bytes))},
        )

    except Exception as exc:
        logger.error(f"TTS error: voice={voice} lang={req.language} error={exc}")
        return JSONResponse({"fallback": True, "text": req.text})
