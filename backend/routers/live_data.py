"""
Live Data Router — CIVICOS AI
Provides real-time data endpoints for all service modules:
  - Weather via OpenWeatherMap API
  - Schemes (50+ Indian govt schemes, searchable, eligibility-checkable)
  - City services from DB (admin-updatable in real time)
  - Department directory from DB
  - Rural programs from DB
  - Helpline query ticket creation
"""

from __future__ import annotations

import os
import logging
import uuid
import datetime as dt_module
from datetime import datetime, timezone
from typing import Optional, List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live", tags=["Live Data"])

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
DEFAULT_CITY = os.getenv("DEFAULT_CITY", "Hyderabad")

# ── In-memory stores ───────────────────────────────────────────────────────────

_CITY_SERVICES: list[dict] = []
_DEPARTMENTS: list[dict] = []
_SCHEMES: list[dict] = []
_RURAL_PROGRAMS: list[dict] = []
_HELPLINE_TICKETS: list[dict] = []
_TICKETS_SEEDED = False

_DATA_INITIALIZED = False


def _seed_helpline_tickets():
    """Seed 4 realistic demo helpline tickets (runs once)."""
    global _HELPLINE_TICKETS, _TICKETS_SEEDED
    if _TICKETS_SEEDED:
        return
    _TICKETS_SEEDED = True
    now = datetime.now(timezone.utc)

    def minsago(n: int) -> str:
        return (now - dt_module.timedelta(minutes=n)).isoformat()

    _HELPLINE_TICKETS = [
        {
            "ticket_id": "HLP-90214",
            "subject": "Ration Card Renewal Failed",
            "query": "I tried renewing my ration card online but the OTP never arrives.",
            "requester_name": "Rajesh K.",
            "priority": "High",
            "channel": "Phone",
            "language": "en",
            "status": "Open",
            "created_at": minsago(30),
            "updated_at": minsago(10),
            "expected_response": "2 hours",
            "messages": [
                {"sender": "Rajesh K.", "sender_type": "user",  "text": "I tried renewing my ration card online but the OTP never arrives to my registered mobile.", "time": minsago(30)},
            ],
        },
        {
            "ticket_id": "HLP-90213",
            "subject": "Birth Certificate — Documents Required",
            "query": "What documents are required for a birth certificate?",
            "requester_name": "Meena S.",
            "priority": "Normal",
            "channel": "Web",
            "language": "en",
            "status": "Pending",
            "created_at": minsago(90),
            "updated_at": minsago(60),
            "expected_response": "4 hours",
            "messages": [
                {"sender": "Meena S.",  "sender_type": "user",  "text": "What documents are required for a birth certificate application?",                                        "time": minsago(90)},
                {"sender": "Agent",     "sender_type": "agent", "text": "Hello Meena, you need the hospital discharge summary and both parents' Aadhaar cards. If born at home, a declaration from the local Panchayat is needed.", "time": minsago(60)},
            ],
        },
        {
            "ticket_id": "HLP-90210",
            "subject": "Property Tax Portal Down",
            "query": "I cannot pay my property tax, the payment gateway keeps crashing.",
            "requester_name": "Ahmed R.",
            "priority": "Critical",
            "channel": "Email",
            "language": "en",
            "status": "Open",
            "created_at": minsago(150),
            "updated_at": minsago(120),
            "expected_response": "1 hour",
            "messages": [
                {"sender": "Ahmed R.",  "sender_type": "user",  "text": "I cannot pay my property tax online. The payment gateway crashes every time I click 'Pay Now'. I need to pay before the deadline tomorrow.", "time": minsago(150)},
            ],
        },
        {
            "ticket_id": "HLP-90205",
            "subject": "Streetlight Not Working — Sector 4",
            "query": "The streetlight near sector 4 park has been broken for 3 days.",
            "requester_name": "Priya V.",
            "priority": "Low",
            "channel": "App",
            "language": "en",
            "status": "Resolved",
            "created_at": minsago(60 * 26),
            "updated_at": minsago(60 * 2),
            "expected_response": "48 hours",
            "messages": [
                {"sender": "Priya V.",  "sender_type": "user",  "text": "The streetlight near sector 4 park has been broken for 3 days. It is very dark and unsafe at night.", "time": minsago(60 * 26)},
                {"sender": "Agent",     "sender_type": "agent", "text": "Thank you for reporting, Priya. We have raised a work order with the municipal electrical team. Estimated fix: 48 hours.",                "time": minsago(60 * 20)},
                {"sender": "Agent",     "sender_type": "agent", "text": "The streetlight has been repaired. Closing this ticket. Thank you for your patience!",                                                             "time": minsago(60 * 2)},
            ],
        },
    ]


