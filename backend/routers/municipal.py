"""
Municipal Service Automation router.

Roles:
  Admin   → full read/write on all complaints, stats
  Officer → read all complaints, update status (all)
  Citizen → submit complaints, view own complaints
  Public  → GET /public (no auth) — anonymised feed for the issues board
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from models import MunicipalComplaint, ComplaintStatusHistory, User, CATEGORY_DEPT_MAP
from schemas import (
    ComplaintCreate,
    ComplaintStatusUpdate,
    ComplaintResponse,
    ComplaintPublicResponse,
    ComplaintHistoryEntry,
    ComplaintStats,
    MessageResponse,
    MUNICIPAL_CATEGORIES,
    COMPLAINT_STATUSES,
)
from dependencies import get_current_user

router = APIRouter(prefix="/api/municipal", tags=["municipal"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_role(user: User, *roles: str) -> None:
    if user.role not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required role: {' or '.join(roles)}",
        )


def _next_complaint_number(db: Session) -> str:
    """Generate MUN-XXXX style complaint number."""
    count = db.query(MunicipalComplaint).count()
    return f"MUN-{3000 + count + 1}"


def _build_response(complaint: MunicipalComplaint) -> ComplaintResponse:
    history = [
        ComplaintHistoryEntry(
            old_status=h.old_status,
            new_status=h.new_status,
            note=h.note,
            # pyrefly: ignore [redundant-condition]
            changed_by_name=h.changed_by_user.name if h.changed_by_user else None,
            changed_at=h.changed_at,
        )
        for h in complaint.status_history
    ]
    return ComplaintResponse(
        id=complaint.id,
        complaint_number=complaint.complaint_number,
        title=complaint.title,
        description=complaint.description,
        category=complaint.category,
        location=complaint.location,
        department=complaint.department,
        status=complaint.status,
        priority=complaint.priority,
        progress=complaint.progress,
        submitted_by=complaint.submitted_by,
        # pyrefly: ignore [redundant-condition]
        submitter_name=complaint.submitter.name if complaint.submitter else None,
        assigned_to=complaint.assigned_to,
        assigned_officer_name=complaint.assigned_officer.name if complaint.assigned_officer else None,
        officer_notes=complaint.officer_notes,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        history=history,
    )


def _build_public(complaint: MunicipalComplaint) -> ComplaintPublicResponse:
    return ComplaintPublicResponse(
        id=complaint.id,
        complaint_number=complaint.complaint_number,
        title=complaint.title,
        category=complaint.category,
        location=complaint.location,
        department=complaint.department,
        status=complaint.status,
        priority=complaint.priority,
        progress=complaint.progress,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
    )


# ── GET /public — anonymous public feed ───────────────────────────────────────

@router.get("/complaints/public", response_model=List[ComplaintPublicResponse])
def list_public_complaints(
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    """Public feed — no authentication required. Returns anonymised complaints."""
    q = db.query(MunicipalComplaint)

    if category and category in MUNICIPAL_CATEGORIES:
        q = q.filter(MunicipalComplaint.category == category)
    if status_filter and status_filter in COMPLAINT_STATUSES:
        q = q.filter(MunicipalComplaint.status == status_filter)
    if search:
        term = f"%{search.lower()}%"
        q = q.filter(
            MunicipalComplaint.title.ilike(term)
            | MunicipalComplaint.location.ilike(term)
            | MunicipalComplaint.complaint_number.ilike(term)
        )

    complaints = q.order_by(MunicipalComplaint.created_at.desc()).limit(limit).all()
    return [_build_public(c) for c in complaints]


# ── POST /complaints — submit complaint (any authenticated user) ───────────────

@router.post(
    "/complaints",
    response_model=ComplaintResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_complaint(
    body: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dept = CATEGORY_DEPT_MAP.get(body.category, "General")
    number = _next_complaint_number(db)

    complaint = MunicipalComplaint(
        complaint_number=number,
        title=body.title,
        description=body.description,
        category=body.category,
        location=body.location,
        department=dept,
        status="Submitted",
        priority="Medium",
        progress=0,
        submitted_by=current_user.id,
    )
    db.add(complaint)
    db.flush()

    # Record initial status history
    history = ComplaintStatusHistory(
        complaint_id=complaint.id,
        old_status="",
        new_status="Submitted",
        changed_by=current_user.id,
        note="Complaint submitted",
    )
    db.add(history)
    db.commit()
    db.refresh(complaint)
    return _build_response(complaint)


# ── GET /complaints/mine — citizen's own complaints ───────────────────────────

@router.get("/complaints/mine", response_model=List[ComplaintResponse])
def my_complaints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaints = (
        db.query(MunicipalComplaint)
        .filter(MunicipalComplaint.submitted_by == current_user.id)
        .order_by(MunicipalComplaint.created_at.desc())
        .all()
    )
    return [_build_response(c) for c in complaints]


# ── GET /complaints — officer/admin: all complaints ───────────────────────────

@router.get("/complaints", response_model=List[ComplaintResponse])
def list_complaints(
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "officer", "admin")

    q = db.query(MunicipalComplaint)

    if category and category in MUNICIPAL_CATEGORIES:
        q = q.filter(MunicipalComplaint.category == category)
    if status_filter and status_filter in COMPLAINT_STATUSES:
        q = q.filter(MunicipalComplaint.status == status_filter)
    if search:
        term = f"%{search.lower()}%"
        q = q.filter(
            MunicipalComplaint.title.ilike(term)
            | MunicipalComplaint.location.ilike(term)
            | MunicipalComplaint.complaint_number.ilike(term)
        )

    complaints = q.order_by(MunicipalComplaint.created_at.desc()).limit(limit).all()
    return [_build_response(c) for c in complaints]


# ── GET /complaints/{id} — single complaint (any auth) ───────────────────────

@router.get("/complaints/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(
    complaint_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    complaint = db.query(MunicipalComplaint).filter(MunicipalComplaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Citizens can only view their own
    if current_user.role == "citizen" and complaint.submitted_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return _build_response(complaint)


# ── PUT /complaints/{id}/status — officer/admin: update status ────────────────

@router.put("/complaints/{complaint_id}/status", response_model=ComplaintResponse)
def update_status(
    complaint_id: uuid.UUID,
    body: ComplaintStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "officer", "admin")

    complaint = db.query(MunicipalComplaint).filter(MunicipalComplaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    old_status = complaint.status

    # Apply updates
    complaint.status = body.new_status
    if body.priority:
        complaint.priority = body.priority
    if body.progress is not None:
        complaint.progress = body.progress
    if body.assigned_to is not None:
        # Validate the assigned user exists and is officer/admin
        officer = db.query(User).filter(User.id == body.assigned_to).first()
        if not officer:
            raise HTTPException(status_code=404, detail="Assigned user not found")
        complaint.assigned_to = body.assigned_to
    if body.note:
        complaint.officer_notes = body.note
    complaint.updated_at = datetime.now(timezone.utc)

    # Automatically set progress for terminal statuses
    if body.new_status == "Resolved":
        complaint.progress = 100
    elif body.new_status == "Closed":
        complaint.progress = 100

    # Log history
    history = ComplaintStatusHistory(
        complaint_id=complaint.id,
        old_status=old_status,
        new_status=body.new_status,
        changed_by=current_user.id,
        note=body.note,
    )
    db.add(history)
    db.commit()
    db.refresh(complaint)
    return _build_response(complaint)


# ── GET /stats — admin: aggregate statistics ─────────────────────────────────

@router.get("/stats", response_model=ComplaintStats)
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "admin", "officer")

    all_complaints = db.query(MunicipalComplaint).all()
    total = len(all_complaints)

    status_map = {
        "submitted": 0,
        "under_review": 0,
        "assigned": 0,
        "in_progress": 0,
        "resolved": 0,
        "closed": 0,
    }
    by_category: dict[str, int] = {cat: 0 for cat in MUNICIPAL_CATEGORIES}

    resolved_times: list[float] = []

    for c in all_complaints:
        key = c.status.lower().replace(" ", "_")
        if key in status_map:
            status_map[key] += 1
        if c.category in by_category:
            by_category[c.category] += 1
        if c.status in ("Resolved", "Closed"):
            hours = (c.updated_at - c.created_at).total_seconds() / 3600
            resolved_times.append(hours)

    resolved_count = status_map["resolved"] + status_map["closed"]
    resolution_rate = round((resolved_count / total * 100) if total > 0 else 0, 1)
    avg_hours = round(sum(resolved_times) / len(resolved_times), 1) if resolved_times else None

    return ComplaintStats(
        total=total,
        submitted=status_map["submitted"],
        under_review=status_map["under_review"],
        assigned=status_map["assigned"],
        in_progress=status_map["in_progress"],
        resolved=status_map["resolved"],
        closed=status_map["closed"],
        by_category=by_category,
        resolution_rate=resolution_rate,
        avg_resolution_hours=avg_hours,
    )


# ── GET /categories — list valid categories ───────────────────────────────────

@router.get("/categories", response_model=List[str])
def list_categories():
    return MUNICIPAL_CATEGORIES
