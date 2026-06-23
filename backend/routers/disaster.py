"""
Disaster Alert router — all endpoints for the Disaster & Emergency module.

Roles:
  Admin  → create/broadcast alerts, resolve/cancel, view stats
  Officer → view alerts in their zone, acknowledge alerts, send zone updates
  Citizen → register phone, subscribe to zones, view active alerts
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, DisasterAlert, AlertRecipient
from schemas import (
    AlertCreate,
    AlertResponse,
    AlertStats,
    PhoneRegisterRequest,
    MessageResponse,
    UserResponse,
)
from dependencies import get_current_user
from routers.twilio_service import broadcast_alert, is_mock

router = APIRouter(prefix="/api/disaster", tags=["disaster"])

VALID_ZONES = [
    "All Zones",
    "North District",
    "South District",
    "East District",
    "West District",
    "Coastal Zone",
    "Central Zone",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_role(user: User, *roles: str) -> None:
    if user.role not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required role: {' or '.join(roles)}",
        )


def _build_alert_response(alert: DisasterAlert, db: Session) -> AlertResponse:
    recipients = alert.recipients
    sms_sent = sum(1 for r in recipients if r.sms_status in ("sent", "mock"))
    call_sent = sum(1 for r in recipients if r.call_status in ("sent", "mock"))
    acked = sum(1 for r in recipients if r.acknowledged)
    # pyrefly: ignore [redundant-condition]
    creator_name = alert.creator.name if alert.creator else None

    return AlertResponse(
        id=alert.id,
        title=alert.title,
        description=alert.description,
        disaster_type=alert.disaster_type,
        severity=alert.severity,
        affected_zones=alert.affected_zones,
        status=alert.status,
        broadcast_sms=alert.broadcast_sms,
        broadcast_call=alert.broadcast_call,
        created_by=alert.created_by,
        created_at=alert.created_at,
        resolved_at=alert.resolved_at,
        recipients_count=len(recipients),
        sms_sent=sms_sent,
        call_sent=call_sent,
        acknowledged_count=acked,
        creator_name=creator_name,
    )


def _do_broadcast(alert_id: uuid.UUID, db_url: str) -> None:
    """Background task: send SMS/calls via Twilio to all matching recipients."""
    # Import here to get a fresh DB session in the background thread
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(db_url)
    LocalSession = sessionmaker(bind=engine)
    db = LocalSession()

    try:
        alert = db.query(DisasterAlert).filter(DisasterAlert.id == alert_id).first()
        if not alert:
            return

        # Build list of payloads for twilio_service
        payload = [
            {
                "phone": r.phone_number,
                "do_sms": alert.broadcast_sms,
                "do_call": alert.broadcast_call,
            }
            for r in alert.recipients
            if r.phone_number
        ]

        results = broadcast_alert(
            alert_title=alert.title,
            alert_description=alert.description,
            severity=alert.severity,
            recipients=payload,
        )

        # Persist delivery statuses
        for i, r in enumerate(alert.recipients):
            if i >= len(results):
                break
            res = results[i]
            if res.get("sms"):
                r.sms_status = res["sms"]["status"]
                r.sms_sid = res["sms"].get("sid")
            if res.get("call"):
                r.call_status = res["call"]["status"]
                r.call_sid = res["call"].get("sid")
            r.delivered_at = datetime.now(timezone.utc)

        db.commit()
    finally:
        db.close()
        engine.dispose()


# ── GET /zones — list valid zones ─────────────────────────────────────────────

@router.get("/zones", response_model=List[str])
def list_zones():
    return VALID_ZONES


# ── GET /alerts — list alerts (role-filtered) ─────────────────────────────────

@router.get("/alerts", response_model=List[AlertResponse])
def list_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(DisasterAlert)

    if current_user.role == "citizen":
        # Citizens see only active alerts matching their zone (or all zones)
        q = q.filter(DisasterAlert.status == "active")
        alerts = q.order_by(DisasterAlert.created_at.desc()).all()
        if current_user.zone:
            alerts = [
                a for a in alerts
                if current_user.zone in a.affected_zones or "All Zones" in a.affected_zones
            ]
    elif current_user.role == "officer":
        # Officers see active alerts in their zone
        q = q.filter(DisasterAlert.status == "active")
        alerts = q.order_by(DisasterAlert.created_at.desc()).all()
        if current_user.zone:
            alerts = [
                a for a in alerts
                if current_user.zone in a.affected_zones or "All Zones" in a.affected_zones
            ]
    else:
        # Admin sees everything
        alerts = q.order_by(DisasterAlert.created_at.desc()).all()

    return [_build_alert_response(a, db) for a in alerts]


# ── GET /alerts/{id} — alert detail ──────────────────────────────────────────

@router.get("/alerts/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(DisasterAlert).filter(DisasterAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _build_alert_response(alert, db)


# ── POST /alerts — Admin: create & broadcast ──────────────────────────────────

@router.post("/alerts", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(
    body: AlertCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "admin", "officer")

    # Validate zones
    for z in body.affected_zones:
        if z not in VALID_ZONES:
            raise HTTPException(status_code=400, detail=f"Invalid zone: {z}")

    alert = DisasterAlert(
        title=body.title,
        description=body.description,
        disaster_type=body.disaster_type,
        severity=body.severity,
        affected_zones=body.affected_zones,
        status="active",
        broadcast_sms=body.broadcast_sms,
        broadcast_call=body.broadcast_call,
        created_by=current_user.id,
    )
    db.add(alert)
    db.flush()  # get the ID

    # Find recipients: users with a phone number in affected zones
    user_q = db.query(User).filter(
        User.is_active == True,
        User.phone_number.isnot(None),
    )

    if "All Zones" not in body.affected_zones:
        # Filter by zone — include users whose zone is in affected_zones
        matching_users = [
            u for u in user_q.all()
            if u.zone and u.zone in body.affected_zones
        ]
    else:
        matching_users = user_q.all()

    for u in matching_users:
        recipient = AlertRecipient(
            alert_id=alert.id,
            user_id=u.id,
            phone_number=u.phone_number,  # type: ignore[arg-type]
            sms_status="pending" if body.broadcast_sms else "n/a",
            call_status="pending" if body.broadcast_call else None,
        )
        db.add(recipient)

    db.commit()
    db.refresh(alert)

    # Fire off Twilio in a background task
    if matching_users:
        from database import DATABASE_URL  # type: ignore[attr-defined]
        # pyrefly: ignore [bad-argument-type]
        background_tasks.add_task(_do_broadcast, alert.id, DATABASE_URL)

    return _build_alert_response(alert, db)


# ── PUT /alerts/{id}/resolve — Admin: resolve an alert ───────────────────────

@router.put("/alerts/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "admin")
    alert = db.query(DisasterAlert).filter(DisasterAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "resolved"
    alert.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    return _build_alert_response(alert, db)


# ── PUT /alerts/{id}/cancel — Admin: cancel an alert ─────────────────────────

@router.put("/alerts/{alert_id}/cancel", response_model=AlertResponse)
def cancel_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "admin")
    alert = db.query(DisasterAlert).filter(DisasterAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "cancelled"
    db.commit()
    db.refresh(alert)
    return _build_alert_response(alert, db)


# ── POST /alerts/{id}/acknowledge — Officer/Citizen acknowledge ───────────────

@router.post("/alerts/{alert_id}/acknowledge", response_model=MessageResponse)
def acknowledge_alert(
    alert_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recipient = (
        db.query(AlertRecipient)
        .filter(
            AlertRecipient.alert_id == alert_id,
            AlertRecipient.user_id == current_user.id,
        )
        .first()
    )
    if not recipient:
        raise HTTPException(
            status_code=404,
            detail="You are not a recipient of this alert",
        )
    recipient.acknowledged = True
    db.commit()
    return MessageResponse(message="Alert acknowledged")


# ── POST /phone — Citizen/Officer: register phone number & zone ───────────────

@router.post("/phone", response_model=UserResponse)
def register_phone(
    body: PhoneRegisterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.zone and body.zone not in VALID_ZONES:
        raise HTTPException(status_code=400, detail=f"Invalid zone: {body.zone}")

    current_user.phone_number = body.phone_number
    if body.zone:
        current_user.zone = body.zone
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


# ── GET /stats — Admin: summary statistics ────────────────────────────────────

@router.get("/stats", response_model=AlertStats)
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_role(current_user, "admin")

    all_alerts = db.query(DisasterAlert).all()
    all_recipients = db.query(AlertRecipient).all()

    return AlertStats(
        total_alerts=len(all_alerts),
        active_alerts=sum(1 for a in all_alerts if a.status == "active"),
        total_sms_sent=sum(1 for r in all_recipients if r.sms_status in ("sent", "mock")),
        total_calls_made=sum(1 for r in all_recipients if r.call_status in ("sent", "mock")),
        total_citizens_reached=len(
            {r.user_id for r in all_recipients if r.sms_status in ("sent", "mock")}
        ),
        critical_count=sum(1 for a in all_alerts if a.severity == "critical"),
        high_count=sum(1 for a in all_alerts if a.severity == "high"),
        watch_count=sum(1 for a in all_alerts if a.severity == "watch"),
    )


# ── GET /twilio-status — check if Twilio is live or mock ─────────────────────

@router.get("/twilio-status")
def twilio_status(current_user: User = Depends(get_current_user)):
    _require_role(current_user, "admin")
    return {
        "mode": "mock" if is_mock() else "live",
        "message": (
            "Twilio is in mock mode. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, "
            "and TWILIO_FROM_NUMBER in .env to enable real SMS/calls."
            if is_mock()
            else "Twilio is configured and sending live SMS/calls."
        ),
    }
