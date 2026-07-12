"""
database.py — CivicSaathi
Lazy SQLAlchemy engine: the connection is only attempted when a request
actually needs the DB. If the DB is unreachable the server still starts
and all AI/voice/mock endpoints keep working.
"""
from __future__ import annotations

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session, DeclarativeBase
from dotenv import load_dotenv
import os
import logging

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "")

# ── Build engine only if a URL is configured ─────────────────────────────────
# pool_pre_ping=True — tests the connection before handing it to a request
# connect_args timeout — don't hang forever on startup
if DATABASE_URL:
    try:
        engine = create_engine(
            DATABASE_URL,
            echo=False,
            pool_pre_ping=True,
            # Give each connection attempt a 5-second timeout
            connect_args={"connect_timeout": 5},
        )
    except Exception as exc:
        logger.warning(f"DB engine creation failed ({exc}) — running without database.")
        engine = None  # type: ignore[assignment]
else:
    logger.warning("DATABASE_URL not set — running without database.")
    engine = None  # type: ignore[assignment]

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,  # type: ignore[arg-type]
) if engine else None  # type: ignore[assignment]


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a DB session or raises 503 if no DB."""
    if SessionLocal is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Database unavailable — running in offline mode.")
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Called at startup. Tries to create tables; silently skips if DB is
    unreachable so the server can still serve AI/voice endpoints.
    """
    if engine is None:
        logger.warning("⚠️  Skipping DB init — no database connection.")
        return
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database connected and tables verified.")
    except Exception as exc:
        logger.warning(
            f"⚠️  DB unreachable at startup ({exc}). "
            "Server will run in offline/mock mode — AI and voice endpoints still work."
        )
