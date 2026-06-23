"""
One-time migration: add phone_number and zone columns to existing users table.
Run this script manually if the columns don't already exist.
Usage: python migrate_disaster.py
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

engine = create_engine(DATABASE_URL)

migrations = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS zone VARCHAR(100)",
]

with engine.connect() as conn:
    for sql in migrations:
        print(f"Running: {sql}")
        conn.execute(text(sql))
        conn.commit()
    print("✅ Migration complete.")