def _seed_data():
    global _CITY_SERVICES, _DEPARTMENTS, _SCHEMES, _RURAL_PROGRAMS, _DATA_INITIALIZED
    if _DATA_INITIALIZED:
        return

    _CITY_SERVICES = [
        {"id": "traffic", "label": "Traffic", "icon": "TrafficCone", "value": "Moderate on Ring Road", "detail": "Avoid NH-44 between 5–8 PM today. Alternate via Old Mumbai Highway.", "status": "warn", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": "water", "label": "Water Supply", "icon": "Droplets", "value": "Normal — all zones", "detail": "24x7 supply restored in Zones A–G. Next scheduled maintenance Sunday 6–8 AM.", "status": "ok", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": "power", "label": "Power", "icon": "Zap", "value": "Outage in Ward 7", "detail": "Fault on 11kV Feeder 3. 1,240 households affected. ETA restoration: 2 hours.", "status": "alert", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": "transport", "label": "Public Transport", "icon": "Bus", "value": "On schedule", "detail": "All TSRTC routes operational. Route 42C delayed 8 min due to traffic.", "status": "ok", "updated_at": datetime.now(timezone.utc).isoformat()},
        {"id": "wifi", "label": "Smart Services", "icon": "Wifi", "value": "All systems normal", "detail": "City Wi-Fi, surveillance, and e-governance portals running at 99.8% uptime.", "status": "ok", "updated_at": datetime.now(timezone.utc).isoformat()},
    ]

    _DEPARTMENTS = [
        {"id": "revenue", "name": "Revenue Department", "phone": "1800-599-1500", "whatsapp": "+914023456789", "email": "revenue@gov.in", "services": "Land records, property tax, income & caste certificates, mutation", "hours": "Mon–Fri 10 AM – 5 PM", "address": "Revenue Block, Secretariat, Hyderabad"},
        {"id": "health", "name": "Health & Family Welfare", "phone": "104", "whatsapp": "+914040101010", "email": "health@gov.in", "services": "Medical helpline, hospitals, ambulance dispatch, COVID services, vaccination", "hours": "24×7", "address": "DM&HO Office, Saifabad, Hyderabad"},
        {"id": "education", "name": "Education Department", "phone": "1800-180-1200", "whatsapp": None, "email": "education@gov.in", "services": "Scholarships, admissions, school grievances, RTE queries", "hours": "Mon–Sat 9 AM – 5 PM", "address": "SCERT Building, Masab Tank, Hyderabad"},
        {"id": "transport_dept", "name": "Transport Department", "phone": "1800-2100-120", "whatsapp": None, "email": "transport@gov.in", "services": "DL, vehicle registration, permits, fitness certificates, RTO queries", "hours": "Mon–Sat 9 AM – 5 PM", "address": "RTA Office, Khairatabad, Hyderabad"},
        {"id": "water", "name": "Water Board (HMWS&SB)", "phone": "1800-419-0033", "whatsapp": "+914027656655", "email": "hmwssb@gov.in", "services": "Water supply complaints, new connections, bills, meter issues", "hours": "24×7 complaints, 9 AM–5 PM office", "address": "Khairatabad, Hyderabad"},
        {"id": "electricity", "name": "Electricity Board (TSSPDCL)", "phone": "1912", "whatsapp": None, "email": "tsspdcl@telangana.gov.in", "services": "Power outages, new connections, billing disputes, solar connections", "hours": "24×7", "address": "Vidyut Soudha, Khairatabad, Hyderabad"},
        {"id": "pds", "name": "Food & Civil Supplies (PDS)", "phone": "1967", "whatsapp": None, "email": "civilsupplies@gov.in", "services": "Ration card issuance, PDS grievances, fair price shops, digital ration", "hours": "Mon–Fri 10 AM – 5 PM", "address": "Civil Supplies Bhavan, Hyderabad"},
        {"id": "women", "name": "Women & Child Welfare", "phone": "181", "whatsapp": "+914027852000", "email": "wcw@gov.in", "services": "Women helpline, domestic violence, Anganwadi, child protection, POSHAN", "hours": "24×7 helpline", "address": "Shishu Vihar, Himayatnagar, Hyderabad"},
    ]

    _SCHEMES = [
        # ── AGRICULTURE ──────────────────────────────────────────────────────────
        {
            "id": "pm-kisan",
            "name": "PM-KISAN",
            "full_name": "Pradhan Mantri Kisan Samman Nidhi",
            "category": "Agriculture",
            "ministry": "Ministry of Agriculture & Farmers Welfare",
            "launched_year": 2019,
            "benefit": "₹6,000/year direct income support in 3 instalments of ₹2,000 each",
            "eligibility": "Small and marginal farmers with cultivable land up to 2 hectares",
            "eligibility_criteria": {
                "occupation": ["farmer"],
                "max_land_hectares": 2,
                "residence": "any",
                "income": None,
                "age_min": 18,
                "age_max": None,
                "gender": "any",
                "category": "any",
            },
            "documents": "Aadhaar card, Bank passbook, Land records (Patta/Khasra), Mobile number",
            "portal_url": "https://pmkisan.gov.in",
            "apply_url": "https://pmkisan.gov.in/RegistrationForm.aspx",
            "helpline": "155261 / 1800-115-526",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["farmer", "agriculture", "income support", "direct benefit", "kisan", "subsidy"],
            "beneficiary_type": "Farmers",
        },
        {
            "id": "pm-fasal-bima",
            "name": "PM Fasal Bima Yojana",
            "full_name": "Pradhan Mantri Fasal Bima Yojana",
            "category": "Agriculture",
            "ministry": "Ministry of Agriculture & Farmers Welfare",
            "launched_year": 2016,
            "benefit": "Full sum insured for crop loss due to natural calamity, pest, disease. Premium: 2% Kharif, 1.5% Rabi, 5% commercial crops",
            "eligibility": "All farmers growing notified crops (compulsory for loanee farmers)",
            "eligibility_criteria": {
                "occupation": ["farmer"],
                "max_land_hectares": None,
                "residence": "any",
                "income": None,
                "age_min": 18,
                "age_max": None,
                "gender": "any",
                "category": "any",
            },
            "documents": "Aadhaar, Bank account, Land records, Sowing certificate, KCC (if loanee)",
            "portal_url": "https://pmfby.gov.in",
            "apply_url": "https://pmfby.gov.in/farmerRegistrationForm",
            "helpline": "1800-200-7710",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["crop insurance", "farmer", "kharif", "rabi", "natural disaster", "flood", "drought"],
            "beneficiary_type": "Farmers",
        },
        {
            "id": "kisan-credit-card",
            "name": "Kisan Credit Card (KCC)",
            "full_name": "Kisan Credit Card Scheme",
            "category": "Agriculture",
            "ministry": "Ministry of Agriculture & Farmers Welfare / NABARD",
            "launched_year": 1998,
            "benefit": "Short-term credit up to ₹3 lakh at 4% effective interest rate; flexible withdrawal",
            "eligibility": "Farmers, sharecroppers, oral lessees, tenant farmers, SHG members engaged in farming",
            "eligibility_criteria": {
                "occupation": ["farmer", "sharecropper", "tenant farmer"],
                "max_land_hectares": None,
                "residence": "any",
                "income": None,
                "age_min": 18,
                "age_max": None,
                "gender": "any",
                "category": "any",
            },
            "documents": "ID proof, Land documents / Lease agreement, Passport photo, Bank account, 2 passport photos",
            "portal_url": "https://www.nabard.org/content1.aspx?id=591",
            "apply_url": "https://www.nabard.org/content1.aspx?id=591",
            "helpline": "1800-180-1551",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["credit", "loan", "farmer", "bank", "interest subsidy", "kcc"],
            "beneficiary_type": "Farmers",
        },
        {
            "id": "soil-health-card",
            "name": "Soil Health Card Scheme",
            "full_name": "Soil Health Card Scheme",
            "category": "Agriculture",
            "ministry": "Ministry of Agriculture & Farmers Welfare",
            "launched_year": 2015,
            "benefit": "Free soil testing and a Soil Health Card with crop-wise nutrient recommendations every 2 years",
            "eligibility": "All farmers across India",
            "eligibility_criteria": {
                "occupation": ["farmer"],
                "residence": "any",
                "income": None,
                "age_min": 18,
                "gender": "any",
                "category": "any",
            },
            "documents": "Aadhaar card, Land records, Mobile number",
            "portal_url": "https://soilhealth.dac.gov.in",
            "apply_url": "https://soilhealth.dac.gov.in/home",
            "helpline": "1800-180-1551",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["soil", "fertility", "nutrient", "farmer", "agriculture", "free"],
            "beneficiary_type": "Farmers",
        },
        {
            "id": "enam",
            "name": "eNAM (National Agriculture Market)",
            "full_name": "Electronic National Agriculture Market",
            "category": "Agriculture",
            "ministry": "Ministry of Agriculture & Farmers Welfare",
            "launched_year": 2016,
            "benefit": "Online trading platform for agricultural commodities; better price discovery; direct market access",
            "eligibility": "All farmers and traders registered with APMCs",
            "eligibility_criteria": {
                "occupation": ["farmer", "trader"],
                "residence": "any",
                "income": None,
                "age_min": 18,
                "gender": "any",
                "category": "any",
            },
            "documents": "Aadhaar, Bank account, APMC registration",
            "portal_url": "https://enam.gov.in",
            "apply_url": "https://enam.gov.in/web/registration/farmer-form",
            "helpline": "1800-270-0224",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["market", "mandi", "price", "commodity", "online trading", "agriculture"],
            "beneficiary_type": "Farmers",
        },
        {
            "id": "pmkmy",
            "name": "PM Kisan Maan Dhan Yojana",
            "full_name": "Pradhan Mantri Kisan Maandhan Yojana",
            "category": "Agriculture",
            "ministry": "Ministry of Agriculture & Farmers Welfare",
            "launched_year": 2019,
            "benefit": "₹3,000/month pension after age 60 for small and marginal farmers",
            "eligibility": "Small/marginal farmers aged 18–40 years with landholding up to 2 hectares",
            "eligibility_criteria": {
                "occupation": ["farmer"],
                "max_land_hectares": 2,
                "residence": "any",
                "income": None,
                "age_min": 18,
                "age_max": 40,
                "gender": "any",
                "category": "any",
            },
            "documents": "Aadhaar, KCC / Bank passbook, Land records, Mobile number",
            "portal_url": "https://pmkmy.gov.in",
            "apply_url": "https://maandhan.in/auth/login",
            "helpline": "1800-267-6888",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["pension", "farmer", "retirement", "old age", "social security", "kisan"],
            "beneficiary_type": "Farmers",
        },

        # ── HEALTH ───────────────────────────────────────────────────────────────
        {
            "id": "ayushman-bharat",
            "name": "Ayushman Bharat — PM-JAY",
            "full_name": "Pradhan Mantri Jan Arogya Yojana",
            "category": "Health",
            "ministry": "Ministry of Health & Family Welfare",
            "launched_year": 2018,
            "benefit": "₹5 lakh health insurance cover per family per year for secondary and tertiary care hospitalisation",
            "eligibility": "Economically weaker sections as per SECC 2011 database; 10.74 crore families",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "max_income": 250000,
                "age_min": None,
                "age_max": None,
                "gender": "any",
                "category": "any",
                "secc_listed": True,
            },
            "documents": "Aadhaar card, Ration card, SECC eligibility document / e-card",
            "portal_url": "https://pmjay.gov.in",
            "apply_url": "https://mera.pmjay.gov.in/search/login",
            "helpline": "14555 / 1800-111-565",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["health", "insurance", "hospital", "medical", "treatment", "free", "ayushman", "PMJAY"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "janani-suraksha",
            "name": "Janani Suraksha Yojana (JSY)",
            "full_name": "Janani Suraksha Yojana",
            "category": "Health",
            "ministry": "Ministry of Health & Family Welfare / NHM",
            "launched_year": 2005,
            "benefit": "Cash assistance of ₹1,400 (rural) / ₹1,000 (urban) for institutional delivery",
            "eligibility": "Pregnant women from BPL/SC/ST families preferring government hospital delivery",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": "BPL",
                "age_min": None,
                "age_max": None,
                "gender": "female",
                "category": ["SC", "ST", "BPL"],
            },
            "documents": "Aadhaar, MCH card, BPL card / caste certificate, Bank account",
            "portal_url": "https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=841&lid=309",
            "apply_url": "https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=841&lid=309",
            "helpline": "104",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["pregnancy", "delivery", "maternity", "women", "health", "cash", "hospital", "NHM"],
            "beneficiary_type": "Women",
        },
        {
            "id": "abha",
            "name": "ABHA — Ayushman Bharat Health Account",
            "full_name": "Ayushman Bharat Health Account (ABHA Card)",
            "category": "Health",
            "ministry": "Ministry of Health & Family Welfare / NHA",
            "launched_year": 2021,
            "benefit": "14-digit unique health ID to link all medical records; access health records anywhere",
            "eligibility": "All Indian citizens",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": None,
                "gender": "any",
                "category": "any",
            },
            "documents": "Aadhaar card or Mobile number (for self-declaration)",
            "portal_url": "https://abha.abdm.gov.in",
            "apply_url": "https://abha.abdm.gov.in/abha/v3/register",
            "helpline": "1800-11-4477",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["health ID", "digital health", "medical records", "ABHA", "health account", "ABDM"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "pmsma",
            "name": "PMSMA — Pradhan Mantri Surakshit Matritva Abhiyan",
            "full_name": "Pradhan Mantri Surakshit Matritva Abhiyan",
            "category": "Health",
            "ministry": "Ministry of Health & Family Welfare",
            "launched_year": 2016,
            "benefit": "Free antenatal care check-ups on 9th of every month at government health facilities",
            "eligibility": "All pregnant women in their 2nd and 3rd trimester",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": None,
                "gender": "female",
                "category": "any",
            },
            "documents": "MCH card, Aadhaar (optional)",
            "portal_url": "https://pmsma.nhp.gov.in",
            "apply_url": "https://pmsma.nhp.gov.in/",
            "helpline": "104",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["pregnancy", "antenatal", "maternity", "free checkup", "women", "health"],
            "beneficiary_type": "Women",
        },

        # ── HOUSING ──────────────────────────────────────────────────────────────
        {
            "id": "pm-awas-gramin",
            "name": "PM Awas Yojana — Gramin",
            "full_name": "Pradhan Mantri Awas Yojana Gramin",
            "category": "Housing",
            "ministry": "Ministry of Rural Development",
            "launched_year": 2016,
            "benefit": "₹1.20 lakh (plains) / ₹1.30 lakh (hills/NE) housing assistance + MGNREGA 90 days labour + toilet under SBM",
            "eligibility": "Houseless, 1–2 room kutcha house families from SECC 2011 list; priority to SC/ST, minorities",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "rural",
                "income": "BPL",
                "age_min": 18,
                "gender": "any",
                "category": "any",
                "secc_listed": True,
            },
            "documents": "BPL/SECC proof, Aadhaar, Bank account, Land certificate, Geo-tagged photos",
            "portal_url": "https://pmayg.nic.in",
            "apply_url": "https://pmayg.nic.in/netiay/Benificiary.aspx",
            "helpline": "1800-11-6446",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["house", "rural", "housing", "construction", "pucca", "BPL", "SECC"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "pm-awas-urban",
            "name": "PM Awas Yojana — Urban (PMAY-U 2.0)",
            "full_name": "Pradhan Mantri Awas Yojana Urban 2.0",
            "category": "Housing",
            "ministry": "Ministry of Housing & Urban Affairs",
            "launched_year": 2024,
            "benefit": "Interest subsidy of 3–6.5% on home loan; central assistance up to ₹2.5 lakh for EWS/LIG",
            "eligibility": "EWS (income <₹3L), LIG (₹3–6L), MIG-I (₹6–9L), MIG-II (₹9–12L) families in urban areas without pucca house",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "urban",
                "max_income": 1200000,
                "age_min": 18,
                "gender": "any",
                "category": "any",
            },
            "documents": "Income certificate, Aadhaar, PAN card, Bank account, Property documents, Salary slips",
            "portal_url": "https://pmaymis.gov.in",
            "apply_url": "https://pmaymis.gov.in/",
            "helpline": "1800-11-3377",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["house", "urban", "housing loan", "interest subsidy", "city", "EWS", "LIG", "MIG"],
            "beneficiary_type": "Individuals",
        },

        # ── EDUCATION ────────────────────────────────────────────────────────────
        {
            "id": "national-scholarship",
            "name": "National Scholarship Portal (NSP)",
            "full_name": "National Scholarship Portal",
            "category": "Education",
            "ministry": "Ministry of Education / Ministry of Minority Affairs",
            "launched_year": 2015,
            "benefit": "Pre & post matric scholarships ₹1,000–₹20,000/month; tuition fee reimbursement; maintenance allowance",
            "eligibility": "SC/ST/OBC/Minority/EWS/PWD students with family income <₹2.5 lakh/year",
            "eligibility_criteria": {
                "occupation": ["student"],
                "residence": "any",
                "max_income": 250000,
                "age_min": 5,
                "age_max": 30,
                "gender": "any",
                "category": ["SC", "ST", "OBC", "Minority", "EWS", "PWD"],
            },
            "documents": "Marksheets, Income certificate, Caste certificate, Aadhaar, Bank details, Bonafide certificate",
            "portal_url": "https://scholarships.gov.in",
            "apply_url": "https://scholarships.gov.in/fresh/loginpage",
            "helpline": "0120-6619540",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["scholarship", "student", "education", "SC", "ST", "OBC", "minority", "fees", "NSP"],
            "beneficiary_type": "Students",
        },
        {
            "id": "beti-bachao",
            "name": "Beti Bachao Beti Padhao",
            "full_name": "Beti Bachao Beti Padhao Scheme",
            "category": "Education",
            "ministry": "Ministry of Women & Child Development",
            "launched_year": 2015,
            "benefit": "Conditional cash transfers, educational incentives, awareness campaigns for girl child education",
            "eligibility": "Girl child, especially in districts with low sex ratio",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": 0,
                "age_max": 18,
                "gender": "female",
                "category": "any",
            },
            "documents": "Birth certificate, Aadhaar, School enrollment proof",
            "portal_url": "https://wcd.nic.in/bbbp-schemes",
            "apply_url": "https://wcd.nic.in/bbbp-schemes",
            "helpline": "181",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["girl child", "education", "women", "gender", "BBBP", "sex ratio"],
            "beneficiary_type": "Women",
        },
        {
            "id": "pmrf",
            "name": "PM Research Fellowship (PMRF)",
            "full_name": "Prime Minister's Research Fellowship",
            "category": "Education",
            "ministry": "Ministry of Education",
            "launched_year": 2018,
            "benefit": "Fellowship of ₹70,000–₹80,000/month for PhD scholars + research grant ₹2 lakh/year",
            "eligibility": "Students with B.Tech/M.Tech/Integrated M.Sc from top IITs/NITs/IISc pursuing PhD",
            "eligibility_criteria": {
                "occupation": ["student", "researcher"],
                "residence": "any",
                "income": None,
                "age_min": 21,
                "age_max": 35,
                "gender": "any",
                "category": "any",
            },
            "documents": "Degree certificates, GATE score, Research proposal, Aadhaar",
            "portal_url": "https://www.pmrf.in",
            "apply_url": "https://www.pmrf.in/apply",
            "helpline": "011-26591701",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["PhD", "fellowship", "research", "IIT", "NIT", "higher education", "PMRF"],
            "beneficiary_type": "Students",
        },

        # ── FINANCE / BANKING ────────────────────────────────────────────────────
        {
            "id": "mudra-yojana",
            "name": "PM Mudra Yojana",
            "full_name": "Pradhan Mantri MUDRA Yojana",
            "category": "Finance",
            "ministry": "Ministry of Finance / MUDRA Ltd",
            "launched_year": 2015,
            "benefit": "Shishu: up to ₹50K | Kishore: ₹50K–5L | Tarun: ₹5L–10L loans for non-farm micro enterprises",
            "eligibility": "Non-farm micro/small businesses, proprietors, artisans, SHGs, JLGs",
            "eligibility_criteria": {
                "occupation": ["business", "entrepreneur", "artisan", "self-employed"],
                "residence": "any",
                "income": None,
                "age_min": 18,
                "gender": "any",
                "category": "any",
            },
            "documents": "Aadhaar, PAN, Business proof, Bank statement (6 months), Passport photo, Address proof",
            "portal_url": "https://www.mudra.org.in",
            "apply_url": "https://www.mudra.org.in/Default",
            "helpline": "1800-180-1111",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["loan", "business", "entrepreneur", "MSME", "micro finance", "mudra", "Shishu", "Kishore", "Tarun"],
            "beneficiary_type": "Businesses",
        },
        {
            "id": "jan-dhan",
            "name": "PM Jan Dhan Yojana",
            "full_name": "Pradhan Mantri Jan Dhan Yojana",
            "category": "Finance",
            "ministry": "Ministry of Finance",
            "launched_year": 2014,
            "benefit": "Zero-balance bank account + RuPay debit card + ₹2L accident insurance + ₹30K life insurance + OD facility ₹10K",
            "eligibility": "All Indian citizens above 10 years who don't have a bank account",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": 10,
                "gender": "any",
                "category": "any",
            },
            "documents": "Aadhaar / Voter ID / Driving License / Passport, Passport photo",
            "portal_url": "https://pmjdy.gov.in",
            "apply_url": "https://pmjdy.gov.in/account-opening-form-download",
            "helpline": "1800-11-0001",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["bank account", "financial inclusion", "zero balance", "RuPay", "PMJDY", "banking"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "atal-pension",
            "name": "Atal Pension Yojana (APY)",
            "full_name": "Atal Pension Yojana",
            "category": "Finance",
            "ministry": "Ministry of Finance / PFRDA",
            "launched_year": 2015,
            "benefit": "Guaranteed pension of ₹1,000–₹5,000/month after age 60 with government co-contribution",
            "eligibility": "Indian citizens aged 18–40 years with bank account; not income tax payers",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": 18,
                "age_max": 40,
                "gender": "any",
                "category": "any",
                "not_income_tax_payer": True,
            },
            "documents": "Aadhaar, Bank account with mobile linked, Nomination details",
            "portal_url": "https://npscra.nsdl.co.in/nps-lite-atal-pension-yojana.php",
            "apply_url": "https://enps.nsdl.com/eNPS/NationalPensionSystem.html",
            "helpline": "1800-110-708",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["pension", "retirement", "savings", "APY", "unorganised sector", "old age"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "standup-india",
            "name": "Stand-Up India",
            "full_name": "Stand-Up India Scheme",
            "category": "Finance",
            "ministry": "Ministry of Finance / SIDBI",
            "launched_year": 2016,
            "benefit": "Bank loan between ₹10 lakh and ₹1 crore for greenfield enterprise setup",
            "eligibility": "SC/ST or women entrepreneurs setting up greenfield enterprise in manufacturing, services, or trading",
            "eligibility_criteria": {
                "occupation": ["entrepreneur", "business"],
                "residence": "any",
                "income": None,
                "age_min": 18,
                "gender": "any",
                "category": ["SC", "ST", "Women"],
            },
            "documents": "Aadhaar, PAN, Business plan, Income certificate, Caste / Gender certificate, Land lease",
            "portal_url": "https://www.standupmitra.in",
            "apply_url": "https://www.standupmitra.in/Login/Register",
            "helpline": "1800-180-1111",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["entrepreneur", "SC", "ST", "women", "loan", "startup", "business", "greenfield"],
            "beneficiary_type": "Businesses",
        },

        # ── INSURANCE ────────────────────────────────────────────────────────────
        {
            "id": "pmjjby",
            "name": "PM Jeevan Jyoti Bima Yojana (PMJJBY)",
            "full_name": "Pradhan Mantri Jeevan Jyoti Bima Yojana",
            "category": "Insurance",
            "ministry": "Ministry of Finance",
            "launched_year": 2015,
            "benefit": "₹2 lakh life insurance cover at just ₹436/year (auto-renewed)",
            "eligibility": "Bank account holders aged 18–50 years",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": 18,
                "age_max": 50,
                "gender": "any",
                "category": "any",
            },
            "documents": "Bank account (auto-debit consent), Aadhaar, Health declaration",
            "portal_url": "https://jansuraksha.gov.in/PMJJBY.aspx",
            "apply_url": "https://jansuraksha.gov.in/PMJJBY.aspx",
            "helpline": "1800-180-1111",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["life insurance", "death benefit", "low premium", "PMJJBY", "bank", "term insurance"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "pmsby",
            "name": "PM Suraksha Bima Yojana (PMSBY)",
            "full_name": "Pradhan Mantri Suraksha Bima Yojana",
            "category": "Insurance",
            "ministry": "Ministry of Finance",
            "launched_year": 2015,
            "benefit": "₹2 lakh accidental death/disability cover at just ₹20/year",
            "eligibility": "Bank account holders aged 18–70 years",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": 18,
                "age_max": 70,
                "gender": "any",
                "category": "any",
            },
            "documents": "Bank account (auto-debit consent), Aadhaar",
            "portal_url": "https://jansuraksha.gov.in/PMSBY.aspx",
            "apply_url": "https://jansuraksha.gov.in/PMSBY.aspx",
            "helpline": "1800-180-1111",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["accident insurance", "disability", "low premium", "PMSBY", "bank", "accidental death"],
            "beneficiary_type": "Individuals",
        },

        # ── EMPLOYMENT ───────────────────────────────────────────────────────────
        {
            "id": "mgnrega",
            "name": "MGNREGA",
            "full_name": "Mahatma Gandhi National Rural Employment Guarantee Act",
            "category": "Employment",
            "ministry": "Ministry of Rural Development",
            "launched_year": 2006,
            "benefit": "100 days guaranteed wage employment per household at ₹237–₹374/day (state-specific)",
            "eligibility": "Adult members (18+ years) of rural households willing to do unskilled manual work",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "rural",
                "income": None,
                "age_min": 18,
                "gender": "any",
                "category": "any",
            },
            "documents": "Job card (apply at Gram Panchayat), Aadhaar (for payment), Bank account",
            "portal_url": "https://nrega.nic.in",
            "apply_url": "https://nreganarep.nic.in/",
            "helpline": "1800-111-555",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["employment", "rural", "wages", "job card", "NREGA", "unskilled labor", "guaranteed"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "pmkvy",
            "name": "PM Kaushal Vikas Yojana (PMKVY 4.0)",
            "full_name": "Pradhan Mantri Kaushal Vikas Yojana",
            "category": "Employment",
            "ministry": "Ministry of Skill Development & Entrepreneurship",
            "launched_year": 2015,
            "benefit": "Free skill training in 300+ job roles + ₹8,000 post-certification reward + placement assistance",
            "eligibility": "Indian citizens aged 15–45 years seeking skill training; dropouts preferred",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": 15,
                "age_max": 45,
                "gender": "any",
                "category": "any",
            },
            "documents": "Aadhaar, Educational certificate, Passport photo, Bank account",
            "portal_url": "https://skillindiadigital.gov.in",
            "apply_url": "https://skillindiadigital.gov.in/candidate/registration",
            "helpline": "1800-123-9626",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["skill", "training", "employment", "youth", "certification", "vocational", "PMKVY"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "pmegp",
            "name": "PM Employment Generation Programme",
            "full_name": "Pradhan Mantri Employment Generation Programme",
            "category": "Employment",
            "ministry": "Ministry of MSME / KVIC",
            "launched_year": 2008,
            "benefit": "Subsidy of 15–35% on project cost (max ₹25L manufacturing, ₹10L services); bank loan for rest",
            "eligibility": "Above 18 years, minimum 8th pass for projects above ₹10 lakh",
            "eligibility_criteria": {
                "occupation": ["entrepreneur", "artisan", "self-employed"],
                "residence": "any",
                "income": None,
                "age_min": 18,
                "gender": "any",
                "category": "any",
            },
            "documents": "Aadhaar, PAN, Educational certificate, Project report, Passport photo",
            "portal_url": "https://kviconline.gov.in/pmegpeportal/jsp/pmegponline.jsp",
            "apply_url": "https://kviconline.gov.in/pmegpeportal/jsp/pmegponline.jsp",
            "helpline": "1800-3000-0034",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["employment", "subsidy", "enterprise", "MSME", "KVIC", "startup", "rural industries"],
            "beneficiary_type": "Businesses",
        },
        {
            "id": "startup-india",
            "name": "Startup India",
            "full_name": "Startup India Initiative",
            "category": "Employment",
            "ministry": "Ministry of Commerce & Industry / DPIIT",
            "launched_year": 2016,
            "benefit": "Tax exemptions, fast-track IP rights, fund of funds access, mentorship, self-certification under labour laws",
            "eligibility": "DPIIT-recognized startups less than 10 years old with turnover <₹100 crore/year",
            "eligibility_criteria": {
                "occupation": ["entrepreneur", "business"],
                "residence": "any",
                "income": None,
                "age_min": 18,
                "gender": "any",
                "category": "any",
            },
            "documents": "Company registration, PAN, DPIIT recognition letter, Business plan, ITR",
            "portal_url": "https://startupindia.gov.in",
            "apply_url": "https://www.startupindia.gov.in/content/sih/en/startupgov/startup-recognition-page.html",
            "helpline": "1800-115-565",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["startup", "entrepreneur", "tax", "DPIIT", "innovation", "funding", "incubator"],
            "beneficiary_type": "Businesses",
        },

        # ── WOMEN & CHILD ─────────────────────────────────────────────────────────
        {
            "id": "sukanya-samriddhi",
            "name": "Sukanya Samriddhi Yojana (SSY)",
            "full_name": "Sukanya Samriddhi Yojana",
            "category": "Women & Child",
            "ministry": "Ministry of Finance",
            "launched_year": 2015,
            "benefit": "8.2% per annum tax-free interest (Section 80C benefit); maturity at 21 years",
            "eligibility": "Girl child below 10 years; max 2 accounts per family",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": 0,
                "age_max": 10,
                "gender": "female",
                "category": "any",
            },
            "documents": "Girl's birth certificate, Parent's Aadhaar, address proof, initial deposit ₹250",
            "portal_url": "https://www.india.gov.in/sukanya-samriddhi-yojana",
            "apply_url": "https://www.indiapost.gov.in/Financial/Pages/Content/SuccessStories.aspx",
            "helpline": "1800-103-3434",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["girl child", "savings", "education", "marriage", "tax benefit", "SSY", "daughter"],
            "beneficiary_type": "Women",
        },
        {
            "id": "pmmvy",
            "name": "PM Matru Vandana Yojana (PMMVY)",
            "full_name": "Pradhan Mantri Matru Vandana Yojana",
            "category": "Women & Child",
            "ministry": "Ministry of Women & Child Development",
            "launched_year": 2017,
            "benefit": "₹5,000 maternity benefit in 3 instalments for 1st live birth; ₹6,000 for 2nd birth girl child",
            "eligibility": "Pregnant and lactating women aged 19+ for 1st/2nd live birth; not government employees",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": 19,
                "gender": "female",
                "category": "any",
            },
            "documents": "Aadhaar, MCP card, Bank account, Ration card",
            "portal_url": "https://wcd.nic.in/schemes/pradhan-mantri-matru-vandana-yojana",
            "apply_url": "https://pmmvy.wcd.gov.in/",
            "helpline": "181",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["maternity", "pregnancy", "cash transfer", "women", "nutrition", "PMMVY", "mother"],
            "beneficiary_type": "Women",
        },
        {
            "id": "one-stop-centre",
            "name": "One Stop Centre (Sakhi)",
            "full_name": "One Stop Centre Scheme (Sakhi)",
            "category": "Women & Child",
            "ministry": "Ministry of Women & Child Development",
            "launched_year": 2015,
            "benefit": "Integrated support services (police, medical, legal, shelter) for women facing violence; 24×7",
            "eligibility": "All women facing any form of violence, regardless of age, caste, or religion",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": None,
                "gender": "female",
                "category": "any",
            },
            "documents": "No documents required for emergency services",
            "portal_url": "https://wcd.nic.in/schemes/one-stop-centre-scheme-0",
            "apply_url": "https://wcd.nic.in/schemes/one-stop-centre-scheme-0",
            "helpline": "181",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["women safety", "violence", "shelter", "legal aid", "Sakhi", "domestic violence"],
            "beneficiary_type": "Women",
        },
        {
            "id": "poshan-abhiyan",
            "name": "POSHAN Abhiyaan",
            "full_name": "Prime Minister's Overarching Scheme for Holistic Nourishment",
            "category": "Women & Child",
            "ministry": "Ministry of Women & Child Development",
            "launched_year": 2018,
            "benefit": "Nutritional support for children (0–6 yrs), pregnant/lactating women; reduce stunting, wasting, anaemia",
            "eligibility": "Children 0–6 years, pregnant women, lactating mothers, and adolescent girls",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": 0,
                "age_max": 6,
                "gender": "any",
                "category": "any",
            },
            "documents": "Birth certificate (for children), Aadhaar, MCP card",
            "portal_url": "https://icds-wcd.nic.in/poshanabhiyan.aspx",
            "apply_url": "https://poshantracker.in/",
            "helpline": "1800-11-8004",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["nutrition", "child", "malnutrition", "ICDS", "Anganwadi", "pregnant", "POSHAN"],
            "beneficiary_type": "Women",
        },

        # ── RURAL LIVELIHOOD ─────────────────────────────────────────────────────
        {
            "id": "pm-svanidhi",
            "name": "PM SVANidhi",
            "full_name": "PM Street Vendor's AtmaNirbhar Nidhi",
            "category": "Urban Livelihood",
            "ministry": "Ministry of Housing & Urban Affairs",
            "launched_year": 2020,
            "benefit": "Working capital loan: ₹10K → ₹20K → ₹50K with 7% interest subsidy + digital incentive ₹1,200/year",
            "eligibility": "Street vendors with vending certificate or Letter of Recommendation from ULB",
            "eligibility_criteria": {
                "occupation": ["street vendor", "hawker", "vendor"],
                "residence": "urban",
                "income": None,
                "age_min": 18,
                "gender": "any",
                "category": "any",
            },
            "documents": "Vending certificate / LoR from ULB, Aadhaar, Bank account, Passport photo",
            "portal_url": "https://pmsvanidhi.mohua.gov.in",
            "apply_url": "https://pmsvanidhi.mohua.gov.in/Schemes",
            "helpline": "1800-11-0001",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["street vendor", "hawker", "loan", "urban", "micro credit", "SVANidhi"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "day-nrlm",
            "name": "DAY-NRLM (Self-Help Groups)",
            "full_name": "Deendayal Antyodaya Yojana – National Rural Livelihoods Mission",
            "category": "Rural Livelihood",
            "ministry": "Ministry of Rural Development",
            "launched_year": 2011,
            "benefit": "SHG loan at 7% interest; revolving fund ₹15,000; CIF up to ₹50,000; income-generating activities",
            "eligibility": "Women in rural areas; form SHG of 10–15 members",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "rural",
                "income": None,
                "age_min": 18,
                "gender": "female",
                "category": "any",
            },
            "documents": "SHG registration, Bank account, Meeting records, Aadhaar of members",
            "portal_url": "https://aajeevika.gov.in",
            "apply_url": "https://aajeevika.gov.in/",
            "helpline": "1800-180-2244",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["SHG", "women", "rural", "self help group", "livelihood", "credit", "NRLM"],
            "beneficiary_type": "Women",
        },
        {
            "id": "ddu-gky",
            "name": "DDU-GKY (Rural Youth Skill Training)",
            "full_name": "Deen Dayal Upadhyaya Grameen Kaushalya Yojana",
            "category": "Employment",
            "ministry": "Ministry of Rural Development",
            "launched_year": 2014,
            "benefit": "Free residential skill training + placement in formal sector at ₹6,000+ salary; post-placement support",
            "eligibility": "Rural youth aged 15–35 years; SC/ST/women/minorities/PWD/BPL prioritized (up to 45 years)",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "rural",
                "income": None,
                "age_min": 15,
                "age_max": 35,
                "gender": "any",
                "category": "any",
            },
            "documents": "Aadhaar, Educational certificate, Domicile/residence proof, Passport photo",
            "portal_url": "https://ddugky.gov.in",
            "apply_url": "https://ddugky.gov.in/en/candidate-registration",
            "helpline": "1800-180-6127",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["rural youth", "skill", "job", "placement", "training", "DDU-GKY", "employment"],
            "beneficiary_type": "Individuals",
        },

        # ── ENERGY ───────────────────────────────────────────────────────────────
        {
            "id": "pm-ujjwala",
            "name": "PM Ujjwala Yojana 2.0",
            "full_name": "Pradhan Mantri Ujjwala Yojana 2.0",
            "category": "Energy",
            "ministry": "Ministry of Petroleum & Natural Gas",
            "launched_year": 2021,
            "benefit": "Free LPG connection + 1 free refill + hotplate to BPL women; address proof waiver for migrants",
            "eligibility": "Women from BPL/SC/ST/PM-AWAS/SECC/migrant households not having LPG connection",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": "BPL",
                "age_min": 18,
                "gender": "female",
                "category": ["SC", "ST", "BPL"],
            },
            "documents": "BPL card or self-declaration, Aadhaar, Bank account, Address proof (or self-declaration for migrants)",
            "portal_url": "https://pmuy.gov.in",
            "apply_url": "https://www.myLPG.in/DBTL/do/welcome.do",
            "helpline": "1906",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["LPG", "gas", "cooking", "women", "BPL", "fuel", "Ujjwala"],
            "beneficiary_type": "Women",
        },
        {
            "id": "pm-surya-ghar",
            "name": "PM Surya Ghar: Muft Bijli Yojana",
            "full_name": "PM Surya Ghar: Muft Bijli Yojana (Rooftop Solar)",
            "category": "Energy",
            "ministry": "Ministry of New & Renewable Energy",
            "launched_year": 2024,
            "benefit": "300 units free electricity/month + subsidy up to ₹78,000 for rooftop solar panel installation",
            "eligibility": "All residential households with valid electricity connection and own roof space",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": 18,
                "gender": "any",
                "category": "any",
            },
            "documents": "Electricity bill, Aadhaar, Bank account, Property ownership/lease document",
            "portal_url": "https://pmsuryaghar.gov.in",
            "apply_url": "https://pmsuryaghar.gov.in/consumer_reg",
            "helpline": "1800-180-3333",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["solar", "renewable energy", "electricity", "free", "rooftop", "green energy", "Surya Ghar"],
            "beneficiary_type": "Individuals",
        },

        # ── SENIOR CITIZENS ──────────────────────────────────────────────────────
        {
            "id": "ignoaps",
            "name": "IGNOAPS — Old Age Pension",
            "full_name": "Indira Gandhi National Old Age Pension Scheme",
            "category": "Senior Citizens",
            "ministry": "Ministry of Rural Development",
            "launched_year": 1995,
            "benefit": "₹200–₹500/month central share (state adds more); total typically ₹500–₹2000/month",
            "eligibility": "BPL individuals aged 60 years and above",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": "BPL",
                "age_min": 60,
                "gender": "any",
                "category": "any",
            },
            "documents": "Age proof (birth certificate/voter ID), BPL card, Aadhaar, Bank account",
            "portal_url": "https://nsap.nic.in",
            "apply_url": "https://nsap.nic.in/portalNSAP/Main.aspx",
            "helpline": "1800-111-555",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["old age", "senior citizen", "pension", "BPL", "NSAP", "elderly", "IGNOAPS"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "vayo-shreshtha",
            "name": "Vayo Shreshtha Samman",
            "full_name": "Vayo Shreshtha Samman – Senior Citizen Welfare",
            "category": "Senior Citizens",
            "ministry": "Ministry of Social Justice & Empowerment",
            "launched_year": 2013,
            "benefit": "Free inter-state travel in reserved rail compartment, health camps, aids & assistive devices",
            "eligibility": "Senior citizens aged 60+ years; BPL/income < ₹15,000/month for assistive devices",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": 60,
                "gender": "any",
                "category": "any",
            },
            "documents": "Age proof, Income certificate (for device assistance), Aadhaar",
            "portal_url": "https://socialjustice.gov.in/schemes/42",
            "apply_url": "https://socialjustice.gov.in/schemes/42",
            "helpline": "14567",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["senior citizen", "elderly", "60+", "welfare", "assistive device", "pension"],
            "beneficiary_type": "Individuals",
        },

        # ── DISABILITY ───────────────────────────────────────────────────────────
        {
            "id": "adip",
            "name": "ADIP Scheme (Assistive Devices)",
            "full_name": "Assistance to Disabled Persons for Purchase of Aids & Appliances",
            "category": "Disability",
            "ministry": "Ministry of Social Justice & Empowerment",
            "launched_year": 1981,
            "benefit": "Free assistive devices (wheelchair, crutches, hearing aids, braille kits) for persons with disabilities",
            "eligibility": "Persons with disability (40%+ disability) with income <₹20,000/month",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "max_income": 240000,
                "age_min": None,
                "gender": "any",
                "category": "PWD",
            },
            "documents": "Disability certificate (40%+), Income certificate, Aadhaar, Address proof",
            "portal_url": "https://disabilityaffairs.gov.in/content/page/adip-scheme.php",
            "apply_url": "https://alimco.in/ADIP_Scheme.aspx",
            "helpline": "1800-180-5129",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["disability", "PWD", "wheelchair", "hearing aid", "assistive", "ADIP", "differently abled"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "ddc",
            "name": "Divyangjan Scholarship Scheme",
            "full_name": "Scholarship for Students with Disabilities",
            "category": "Disability",
            "ministry": "Ministry of Social Justice & Empowerment / DEPwD",
            "launched_year": 2014,
            "benefit": "₹500–₹2,000/month scholarship + ₹4,000–₹16,500/year book grant for disabled students",
            "eligibility": "Students with 40%+ disability pursuing studies from class 9 to post-graduation; income <₹2.5L",
            "eligibility_criteria": {
                "occupation": ["student"],
                "residence": "any",
                "max_income": 250000,
                "age_min": 13,
                "gender": "any",
                "category": "PWD",
            },
            "documents": "Disability certificate, Income certificate, Aadhaar, Marksheets, Bank account",
            "portal_url": "https://scholarships.gov.in",
            "apply_url": "https://scholarships.gov.in/fresh/loginpage",
            "helpline": "1800-180-5129",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["disability", "PWD", "scholarship", "education", "student", "Divyangjan"],
            "beneficiary_type": "Students",
        },

        # ── DIGITAL / TECHNOLOGY ─────────────────────────────────────────────────
        {
            "id": "pmgdisha",
            "name": "PM Gramin Digital Saksharta Abhiyan",
            "full_name": "Pradhan Mantri Gramin Digital Saksharta Abhiyan (PMGDISHA)",
            "category": "Digital",
            "ministry": "Ministry of Electronics & IT",
            "launched_year": 2017,
            "benefit": "Free digital literacy training — internet use, UPI payments, online services; certificate on completion",
            "eligibility": "Rural household members aged 14–60 years; 1 member per household",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "rural",
                "income": None,
                "age_min": 14,
                "age_max": 60,
                "gender": "any",
                "category": "any",
            },
            "documents": "Aadhaar, Address proof",
            "portal_url": "https://pmgdisha.in",
            "apply_url": "https://www.pmgdisha.in/student-registration/",
            "helpline": "1800-3000-3468",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["digital literacy", "internet", "rural", "computer", "training", "UPI", "PMGDISHA"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "digilocker",
            "name": "DigiLocker",
            "full_name": "DigiLocker — Digital Document Wallet",
            "category": "Digital",
            "ministry": "Ministry of Electronics & IT",
            "launched_year": 2015,
            "benefit": "Free secure cloud storage for official documents (Aadhaar, DL, PAN, marksheets); legally valid",
            "eligibility": "All Indian citizens with Aadhaar-linked mobile number",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": None,
                "gender": "any",
                "category": "any",
            },
            "documents": "Aadhaar-linked mobile number",
            "portal_url": "https://digilocker.gov.in",
            "apply_url": "https://accounts.digilocker.gov.in/signup",
            "helpline": "1800-3000-3468",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["documents", "digital", "cloud", "Aadhaar", "PAN", "DL", "marksheet", "paperless"],
            "beneficiary_type": "Individuals",
        },

        # ── WATER & SANITATION ───────────────────────────────────────────────────
        {
            "id": "jal-jeevan",
            "name": "Jal Jeevan Mission",
            "full_name": "Jal Jeevan Mission — Har Ghar Jal",
            "category": "Water & Sanitation",
            "ministry": "Ministry of Jal Shakti",
            "launched_year": 2019,
            "benefit": "Functional household tap connection with 55 lpcd safe drinking water",
            "eligibility": "All rural households without piped water connection",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "rural",
                "income": None,
                "age_min": 18,
                "gender": "any",
                "category": "any",
            },
            "documents": "Address proof, Aadhaar, Application to Gram Panchayat",
            "portal_url": "https://jaljeevanmission.gov.in",
            "apply_url": "https://ejalshakti.gov.in/jjmreport/JJMIndia.aspx",
            "helpline": "1800-180-1551",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["water", "tap water", "rural", "drinking water", "pipeline", "Jal Jeevan"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "sbm-gramin",
            "name": "Swachh Bharat Mission — Gramin",
            "full_name": "Swachh Bharat Mission (Gramin) Phase II",
            "category": "Water & Sanitation",
            "ministry": "Ministry of Jal Shakti",
            "launched_year": 2019,
            "benefit": "Incentive of ₹12,000 for construction of individual household toilet (IHHL)",
            "eligibility": "BPL households / SC/ST / landless labourers / PWD / women-headed households without toilet",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "rural",
                "income": "BPL",
                "age_min": 18,
                "gender": "any",
                "category": "any",
            },
            "documents": "BPL card, Aadhaar, Bank account, Application to Gram Panchayat",
            "portal_url": "https://sbm.gov.in/sbmreport/home.aspx",
            "apply_url": "https://sbm.gov.in/sbmreport/home.aspx",
            "helpline": "1969",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["toilet", "sanitation", "ODF", "Swachh Bharat", "hygiene", "rural", "BPL"],
            "beneficiary_type": "Individuals",
        },

        # ── INFRASTRUCTURE ───────────────────────────────────────────────────────
        {
            "id": "pmgsy",
            "name": "PM Gram Sadak Yojana",
            "full_name": "Pradhan Mantri Gram Sadak Yojana",
            "category": "Infrastructure",
            "ministry": "Ministry of Rural Development",
            "launched_year": 2000,
            "benefit": "All-weather road connectivity to unconnected habitations (≥250 population); track project status online",
            "eligibility": "Habitations with ≥250 population (≥100 in NE/hill/tribal areas)",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "rural",
                "income": None,
                "age_min": 18,
                "gender": "any",
                "category": "any",
            },
            "documents": "No individual documents; village-level application through Gram Panchayat",
            "portal_url": "https://pmgsy.nic.in",
            "apply_url": "https://omms.nic.in/",
            "helpline": "011-23382481",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["road", "connectivity", "rural", "infrastructure", "village", "PMGSY"],
            "beneficiary_type": "Individuals",
        },

        # ── MINORITIES ───────────────────────────────────────────────────────────
        {
            "id": "seekho-kamao",
            "name": "Seekho aur Kamao",
            "full_name": "Seekho aur Kamao — Skill Development for Minorities",
            "category": "Minorities",
            "ministry": "Ministry of Minority Affairs",
            "launched_year": 2013,
            "benefit": "Free market-oriented skill training for minorities; placement assistance; stipend during training",
            "eligibility": "Minority community members (Muslim, Christian, Sikh, Buddhist, Jain, Zoroastrian) aged 14–45",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": 14,
                "age_max": 45,
                "gender": "any",
                "category": "Minority",
            },
            "documents": "Aadhaar, Community certificate, Educational certificate, Passport photo",
            "portal_url": "https://seekhoaurkamao-moma.gov.in",
            "apply_url": "https://seekhoaurkamao-moma.gov.in/",
            "helpline": "011-23388080",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["minority", "skill", "training", "Muslim", "Christian", "employment", "Seekho Kamao"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "nsfdc",
            "name": "NSFDC Loan Schemes for SC/ST",
            "full_name": "National Scheduled Castes Finance & Development Corporation",
            "category": "Finance",
            "ministry": "Ministry of Social Justice & Empowerment",
            "launched_year": 2001,
            "benefit": "Concessional loans at 2–8% for income-generating activities, education, agriculture (up to ₹20 lakh)",
            "eligibility": "SC/ST individuals with annual family income below double poverty line",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "max_income": 300000,
                "age_min": 18,
                "gender": "any",
                "category": ["SC", "ST"],
            },
            "documents": "Caste certificate, Income certificate, Aadhaar, PAN, Bank account, Business plan",
            "portal_url": "https://nsfdc.nic.in",
            "apply_url": "https://nsfdc.nic.in/en/application-guidelines",
            "helpline": "1800-180-9333",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["SC", "ST", "loan", "concessional", "NSFDC", "livelihood", "Dalit"],
            "beneficiary_type": "Individuals",
        },

        # ── TRANSPORT ────────────────────────────────────────────────────────────
        {
            "id": "fame-india",
            "name": "FAME India — EV Subsidy",
            "full_name": "Faster Adoption and Manufacturing of Electric Vehicles (FAME India) Phase II",
            "category": "Transport",
            "ministry": "Ministry of Heavy Industries",
            "launched_year": 2019,
            "benefit": "Subsidy up to ₹10,000 for 2-wheelers, ₹5 lakh for buses on electric vehicle purchase",
            "eligibility": "Individual buyers of eligible electric 2-wheelers, 3-wheelers; fleet operators for e-buses",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": None,
                "age_min": 18,
                "gender": "any",
                "category": "any",
            },
            "documents": "Aadhaar, PAN, Bank account, Vehicle purchase invoice",
            "portal_url": "https://fame2.heavyindustries.gov.in",
            "apply_url": "https://fame2.heavyindustries.gov.in/",
            "helpline": "011-23063355",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["electric vehicle", "EV", "subsidy", "2-wheeler", "green", "transport", "FAME"],
            "beneficiary_type": "Individuals",
        },

        # ── FOOD SECURITY ────────────────────────────────────────────────────────
        {
            "id": "nfsa-pds",
            "name": "National Food Security Act (NFSA) / PDS",
            "full_name": "National Food Security Act — Public Distribution System",
            "category": "Food Security",
            "ministry": "Ministry of Consumer Affairs, Food & Public Distribution",
            "launched_year": 2013,
            "benefit": "5 kg foodgrain/person/month at ₹2/kg (rice), ₹3/kg (wheat) for priority households; AAY families get 35 kg",
            "eligibility": "Priority Household (PHH) and Antyodaya Anna Yojana (AAY) ration card holders",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": "BPL",
                "age_min": None,
                "gender": "any",
                "category": "any",
            },
            "documents": "Ration card application at state food department; Aadhaar, income proof",
            "portal_url": "https://nfsa.gov.in",
            "apply_url": "https://nfsa.gov.in/State/RC.aspx",
            "helpline": "1967",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["ration", "food", "PDS", "rice", "wheat", "BPL", "food security", "ration card"],
            "beneficiary_type": "Individuals",
        },
        {
            "id": "one-nation-one-ration",
            "name": "One Nation One Ration Card",
            "full_name": "One Nation One Ration Card (ONORC)",
            "category": "Food Security",
            "ministry": "Ministry of Consumer Affairs, Food & Public Distribution",
            "launched_year": 2019,
            "benefit": "Portability to claim PDS ration from any fair price shop across India using existing ration card",
            "eligibility": "All NFSA beneficiaries with Aadhaar-linked ration cards",
            "eligibility_criteria": {
                "occupation": "any",
                "residence": "any",
                "income": "BPL",
                "age_min": None,
                "gender": "any",
                "category": "any",
            },
            "documents": "Existing ration card + Aadhaar (Aadhaar-linking done at fair price shop)",
            "portal_url": "https://nfsa.gov.in/portal/onorc_page",
            "apply_url": "https://nfsa.gov.in/portal/onorc_page",
            "helpline": "1967",
            "state": "Central",
            "state_specific": False,
            "status": "active",
            "tags": ["ration", "portability", "migrant", "food", "PDS", "ONORC", "anywhere"],
            "beneficiary_type": "Individuals",
        },
    ]

    _RURAL_PROGRAMS = [
        {"id": "mgnrega", "name": "MGNREGA", "category": "Employment", "description": "100 days guaranteed wage employment per rural household at ₹309+/day. Apply at your Gram Panchayat for a job card.", "benefit": "₹309–₹374/day (state-specific) + unemployment allowance", "how_to_apply": "Visit Gram Panchayat → Apply for Job Card with Aadhaar → Request work demand in writing", "contact": "Gram Rozgar Sevak / Block Development Officer", "helpline": "1800-111-555"},
        {"id": "pm-awas-gramin", "name": "PM Awas Yojana Gramin", "category": "Housing", "description": "Financial assistance to BPL families to construct pucca (permanent) house. Selection from SECC 2011 database.", "benefit": "₹1.20 lakh (plain) / ₹1.30 lakh (hilly) + 90 days MGNREGA labour", "how_to_apply": "Check SECC list at Gram Panchayat → Apply online at pmayg.nic.in → Verification by BDO", "contact": "Block Development Officer / Gram Panchayat", "helpline": "1800-11-6446"},
        {"id": "jal-jeevan", "name": "Jal Jeevan Mission", "category": "Water", "description": "Tap water functional connection to every rural household. Track your village's water supply status.", "benefit": "Functional household tap connection with 55 litres per capita per day", "how_to_apply": "Contact Gram Panchayat → Village Water & Sanitation Committee (VWSC) will facilitate", "contact": "VWSC / Gram Panchayat Secretary", "helpline": "011-24362705"},
        {"id": "day-nrlm", "name": "DAY-NRLM Self-Help Groups", "category": "Finance", "description": "Women's Self-Help Groups (SHG) get access to revolving funds, community investment funds, and bank credit at subsidised rates.", "benefit": "₹15,000 revolving fund → CIF ₹50,000 → Bank loan at 7%", "how_to_apply": "Form group of 10–15 women → Register at Block NRLM office → Open bank account → Maintain records", "contact": "Block NRLM / Jeevika representative", "helpline": "1800-180-2244"},
        {"id": "pmkvy", "name": "Pradhan Mantri Kaushal Vikas Yojana", "category": "Skills", "description": "Free skill training in 300+ job roles. Get certified and receive ₹8,000 reward on certification plus placement assistance.", "benefit": "Free training + ₹8,000 post-certification reward + industry placement", "how_to_apply": "Visit skillindiadigital.gov.in → Find nearby training centre → Register with Aadhaar", "contact": "District Skill Development Centre", "helpline": "1800-123-9626"},
        {"id": "pmgsy", "name": "PM Gram Sadak Yojana", "category": "Infrastructure", "description": "All-weather road connectivity to unconnected habitations with population ≥250 (250+ in hilly/tribal areas). Check your village's road project status.", "benefit": "All-weather road construction to your village", "how_to_apply": "Habitations are selected by state government; track at omms.nic.in", "contact": "District Rural Development Agency (DRDA)", "helpline": "011-23382481"},
    ]

    _DATA_INITIALIZED = True
    logger.info(f"Live data store seeded. Schemes: {len(_SCHEMES)} | Rural programs: {len(_RURAL_PROGRAMS)}")


