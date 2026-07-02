from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, DeclarativeBase
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Direct connection to Supabase (db.*.supabase.co:5432) — no pgBouncer pooler.
# pyrefly: ignore [no-matching-overload]
engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Tables are managed via Supabase migrations — this is a no-op on Supabase."""
    Base.metadata.create_all(bind=engine)
