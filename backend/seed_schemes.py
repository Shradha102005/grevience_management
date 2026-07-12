"""
seed_schemes.py
---------------
One-time script to scrape ALL government schemes from myscheme.gov.in
and store them in the PostgreSQL database.

Run from the backend directory:
    python seed_schemes.py

Features:
- No timeout — runs as long as needed (~30-90 min for all ~4700 schemes)
- Resume-safe: re-running upserts existing records, no duplicates
- Saves to DB in batches of 100
"""

# ── FIRST: force UTF-8 on Windows stdout/stderr (must be before any print/logging) ──
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Windows event-loop fix is no longer needed in Python 3.8+ (Proactor is default)
import asyncio

import json
import logging
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal, init_db
from models import Scheme

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("seed_schemes")

# Path to the worker script
_WORKER = str(Path(__file__).parent / "scraper_worker.py")


def run_scraper() -> list[dict]:
    """
    Runs scraper_worker.py as a subprocess with NO timeout.
    The worker handles all pagination internally and returns a JSON array.
    """
    logger.info("🕷️  Launching scraper_worker.py (no timeout) …")
    logger.info("   This will scrape ~4700 schemes across 473 pages.")
    logger.info("   Ctrl+C is safe — already-saved schemes are preserved.\n")

    result = subprocess.run(
        [sys.executable, _WORKER],
        capture_output=True,
        # NO timeout — let it run as long as needed
        env={**__import__("os").environ, "PYTHONIOENCODING": "utf-8"},
    )

    # Print worker progress logs (safely, stripping non-ASCII)
    if result.stderr:
        for line in result.stderr.decode("utf-8", errors="replace").splitlines():
            line = line.strip()
            if line:
                logger.info("[worker] %s", line)

    if result.returncode != 0:
        logger.error("❌ scraper_worker exited with code %d", result.returncode)
        return []

    text = result.stdout.decode("utf-8", errors="replace").strip()
    if not text:
        logger.error("❌ scraper_worker produced no output")
        return []

    return json.loads(text)


def save_to_db(schemes: list[dict]) -> int:
    """
    Upsert all schemes into the database in batches of 100.
    Returns the number of rows inserted/updated.
    """
    if not schemes:
        return 0

    db = SessionLocal()
    saved = 0
    now = datetime.now(timezone.utc)

    try:
        for chunk_start in range(0, len(schemes), 100):
            chunk = schemes[chunk_start : chunk_start + 100]
            for s in chunk:
                slug = s.get("id", "").strip()
                if not slug:
                    continue

                existing = db.query(Scheme).filter(Scheme.id == slug).first()
                if existing:
                    existing.name        = s.get("name") or slug
                    existing.ministry    = s.get("ministry") or None
                    existing.description = s.get("description") or None
                    existing.tags        = s.get("tags") or []
                    existing.category    = s.get("category") or None
                    existing.apply_url   = s.get("apply_url") or None
                    existing.scraped_at  = now
                else:
                    db.add(Scheme(
                        id          = slug,
                        name        = s.get("name") or slug,
                        ministry    = s.get("ministry") or None,
                        description = s.get("description") or None,
                        tags        = s.get("tags") or [],
                        category    = s.get("category") or None,
                        apply_url   = s.get("apply_url") or None,
                        source      = s.get("source", "myscheme.gov.in"),
                        scraped_at  = now,
                    ))
                saved += 1

            db.commit()
            logger.info(
                "  💾 Saved %d / %d schemes …",
                min(chunk_start + 100, len(schemes)),
                len(schemes),
            )

    except Exception as e:
        db.rollback()
        logger.error("❌ DB save failed: %s", e, exc_info=True)
        raise
    finally:
        db.close()

    return saved


def main():
    logger.info("=" * 60)
    logger.info("  CivicSaathi — Scheme Database Seeder")
    logger.info("=" * 60)

    # Ensure the `schemes` table exists
    init_db()
    logger.info("✅ Database tables verified.")

    # Scrape everything
    schemes = run_scraper()

    if not schemes:
        logger.error("❌ No schemes scraped. Check scraper_worker.py.")
        sys.exit(1)

    logger.info("✅ Scrape complete: %d schemes collected.", len(schemes))

    # Save to DB
    logger.info("💾 Saving to database …")
    saved = save_to_db(schemes)

    logger.info("=" * 60)
    logger.info("  ✅ Done! %d schemes saved to the database.", saved)
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