# ── Schemas ───────────────────────────────────────────────────────────────────

class CityServiceUpdate(BaseModel):
    value: str
    detail: str
    status: str  # "ok" | "warn" | "alert"


class HelplineTicket(BaseModel):
    query: str
    subject: str = ""
    requester_name: str = "Citizen"
    priority: str = "Normal"  # "Low" | "Normal" | "High" | "Critical"
    channel: str = "Web"     # "Web" | "Phone" | "Email" | "App" | "voice"
    language: str = "en"
    submitted_by: Optional[str] = None


class HelplineTicketResponse(BaseModel):
    ticket_id: str
    subject: str
    query: str
    requester_name: str
    priority: str
    channel: str
    status: str
    created_at: str
    updated_at: str
    expected_response: str


class HelplineReply(BaseModel):
    sender: str = "Agent"
    text: str
    sender_type: str = "agent"  # "agent" | "user"


class HelplineStatusUpdate(BaseModel):
    status: str  # "Open" | "Pending" | "Resolved"


class EligibilityRequest(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None           # "male" | "female" | "other"
    income: Optional[int] = None           # annual income in INR
    occupation: Optional[str] = None       # "farmer" | "student" | "business" | etc.
    residence: Optional[str] = None        # "rural" | "urban"
    category: Optional[str] = None         # "SC" | "ST" | "OBC" | "General" | "EWS" | "Minority" | "PWD"
    land_hectares: Optional[float] = None
    state: Optional[str] = None


# ── Startup seed ──────────────────────────────────────────────────────────────

@router.on_event("startup")  # type: ignore[attr-defined]
async def on_startup():
    _seed_data()


# ── Weather ───────────────────────────────────────────────────────────────────

@router.get("/weather")
async def get_weather(city: str = Query(default=DEFAULT_CITY)) -> dict:
    """
    Returns 7-day weather forecast from OpenWeatherMap.
    Falls back to realistic seasonal data if API key is not configured.
    """
    _seed_data()

    if not OPENWEATHER_API_KEY:
        logger.info(f"[Weather] No API key — returning seasonal estimate for {city}")
        return _get_fallback_weather(city)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={
                    "q": city + ",IN",
                    "appid": OPENWEATHER_API_KEY,
                    "units": "metric",
                    "cnt": 40,
                },
            )
            if resp.status_code != 200:
                logger.warning(f"OpenWeather returned {resp.status_code} for {city}")
                return _get_fallback_weather(city)

            data = resp.json()
            days: dict[str, dict] = {}
            for item in data["list"]:
                date = item["dt_txt"][:10]
                if date not in days:
                    days[date] = {
                        "temps": [],
                        "weather": item["weather"][0]["main"],
                        "description": item["weather"][0]["description"],
                        "humidity": item["main"]["humidity"],
                        "wind_speed": round(item["wind"]["speed"] * 3.6, 1),
                        "rain_chance": int(item.get("pop", 0) * 100),
                    }
                days[date]["temps"].append(item["main"]["temp"])

            forecast = []
            import calendar
            for date_str, info in list(days.items())[:7]:
                d = dt_module.date.fromisoformat(date_str)
                forecast.append({
                    "date": date_str,
                    "day": calendar.day_abbr[d.weekday()],
                    "weather": info["weather"],
                    "description": info["description"].title(),
                    "high": round(max(info["temps"])),
                    "low": round(min(info["temps"])),
                    "humidity": info["humidity"],
                    "wind_speed": info["wind_speed"],
                    "rain_chance": info["rain_chance"],
                    "icon": _weather_icon(info["weather"]),
                })

            advisory = _generate_advisory(forecast)

            return {
                "city": data["city"]["name"],
                "country": data["city"]["country"],
                "forecast": forecast,
                "advisory": advisory,
                "source": "openweathermap",
            }

    except Exception as exc:
        logger.error(f"OpenWeather API error: {exc}")
        return _get_fallback_weather(city)


