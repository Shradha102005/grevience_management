"""
scheme_scraper.py
-----------------
Scrapes myscheme.gov.in/schemes using Playwright (headless Chromium).

On Windows, asyncio's SelectorEventLoop (used by Uvicorn) cannot spawn
subprocesses, so Playwright is run inside a *separate Python process*
(scraper_worker.py) via asyncio.create_subprocess_exec with the
ProactorEventLoop-compatible subprocess API.

All scraped data is stored in-memory in _CACHE.
The scrape runs once at startup and refreshes every 24 hours.
"""

from __future__ import annotations

import asyncio
import json
import logging
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ── In-memory cache ────────────────────────────────────────────────────────────

_CACHE: list[dict[str, Any]] = []
_LAST_SCRAPED: datetime | None = None
_SCRAPE_INTERVAL_HOURS = 24
_SCRAPING_LOCK = asyncio.Lock()
_IS_SCRAPING = False

# Path to the standalone worker script (same directory as this file)
_WORKER_SCRIPT = str(Path(__file__).parent.parent / "scraper_worker.py")


def get_cached_schemes() -> list[dict[str, Any]]:
    """Return the in-memory scheme cache."""
    return _CACHE


def get_scrape_status() -> dict:
    return {
        "total": len(_CACHE),
        "last_scraped": _LAST_SCRAPED.isoformat() if _LAST_SCRAPED else None,
        "is_scraping": _IS_SCRAPING,
        "source": "myscheme.gov.in" if _CACHE else "fallback",
    }


def is_cache_stale() -> bool:
    if not _LAST_SCRAPED:
        return True
    return datetime.now(timezone.utc) - _LAST_SCRAPED > timedelta(hours=_SCRAPE_INTERVAL_HOURS)


async def scrape_myscheme() -> list[dict[str, Any]]:
    """
    Launch scraper_worker.py as a *synchronous* subprocess via asyncio.to_thread.

    Using subprocess.run (sync) inside a thread avoids the SelectorEventLoop
    restriction on Windows — asyncio.create_subprocess_exec needs ProactorEventLoop,
    but plain subprocess.run works on any loop.
    Returns a list of scheme dicts.
    """
    global _IS_SCRAPING
    _IS_SCRAPING = True
    schemes: list[dict[str, Any]] = []

    def _run_worker() -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, _WORKER_SCRIPT],
            capture_output=True,
            timeout=300,  # 5-minute hard limit
        )

    try:
        logger.info("🕷️  Launching scraper_worker subprocess …")

        result: subprocess.CompletedProcess = await asyncio.to_thread(_run_worker)

        # Relay worker stderr → our logger so you see Playwright progress
        if result.stderr:
            for line in result.stderr.decode(errors="replace").splitlines():
                if line.strip():
                    logger.info("[worker] %s", line)

        if result.returncode == 0:
            text = result.stdout.decode(errors="replace").strip()
            schemes = json.loads(text) if text else []
            logger.info("✅ Worker finished — %d schemes collected.", len(schemes))
        else:
            logger.error("❌ scraper_worker exited with code %d", result.returncode)

    except FileNotFoundError:
        logger.error("❌ scraper_worker.py not found at: %s", _WORKER_SCRIPT)
    except subprocess.TimeoutExpired:
        logger.error("❌ scraper_worker timed out after 5 minutes.")
    except Exception as e:
        logger.error("❌ Scraper subprocess error: %s", e, exc_info=True)
    finally:
        _IS_SCRAPING = False

    return schemes


async def refresh_cache() -> None:
    """
    Scrape myscheme.gov.in and update the in-memory cache.
    Holds a lock so only one scrape runs at a time.
    """
    global _CACHE, _LAST_SCRAPED

    async with _SCRAPING_LOCK:
        if not is_cache_stale() and _CACHE:
            logger.info("Scheme cache is fresh — skipping scrape.")
            return

        scraped = await scrape_myscheme()

        if scraped:
            _CACHE = scraped
            _LAST_SCRAPED = datetime.now(timezone.utc)
            logger.info("Cache updated: %d schemes at %s", len(_CACHE), _LAST_SCRAPED)
        else:
            logger.warning("Scrape returned 0 schemes — keeping existing cache / fallback.")


async def background_scrape_loop() -> None:
    """
    Long-running background coroutine:
    scrapes immediately at startup, then re-scrapes every 24 hours.
    """
    logger.info("📡 Scheme scraper background loop started.")
    while True:
        try:
            await refresh_cache()
        except Exception as e:
            logger.error("Background scrape loop error: %s", e, exc_info=True)

        logger.info("💤 Next scrape in %dh", _SCRAPE_INTERVAL_HOURS)
        await asyncio.sleep(_SCRAPE_INTERVAL_HOURS * 3600)
