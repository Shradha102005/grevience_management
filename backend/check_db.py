import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
print("Connecting to:", db_url)
engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

from models import MunicipalComplaint
try:
    complaints = db.query(MunicipalComplaint).all()
    print(f"Found {len(complaints)} complaints:")
    for c in complaints:
        print(f"- {c.complaint_number}: {c.title} (Status: {c.status}, Category: {c.category}, Location: {c.location})")
except Exception as e:
    print("Error querying database:", e)
finally:
    db.close()