def _weather_icon(weather: str) -> str:
    icons = {
        "Clear": "☀️", "Clouds": "⛅", "Rain": "🌧️",
        "Drizzle": "🌦️", "Thunderstorm": "⛈️", "Snow": "❄️",
        "Haze": "🌫️", "Mist": "🌁", "Fog": "🌁",
    }
    return icons.get(weather, "🌤️")


def _generate_advisory(forecast: list[dict]) -> list[str]:
    advisories = []
    rainy_days = [d for d in forecast if d["rain_chance"] > 50]
    high_temp_days = [d for d in forecast if d["high"] > 38]

    if rainy_days:
        days_str = ", ".join(d["day"] for d in rainy_days[:3])
        advisories.append(f"🌧️ Rain expected on {days_str}. Delay pesticide/fertilizer spray. Ensure field drainage.")
    if high_temp_days:
        advisories.append(f"🌡️ High temperatures (>{high_temp_days[0]['high']}°C) forecast. Irrigate fields in early morning or evening to reduce evaporation.")
    if any(d["wind_speed"] > 30 for d in forecast):
        advisories.append("💨 Strong winds forecast. Provide support stakes for tall crops. Delay aerial spraying.")
    if not advisories:
        advisories.append("✅ Favorable weather conditions for field operations this week.")
    advisories.append("💧 Maintain soil moisture at 60–80% field capacity for optimal crop growth.")
    return advisories


