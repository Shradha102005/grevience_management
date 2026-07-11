import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey, JSON, Enum as SAEnum, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base
import enum


# ── Enums ─────────────────────────────────────────────────────────────────────

class DisasterType(str, enum.Enum):
    flood = "flood"
    cyclone = "cyclone"
    earthquake = "earthquake"
    fire = "fire"
    landslide = "landslide"
    drought = "drought"
    other = "other"


class SeverityLevel(str, enum.Enum):
    critical = "critical"
    high = "high"
    watch = "watch"


class AlertStatus(str, enum.Enum):
    active = "active"
    resolved = "resolved"
    cancelled = "cancelled"


class DeliveryStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    delivered = "delivered"
    failed = "failed"
    mock = "mock"


# ── Models ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="citizen")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Disaster alert fields
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    zone: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # Smart City preference
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    created_alerts: Mapped[list["DisasterAlert"]] = relationship(
        "DisasterAlert", back_populates="creator", foreign_keys="DisasterAlert.created_by"
    )
    alert_deliveries: Mapped[list["AlertRecipient"]] = relationship(
        "AlertRecipient", back_populates="user"
    )


class DisasterAlert(Base):
    __tablename__ = "disaster_alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    disaster_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="watch")
    affected_zones: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    broadcast_sms: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    broadcast_call: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    creator: Mapped["User"] = relationship(
        "User", back_populates="created_alerts", foreign_keys=[created_by]
    )
    recipients: Mapped[list["AlertRecipient"]] = relationship(
        "AlertRecipient", back_populates="alert", cascade="all, delete-orphan"
    )


class AlertRecipient(Base):
    __tablename__ = "alert_recipients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    alert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("disaster_alerts.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    sms_status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    call_status: Mapped[str] = mapped_column(String(20), nullable=True)
    sms_sid: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    call_sid: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    alert: Mapped["DisasterAlert"] = relationship("DisasterAlert", back_populates="recipients")
    user: Mapped["User"] = relationship("User", back_populates="alert_deliveries")


# ── Election Campaign Models ──────────────────────────────────────────────────

class CampaignAudience(str, enum.Enum):
    youth = "youth"
    farmers = "farmers"
    urban = "urban"
    senior = "senior"
    all_voters = "all_voters"


class CampaignSession(Base):
    __tablename__ = "campaign_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_name: Mapped[str] = mapped_column(String(200), nullable=False)
    theme: Mapped[str] = mapped_column(String(300), nullable=False)
    audience: Mapped[str] = mapped_column(String(50), nullable=False)
    key_points: Mapped[str] = mapped_column(Text, nullable=False)  # newline-separated
    generated_speech: Mapped[str] = mapped_column(Text, nullable=False)
    is_mock_ai: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    deliveries: Mapped[list["CampaignDelivery"]] = relationship(
        "CampaignDelivery", back_populates="session", cascade="all, delete-orphan"
    )


class CampaignDelivery(Base):
    __tablename__ = "campaign_deliveries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campaign_sessions.id"), nullable=False
    )
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    sms_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # sent/mock/failed/None
    sms_sid: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    call_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    call_sid: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    session: Mapped["CampaignSession"] = relationship("CampaignSession", back_populates="deliveries")


# ── Municipal Service Complaint Models ───────────────────────────────────────

CATEGORY_DEPT_MAP: dict[str, str] = {
    "Road Damage": "Public Works",
    "Street Lights": "Electrical",
    "Garbage": "Sanitation",
    "Water Leakage": "Water Board",
    "Drainage": "Public Works",
    "Traffic Signals": "Traffic",
    "Public Safety": "Police",
    "Parks": "Horticulture",
    "Other": "General",
}


class MunicipalComplaint(Base):
    __tablename__ = "municipal_complaints"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    complaint_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="Submitted")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="Medium")
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    submitted_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    officer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    submitter: Mapped["User"] = relationship("User", foreign_keys=[submitted_by])
    assigned_officer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_to])
    status_history: Mapped[list["ComplaintStatusHistory"]] = relationship(
        "ComplaintStatusHistory", back_populates="complaint", cascade="all, delete-orphan",
        order_by="ComplaintStatusHistory.changed_at"
    )


