import uuid
from datetime import datetime
from typing import Literal, Optional, List
from pydantic import BaseModel, EmailStr, field_validator


RoleType = Literal["citizen", "officer", "admin"]
SeverityType = Literal["critical", "high", "watch"]
DisasterTypeEnum = Literal["flood", "cyclone", "earthquake", "fire", "landslide", "drought", "other"]
AlertStatusType = Literal["active", "resolved", "cancelled"]


# ── Request Schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: RoleType = "citizen"

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── Response Schemas ─────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    is_active: bool
    phone_number: Optional[str] = None
    zone: Optional[str] = None
    city: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UpdateProfileRequest(BaseModel):
    """Partial update for the logged-in user's profile."""
    city: Optional[str] = None
    zone: Optional[str] = None
    phone_number: Optional[str] = None


class MessageResponse(BaseModel):
    message: str


# ── Disaster Alert Schemas ────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    title: str
    description: str
    disaster_type: DisasterTypeEnum
    severity: SeverityType = "watch"
    affected_zones: List[str]
    broadcast_sms: bool = True
    broadcast_call: bool = False

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be empty")
        return v.strip()

    @field_validator("affected_zones")
    @classmethod
    def zones_not_empty(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("At least one affected zone is required")
        return v


class AlertRecipientResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    phone_number: str
    sms_status: str
    call_status: Optional[str] = None
    acknowledged: bool
    delivered_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AlertResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    disaster_type: str
    severity: str
    affected_zones: List[str]
    status: str
    broadcast_sms: bool
    broadcast_call: bool
    created_by: uuid.UUID
    created_at: datetime
    resolved_at: Optional[datetime] = None
    recipients_count: int = 0
    sms_sent: int = 0
    call_sent: int = 0
    acknowledged_count: int = 0
    creator_name: Optional[str] = None

    model_config = {"from_attributes": True}


class AlertAcknowledge(BaseModel):
    alert_id: uuid.UUID


class PhoneRegisterRequest(BaseModel):
    phone_number: str
    zone: Optional[str] = None

    @field_validator("phone_number")
    @classmethod
    def phone_valid(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("+"):
            raise ValueError("Phone number must be in E.164 format (e.g. +919876543210)")
        if len(v) < 10 or len(v) > 16:
            raise ValueError("Invalid phone number length")
        return v


class AlertStats(BaseModel):
    total_alerts: int
    active_alerts: int
    total_sms_sent: int
    total_calls_made: int
    total_citizens_reached: int
    critical_count: int
    high_count: int
    watch_count: int


# ── Election Campaign Schemas ─────────────────────────────────────────────

AudienceType = Literal["youth", "farmers", "urban", "senior", "all_voters"]


class SpeechGenerateRequest(BaseModel):
    candidate_name: str
    theme: str
    audience: AudienceType
    key_points: str  # newline-separated bullet points

    @field_validator("candidate_name", "theme")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Field cannot be empty")
        return v.strip()

    @field_validator("key_points")
    @classmethod
    def points_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Please provide at least one key point")
        return v.strip()


class SpeechGenerateResponse(BaseModel):
    session_id: uuid.UUID
    generated_speech: str
    candidate_name: str
    theme: str
    audience: str
    is_mock_ai: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class OutreachPhoneEntry(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def phone_valid(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("+"):
            raise ValueError("Phone must be in E.164 format, e.g. +919876543210")
        return v


class CampaignOutreachRequest(BaseModel):
    session_id: uuid.UUID
    phones: List[str]  # E.164 format
    send_sms: bool = True
    send_call: bool = False

    @field_validator("phones")
    @classmethod
    def phones_not_empty(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("Please provide at least one phone number")
        cleaned = [p.strip() for p in v if p.strip()]
        for p in cleaned:
            if not p.startswith("+"):
                raise ValueError(f"Phone {p!r} must be in E.164 format")
        return cleaned


class CampaignDeliveryResult(BaseModel):
    phone: str
    sms_status: Optional[str] = None
    call_status: Optional[str] = None


class CampaignOutreachResponse(BaseModel):
    session_id: uuid.UUID
    total_phones: int
    results: List[CampaignDeliveryResult]


class CampaignSessionResponse(BaseModel):
    id: uuid.UUID
    candidate_name: str
    theme: str
    audience: str
    key_points: str
    generated_speech: str
    is_mock_ai: bool
    created_by: uuid.UUID
    created_at: datetime
    creator_name: Optional[str] = None
    total_reached: int = 0
    sms_sent: int = 0
    calls_made: int = 0

    model_config = {"from_attributes": True}


# ── Municipal Service Complaint Schemas ───────────────────────────────────────

MUNICIPAL_CATEGORIES = [
    "Road Damage",
    "Street Lights",
    "Garbage",
    "Water Leakage",
    "Drainage",
    "Traffic Signals",
    "Public Safety",
    "Parks",
    "Other",
]

COMPLAINT_STATUSES = [
    "Submitted",
    "Under Review",
    "Assigned",
    "In Progress",
    "Resolved",
    "Closed",
]

COMPLAINT_PRIORITIES = ["Low", "Medium", "High"]


class ComplaintCreate(BaseModel):
    title: str
    description: str
    category: str
    location: str

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be empty")
        return v.strip()

    @field_validator("description")
    @classmethod
    def desc_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Description cannot be empty")
        return v.strip()

    @field_validator("location")
    @classmethod
    def loc_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Location cannot be empty")
        return v.strip()

    @field_validator("category")
    @classmethod
    def category_valid(cls, v: str) -> str:
        if v not in MUNICIPAL_CATEGORIES:
            raise ValueError(f"Invalid category: {v}")
        return v


class ComplaintStatusUpdate(BaseModel):
    new_status: str
    note: Optional[str] = None
    priority: Optional[str] = None
    progress: Optional[int] = None
    assigned_to: Optional[uuid.UUID] = None

    @field_validator("new_status")
    @classmethod
    def status_valid(cls, v: str) -> str:
        if v not in COMPLAINT_STATUSES:
            raise ValueError(f"Invalid status: {v}")
        return v

    @field_validator("progress")
    @classmethod
    def progress_range(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (0 <= v <= 100):
            raise ValueError("Progress must be between 0 and 100")
        return v


class ComplaintHistoryEntry(BaseModel):
    old_status: str
    new_status: str
    note: Optional[str] = None
    changed_by_name: Optional[str] = None
    changed_at: datetime

    model_config = {"from_attributes": True}


class ComplaintResponse(BaseModel):
    id: uuid.UUID
    complaint_number: str
    title: str
    description: str
    category: str
    location: str
    department: str
    status: str
    priority: str
    progress: int
    submitted_by: uuid.UUID
    submitter_name: Optional[str] = None
    assigned_to: Optional[uuid.UUID] = None
    assigned_officer_name: Optional[str] = None
    officer_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    history: List[ComplaintHistoryEntry] = []

    model_config = {"from_attributes": True}


class ComplaintPublicResponse(BaseModel):
    """Anonymised version for the public feed — no PII."""
    id: uuid.UUID
    complaint_number: str
    title: str
    category: str
    location: str
    department: str
    status: str
    priority: str
    progress: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ComplaintStats(BaseModel):
    total: int
    submitted: int
    under_review: int
    assigned: int
    in_progress: int
    resolved: int
    closed: int
    by_category: dict
    resolution_rate: float
    avg_resolution_hours: Optional[float] = None