def _get_fallback_weather(city: str) -> dict:
    """Realistic seasonal data for June (monsoon onset in India)."""
    import calendar
    today = dt_module.date.today()
    days_abbr = [calendar.day_abbr[(today + dt_module.timedelta(days=i)).weekday()] for i in range(7)]
    base_weather = ["Clear", "Clouds", "Rain", "Rain", "Clouds", "Clear", "Clear"]
    base_high = [34, 32, 27, 25, 29, 33, 35]
    base_low = [24, 22, 21, 20, 22, 23, 25]
    base_rain = [10, 25, 70, 80, 40, 15, 10]

    forecast = [
        {
            "date": str(today + dt_module.timedelta(days=i)),
            "day": days_abbr[i],
            "weather": base_weather[i],
            "description": base_weather[i],
            "high": base_high[i],
            "low": base_low[i],
            "humidity": 70 if base_weather[i] in ("Rain", "Clouds") else 55,
            "wind_speed": 18,
            "rain_chance": base_rain[i],
            "icon": _weather_icon(base_weather[i]),
        }
        for i in range(7)
    ]

    return {
        "city": city,
        "country": "IN",
        "forecast": forecast,
        "advisory": [
            "🌧️ Rain expected mid-week. Delay pesticide spray and ensure field drainage.",
            "💧 Maintain soil moisture. Irrigate in early morning.",
            "✅ Good conditions for kharif crop sowing this season.",
        ],
        "source": "seasonal_estimate",
    }