class ComplaintStatusHistory(Base):
    __tablename__ = "complaint_status_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    complaint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("municipal_complaints.id"), nullable=False
    )
    old_status: Mapped[str] = mapped_column(String(30), nullable=False)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    changed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    complaint: Mapped["MunicipalComplaint"] = relationship("MunicipalComplaint", back_populates="status_history")
    changed_by_user: Mapped["User"] = relationship("User", foreign_keys=[changed_by])


# ── Government Schemes ────────────────────────────────────────────────────────

class Scheme(Base):
    """
    A government welfare scheme scraped from myscheme.gov.in.
    Populated by the seed_schemes.py script; served read-only via the API.
    """
    __tablename__ = "schemes"

    id: Mapped[str] = mapped_column(String(120), primary_key=True)  # slug e.g. "pmsby"
    name: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    ministry: Mapped[Optional[str]] = mapped_column(String(256), nullable=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)     # list[str]
    category: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    apply_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    source: Mapped[str] = mapped_column(String(64), default="myscheme.gov.in")
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


# ── Helpline Ticket ────────────────────────────────────────────────────────────

class HelplineTicket(Base):
    """Persisted support ticket raised via the AI Helpline bot or directly."""
    __tablename__ = "helpline_tickets"

    ticket_id:       Mapped[str]            = mapped_column(String(30),  primary_key=True)
    subject:         Mapped[str]            = mapped_column(String(255), nullable=False)
    query:           Mapped[str]            = mapped_column(Text,        nullable=False)
    requester_name:  Mapped[str]            = mapped_column(String(150), nullable=False, default="Citizen")
    priority:        Mapped[str]            = mapped_column(String(30),  nullable=False, default="Normal")
    channel:         Mapped[str]            = mapped_column(String(30),  nullable=False, default="Web")
    language:        Mapped[str]            = mapped_column(String(10),  nullable=False, default="en")
    status:          Mapped[str]            = mapped_column(String(30),  nullable=False, default="Open")
    expected_response: Mapped[str]          = mapped_column(String(50),  nullable=False, default="24 hours")
    submitted_by:    Mapped[Optional[str]]  = mapped_column(String(40),  nullable=True)   # user UUID as str
    messages:        Mapped[list]           = mapped_column(JSON,        nullable=False, default=list)
    created_at:      Mapped[datetime]       = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at:      Mapped[datetime]       = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )


# ── Smart City Models ─────────────────────────────────────────────────────────

class CityEvent(Base):
    """City event / public announcement (marathon, road closure, festival, etc.)"""
    __tablename__ = "city_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(60), nullable=False)  # marathon/festival/road_closure/exhibition/announcement
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    event_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")  # draft/published/archived
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    published_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )

    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    publisher: Mapped[Optional["User"]] = relationship("User", foreign_keys=[published_by])


class NearbyService(Base):
    """Admin-managed nearby essential services (hospitals, police, ATMs, EV charging, etc.)"""
    __tablename__ = "nearby_services"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    service_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    # hospital/police/fire/atm/toilet/ev_charging/pharmacy
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    added_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    adder: Mapped["User"] = relationship("User", foreign_keys=[added_by])


class ParkingLocation(Base):
    """City parking spots with live occupancy managed by officers/admin."""
    __tablename__ = "parking_locations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    lat: Mapped[Optional[float]] = mapped_column(nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(nullable=True)
    total_slots: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    available_slots: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    parking_type: Mapped[str] = mapped_column(String(30), nullable=False, default="open")  # open/covered/multi-level
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    rate_per_hour: Mapped[Optional[float]] = mapped_column(nullable=True)  # INR
    last_updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc), nullable=False
    )

    updater: Mapped[Optional["User"]] = relationship("User", foreign_keys=[last_updated_by])
