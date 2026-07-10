"""
STT Service — CIVICOS AI Helpline Voice Pipeline
Wraps faster-whisper for Indic multilingual transcription.
Falls back gracefully if faster-whisper is not installed.
"""
from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ── Whisper model load (lazy, thread-safe) ─────────────────────────────────────

_WHISPER_MODEL = None
_WHISPER_AVAILABLE = False
_WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "medium")

# Language hints for faster-whisper
LANG_CODE_MAP: dict[str, str] = {
    "en": "en",
    "hi": "hi",
    "te": "te",
    "ta": "ta",
    "kn": "kn",
    "ml": "ml",
    "mr": "mr",
    "bn": "bn",
}


def _load_whisper():
    global _WHISPER_MODEL, _WHISPER_AVAILABLE
    if _WHISPER_MODEL is not None:
        return
    try:
        from faster_whisper import WhisperModel  # type: ignore[import-untyped]
        logger.info(f"Loading faster-whisper '{_WHISPER_MODEL_SIZE}' …")
        # Use int8 quantization for CPU efficiency
        _WHISPER_MODEL = WhisperModel(
            _WHISPER_MODEL_SIZE,
            device="auto",          # GPU if available, else CPU
            compute_type="int8",    # Memory-efficient
        )
        _WHISPER_AVAILABLE = True
        logger.info(f"✅ faster-whisper '{_WHISPER_MODEL_SIZE}' loaded.")
    except ImportError:
        logger.warning("faster-whisper not installed — STT in mock mode.")
    except Exception as e:
        logger.warning(f"faster-whisper load failed: {e} — STT in mock mode.")


def transcribe(audio_bytes: bytes, language_hint: str = "hi") -> dict:
    """
    Transcribe audio bytes to text.
    Returns: {text, language, segments, is_mock, model}
    """
    _load_whisper()

    if not _WHISPER_AVAILABLE or _WHISPER_MODEL is None:
        return _mock_transcribe()

    try:
        # Write to temp file (faster-whisper needs a file path)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        whisper_lang = LANG_CODE_MAP.get(language_hint)  # None = auto-detect

        segments_iter, info = _WHISPER_MODEL.transcribe(
            tmp_path,
            language=whisper_lang,
            beam_size=5,
            vad_filter=True,                     # Remove silence
            vad_parameters={"min_silence_duration_ms": 500},
        )

        segments = list(segments_iter)
        full_text = " ".join(s.text.strip() for s in segments).strip()

        # Cleanup
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

        return {
            "text": full_text,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
            "segments": [{"start": s.start, "end": s.end, "text": s.text} for s in segments],
            "is_mock": False,
            "model": f"faster-whisper-{_WHISPER_MODEL_SIZE}",
        }

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return _mock_transcribe()


def _mock_transcribe() -> dict:
    return {
        "text": "I need help with my ration card renewal.",
        "language": "en",
        "language_probability": 1.0,
        "segments": [],
        "is_mock": True,
        "model": "mock",
    }


def get_status() -> dict:
    return {
        "available": _WHISPER_AVAILABLE,
        "model": _WHISPER_MODEL_SIZE if _WHISPER_AVAILABLE else None,
        "mode": "live" if _WHISPER_AVAILABLE else "mock",
    }