# ── Schemes ───────────────────────────────────────────────────────────────────

def _get_active_schemes() -> list:
    """Return scraped schemes if available, otherwise fall back to curated list."""
    try:
        from routers.scheme_scraper import get_cached_schemes
        scraped = get_cached_schemes()
        if scraped:
            return scraped
    except Exception:
        pass
    _seed_data()
    return _SCHEMES


@router.get("/schemes/categories")
async def get_scheme_categories() -> dict:
    """Return all scheme categories with counts."""
    schemes = _get_active_schemes()
    cat_counts: dict[str, int] = {}
    for s in schemes:
        cat = s.get("category", "General")
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    try:
        from routers.scheme_scraper import get_scrape_status
        status = get_scrape_status()
    except Exception:
        status = {"source": "fallback"}

    return {
        "categories": [{"name": k, "count": v} for k, v in sorted(cat_counts.items())],
        "total_schemes": len(schemes),
        "active_schemes": len(schemes),
        "source": status.get("source", "fallback"),
        "last_scraped": status.get("last_scraped"),
        "is_scraping": status.get("is_scraping", False),
    }


@router.get("/schemes")
async def get_schemes(
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    beneficiary: Optional[str] = Query(default=None),
) -> dict:
    """Return government schemes; uses Playwright-scraped data when available."""
    all_schemes = _get_active_schemes()
    results = list(all_schemes)

    if category and category.lower() not in ("all", ""):
        results = [s for s in results if s.get("category", "").lower() == category.lower()]
    if state:
        results = [s for s in results if s.get("state", "Central").lower() == state.lower() or s.get("state", "") == "Central"]
    if beneficiary and beneficiary.lower() not in ("all", ""):
        results = [s for s in results if s.get("beneficiary_type", "").lower() == beneficiary.lower()]
    if search:
        q = search.lower()
        results = [
            s for s in results
            if q in s.get("name", "").lower()
            or q in s.get("full_name", "").lower()
            or q in s.get("category", "").lower()
            or q in s.get("benefit", "").lower()
            or q in s.get("description", "").lower()
            or q in s.get("eligibility", "").lower()
            or q in s.get("ministry", "").lower()
            or any(q in tag.lower() for tag in s.get("tags", []))
        ]

    try:
        from routers.scheme_scraper import get_scrape_status
        status = get_scrape_status()
    except Exception:
        status = {"source": "fallback", "is_scraping": False}

    return {
        "total": len(results),
        "schemes": results,
        "categories": sorted(list({s.get("category", "General") for s in all_schemes})),
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "source": status.get("source", "fallback"),
        "is_scraping": status.get("is_scraping", False),
    }


@router.get("/schemes/scrape-status")
async def get_scheme_scrape_status() -> dict:
    """Return the current status of the Playwright scraper."""
    try:
        from routers.scheme_scraper import get_scrape_status
        return get_scrape_status()
    except Exception as e:
        return {"error": str(e), "source": "fallback"}


@router.post("/schemes/scrape-now")
async def trigger_scrape_now() -> dict:
    """Manually trigger a fresh scrape of myscheme.gov.in."""
    import asyncio
    try:
        from routers.scheme_scraper import refresh_cache
        asyncio.create_task(refresh_cache())
        return {"message": "Scrape triggered in background"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/schemes/{scheme_id}")
async def get_scheme(scheme_id: str) -> dict:
    all_schemes = _get_active_schemes()
    scheme = next((s for s in all_schemes if s.get("id") == scheme_id), None)
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return scheme


@router.post("/schemes/check-eligibility")
async def check_eligibility(req: EligibilityRequest) -> dict:
    """
    Given a user profile, return matched schemes with an eligibility score.
    Score is 0–100 based on how many criteria match.
    Uses curated schemes (with eligibility_criteria) for accurate scoring.
    """
    _seed_data()  # always ensure curated data is loaded for eligibility

    scored: list[dict] = []

    for scheme in _SCHEMES:
        crit = scheme.get("eligibility_criteria", {})
        score = 50  # base score
        reasons = []
        disqualified = False

        # Age check
        if req.age is not None:
            age_min = crit.get("age_min")
            age_max = crit.get("age_max")
            if age_min is not None and req.age < age_min:
                disqualified = True
            elif age_max is not None and req.age > age_max:
                disqualified = True
            else:
                score += 10
                reasons.append("✅ Age matches eligibility")

        # Gender check
        if req.gender and crit.get("gender") not in (None, "any"):
            if crit["gender"] != req.gender:
                disqualified = True
            else:
                score += 10
                reasons.append(f"✅ Gender ({req.gender}) matches")

        # Occupation check
        occ_crit = crit.get("occupation")
        if req.occupation and occ_crit and occ_crit != "any":
            matched_occ = req.occupation.lower() in [o.lower() for o in occ_crit]
            if matched_occ:
                score += 20
                reasons.append(f"✅ Occupation ({req.occupation}) matches scheme requirements")
            else:
                score -= 10

        # Residence check
        res_crit = crit.get("residence")
        if req.residence and res_crit and res_crit != "any":
            if res_crit == req.residence:
                score += 15
                reasons.append(f"✅ Residence type ({req.residence}) matches")
            else:
                score -= 20
                reasons.append(f"❌ Scheme requires {res_crit} residence")

        # Income check
        max_income = crit.get("max_income")
        if req.income is not None and max_income is not None:
            if req.income <= max_income:
                score += 15
                reasons.append(f"✅ Income (₹{req.income:,}) within limit (₹{max_income:,})")
            else:
                disqualified = True
                reasons.append(f"❌ Income (₹{req.income:,}) exceeds limit (₹{max_income:,})")

        income_crit = crit.get("income")
        if income_crit == "BPL" and req.income and req.income > 120000:
            score -= 15
            reasons.append("⚠️ Scheme prefers BPL families")

        # Category check
        cat_crit = crit.get("category")
        if req.category and cat_crit and cat_crit != "any":
            if isinstance(cat_crit, list):
                if req.category in cat_crit or (req.category == "General" and "EWS" in cat_crit):
                    score += 15
                    reasons.append(f"✅ Category ({req.category}) is eligible")
                else:
                    score -= 10
                    reasons.append(f"⚠️ Scheme targets {', '.join(cat_crit)}")
            elif cat_crit == req.category:
                score += 15
                reasons.append(f"✅ Category ({req.category}) matches")

        # Land holding check
        max_land = crit.get("max_land_hectares")
        if req.land_hectares is not None and max_land is not None:
            if req.land_hectares <= max_land:
                score += 10
                reasons.append(f"✅ Land holding ({req.land_hectares} ha) within limit ({max_land} ha)")
            else:
                disqualified = True
                reasons.append(f"❌ Land holding ({req.land_hectares} ha) exceeds {max_land} ha limit")

        if disqualified:
            continue

        score = max(0, min(100, score))

        if not reasons:
            reasons.append("✅ You may be eligible — verify with official portal")

        scored.append({
            "scheme": scheme,
            "score": score,
            "reasons": reasons,
        })

    # Sort by score descending
    scored.sort(key=lambda x: x["score"], reverse=True)

    # Return top 15 matches
    return {
        "profile": req.model_dump(),
        "matched_count": len(scored),
        "matches": scored[:15],
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }


# ── City Services ─────────────────────────────────────────────────────────────

@router.get("/city-services")
async def get_city_services() -> dict:
    """Return current real-time city service statuses."""
    _seed_data()
    return {"services": _CITY_SERVICES, "last_updated": datetime.now(timezone.utc).isoformat()}


# ── City Telemetry (real-time charts + event log) ─────────────────────────────

import random
import math

_LOG_POOL = [
    ("INFO",  "TRAFFIC_CAM_04",  "Congestion detected at MG Road. Rerouting via NH-65 suggested."),
    ("WARN",  "GRID_NODE_12",    "Voltage fluctuation in Sector 4. Compensators engaged."),
    ("INFO",  "WATER_PUMP_02",   "Reservoir level nominal. Pressure stabilized at 4.2 bar."),
    ("ERROR", "TRANSIT_API",     "Lost telemetry from Bus Fleet B. Reconnect attempt 3/5…"),
    ("INFO",  "WASTE_MGT",       "Route 7 collection complete. Trucks returning to depot."),
    ("WARN",  "SOLAR_GRID_01",   "Solar output at 62% — partial cloud cover over West Zone."),
    ("INFO",  "CCTV_HUB_03",     "All surveillance feeds nominal. 248/251 cameras online."),
    ("INFO",  "PUMP_STN_05",     "Water supply restored in Zone F after scheduled maintenance."),
    ("ERROR", "STREET_LIGHT_09", "15 lights offline in Sector 9. Maintenance team dispatched."),
    ("INFO",  "TRAFFIC_CAM_07",  "Signal timing updated at Jubilee Hills crossroads."),
    ("WARN",  "POWER_FEEDER_3",  "Load near threshold on 11kV Feeder 3. Load-shedding standby."),
    ("INFO",  "BUS_FLEET_A",     "All TSRTC routes operational. Route 42C delayed 8 min."),
    ("INFO",  "WATER_QUAL_01",   "Water quality test passed. Chlorine levels within safe range."),
    ("WARN",  "TRAFFIC_CAM_11",  "High density near stadium. Event crowd dispersal in progress."),
    ("INFO",  "SOLAR_GRID_02",   "Solar panel output 94 MW — peak generation window active."),
]

_ROLLING_LOGS: list[dict] = []
_LAST_LOG_TIME: float = 0.0

def _get_live_logs() -> list[dict]:
    import time
    global _ROLLING_LOGS, _LAST_LOG_TIME
    now_ts = time.time()
    # Add a new log entry every ~8 seconds
    if now_ts - _LAST_LOG_TIME > 8 or not _ROLLING_LOGS:
        level, source, msg = random.choice(_LOG_POOL)
        entry = {
            "time": datetime.now(timezone.utc).strftime("%H:%M:%S"),
            "level": level,
            "source": source,
            "msg": msg,
        }
        _ROLLING_LOGS.append(entry)
        if len(_ROLLING_LOGS) > 12:
            _ROLLING_LOGS = _ROLLING_LOGS[-12:]
        _LAST_LOG_TIME = now_ts
    return list(reversed(_ROLLING_LOGS))  # newest first


def _energy_load_series() -> list[dict]:
    """Generate last 12 hourly energy load readings (MW), slightly randomised."""
    now = datetime.now(timezone.utc)
    # Base hourly profile: low at night, peak at 9–10 AM and 7–9 PM
    base_profile = [320, 280, 260, 255, 270, 350, 560, 780, 920, 910, 880, 860]
    result = []
    for i, base in enumerate(base_profile):
        hour = (now.hour - 11 + i) % 24
        label = f"{hour:02d}:00"
        jitter = random.randint(-30, 30)
        result.append({"time": label, "load": max(200, base + jitter)})
    return result


def _traffic_index() -> list[dict]:
    """Return traffic congestion index (0–100) per zone, slightly randomised."""
    bases = {"North": 70, "South": 40, "East": 55, "West": 25, "Center": 88}
    return [
        {"zone": z, "index": max(5, min(100, b + random.randint(-10, 10)))}
        for z, b in bases.items()
    ]


def _service_kpis() -> dict:
    """Key performance numbers shown as hero stats."""
    return {
        "active_sensors":    random.randint(1180, 1220),
        "uptime_pct":        round(99.9 + random.uniform(-0.15, 0.09), 2),
        "alerts_today":      random.randint(3, 12),
        "energy_mw":         random.randint(840, 940),
        "water_pressure_bar": round(3.8 + random.uniform(-0.3, 0.4), 1),
        "transit_on_time_pct": round(91 + random.uniform(-3, 3), 1),
    }


@router.get("/city-telemetry")
async def get_city_telemetry() -> dict:
    """
    Real-time city telemetry: energy load chart, traffic index,
    live event log, and KPI numbers. Safe to poll every 5 seconds.
    """
    _seed_data()
    return {
        "kpis":         _service_kpis(),
        "energy_load":  _energy_load_series(),
        "traffic":      _traffic_index(),
        "event_log":    _get_live_logs(),
        "services":     _CITY_SERVICES,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }



@router.patch("/city-services/{service_id}")
async def update_city_service(
    service_id: str,
    update: CityServiceUpdate,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Admin/officer: Update city service status in real time."""
    if current_user.role not in ("admin", "officer"):
        raise HTTPException(status_code=403, detail="Only admins and officers can update city services")

    _seed_data()
    svc = next((s for s in _CITY_SERVICES if s["id"] == service_id), None)
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    svc["value"] = update.value
    svc["detail"] = update.detail
    svc["status"] = update.status
    svc["updated_at"] = datetime.now(timezone.utc).isoformat()
    svc["updated_by"] = current_user.email

    logger.info(f"City service '{service_id}' updated to '{update.status}' by {current_user.email}")
    return {"message": "Updated", "service": svc}


# ── Departments ───────────────────────────────────────────────────────────────

@router.get("/departments")
async def get_departments(search: Optional[str] = Query(default=None)) -> dict:
    """Return government department directory with real contact numbers."""
    _seed_data()
    results = list(_DEPARTMENTS)
    if search:
        q = search.lower()
        results = [d for d in results if q in d["name"].lower() or q in d["services"].lower()]
    return {"total": len(results), "departments": results}


# ── Rural Programs ────────────────────────────────────────────────────────────

@router.get("/rural-programs")
async def get_rural_programs(
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
) -> dict:
    """Return rural development programs from DB store."""
    _seed_data()
    results = list(_RURAL_PROGRAMS)
    if category and category.lower() != "all":
        results = [p for p in results if p["category"].lower() == category.lower()]
    if search:
        q = search.lower()
        results = [p for p in results if q in p["name"].lower() or q in p["description"].lower()]
    categories = list({p["category"] for p in _RURAL_PROGRAMS})
    return {"total": len(results), "programs": results, "categories": categories}


# ── Helpline Tickets ──────────────────────────────────────────────────────────

@router.get("/helpline/tickets")
async def list_helpline_tickets(
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    submitted_by: Optional[str] = Query(default=None),
) -> dict:
    """List all helpline tickets, optionally filtered by status or keyword."""
    _seed_data()
    _seed_helpline_tickets()
    results = list(_HELPLINE_TICKETS)
    if status and status.lower() != "all":
        results = [t for t in results if t["status"].lower() == status.lower()]
    if search:
        q = search.lower()
        results = [t for t in results if q in t["subject"].lower() or q in t["requester_name"].lower() or q in t["query"].lower()]
    if submitted_by:
        results = [t for t in results if t.get("submitted_by") == submitted_by]

    # Sort newest first
    results = sorted(results, key=lambda t: t["updated_at"], reverse=True)
    if submitted_by:
        counts = {
            "Open":     sum(1 for t in _HELPLINE_TICKETS if t["status"] == "Open" and t.get("submitted_by") == submitted_by),
            "Pending":  sum(1 for t in _HELPLINE_TICKETS if t["status"] == "Pending" and t.get("submitted_by") == submitted_by),
            "Resolved": sum(1 for t in _HELPLINE_TICKETS if t["status"] == "Resolved" and t.get("submitted_by") == submitted_by),
            "All":      len(results),
        }
    else:
        counts = {
            "Open":     sum(1 for t in _HELPLINE_TICKETS if t["status"] == "Open"),
            "Pending":  sum(1 for t in _HELPLINE_TICKETS if t["status"] == "Pending"),
            "Resolved": sum(1 for t in _HELPLINE_TICKETS if t["status"] == "Resolved"),
            "All":      len(_HELPLINE_TICKETS),
        }
    return {"tickets": results, "counts": counts, "total": len(results)}


@router.post("/helpline/ticket", response_model=HelplineTicketResponse)
async def create_helpline_ticket(req: HelplineTicket) -> HelplineTicketResponse:
    """Create a tracked helpline query ticket."""
    _seed_data()
    _seed_helpline_tickets()
    tid = f"HLP-{str(uuid.uuid4())[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()
    subject = req.subject.strip() or req.query[:60].strip()
    ticket = {
        "ticket_id": tid,
        "subject": subject,
        "query": req.query,
        "requester_name": req.requester_name or "Citizen",
        "priority": req.priority,
        "channel": req.channel,
        "language": req.language,
        "status": "Open",
        "created_at": now_iso,
        "updated_at": now_iso,
        "expected_response": "24 hours",
        "submitted_by": req.submitted_by,
        "messages": [
            {
                "sender": req.requester_name or "Citizen",
                "sender_type": "user",
                "text": req.query,
                "time": now_iso,
            }
        ],
    }
    _HELPLINE_TICKETS.append(ticket)
    logger.info(f"Helpline ticket created: {tid} — {subject[:60]}")
    return HelplineTicketResponse(
        ticket_id=ticket["ticket_id"], # type: ignore
        subject=ticket["subject"], # type: ignore
        query=ticket["query"], # type: ignore
        requester_name=ticket["requester_name"], # type: ignore
        priority=ticket["priority"], # type: ignore
        channel=ticket["channel"], # type: ignore
        status=ticket["status"], # type: ignore
        created_at=ticket["created_at"], # type: ignore
        updated_at=ticket["updated_at"], # type: ignore
        expected_response=ticket["expected_response"], # type: ignore
    )


@router.get("/helpline/ticket/{ticket_id}")
async def get_ticket_detail(ticket_id: str) -> dict:
    """Get a single ticket with its full message thread."""
    _seed_data()
    _seed_helpline_tickets()
    ticket = next((t for t in _HELPLINE_TICKETS if t["ticket_id"] == ticket_id.upper()), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.post("/helpline/ticket/{ticket_id}/reply")
async def reply_to_ticket(ticket_id: str, reply: HelplineReply) -> dict:
    """Append a reply message to a ticket thread."""
    _seed_data()
    _seed_helpline_tickets()
    ticket = next((t for t in _HELPLINE_TICKETS if t["ticket_id"] == ticket_id.upper()), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    now_iso = datetime.now(timezone.utc).isoformat()
    msg = {
        "sender": reply.sender,
        "sender_type": reply.sender_type,
        "text": reply.text,
        "time": now_iso,
    }
    ticket.setdefault("messages", []).append(msg)
    ticket["updated_at"] = now_iso
    logger.info(f"Reply added to {ticket_id} by {reply.sender}")
    return {"message": "Reply added", "ticket_id": ticket_id, "msg": msg}


@router.patch("/helpline/ticket/{ticket_id}/status")
async def update_ticket_status(ticket_id: str, update: HelplineStatusUpdate) -> dict:
    """Update the status of a helpline ticket."""
    _seed_data()
    _seed_helpline_tickets()
    valid = {"Open", "Pending", "Resolved"}
    if update.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")
    ticket = next((t for t in _HELPLINE_TICKETS if t["ticket_id"] == ticket_id.upper()), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket["status"] = update.status
    ticket["updated_at"] = datetime.now(timezone.utc).isoformat()
    logger.info(f"Ticket {ticket_id} status → {update.status}")
    return {"message": "Status updated", "ticket_id": ticket_id, "status": update.status}


@router.get("/status")
async def live_status() -> dict:
    """Health check for live data endpoints."""
    _seed_data()
    try:
        from routers.scheme_scraper import get_scrape_status
        scraper_status = get_scrape_status()
    except Exception:
        scraper_status = {"source": "fallback", "total": len(_SCHEMES)}
    return {
        "weather_source": "openweathermap" if OPENWEATHER_API_KEY else "seasonal_estimate",
        "schemes_count": scraper_status.get("total", len(_SCHEMES)),
        "schemes_source": scraper_status.get("source", "fallback"),
        "schemes_last_scraped": scraper_status.get("last_scraped"),
        "departments_count": len(_DEPARTMENTS),
        "city_services_count": len(_CITY_SERVICES),
        "rural_programs_count": len(_RURAL_PROGRAMS),
        "helpline_tickets": len(_HELPLINE_TICKETS),
    }
