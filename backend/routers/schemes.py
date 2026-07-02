"""
routers/schemes.py
------------------
REST endpoints for government welfare schemes.
Data is served from the PostgreSQL `schemes` table,
which is populated by running:  python seed_schemes.py
"""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from database import get_db
from models import Scheme

router = APIRouter(prefix="/schemes", tags=["schemes"])


# ── Response helpers ──────────────────────────────────────────────────────────

def _to_dict(s: Scheme) -> dict:
    return {
        "id":          s.id,
        "name":        s.name,
        "ministry":    s.ministry,
        "description": s.description,
        "tags":        s.tags or [],
        "category":    s.category,
        "apply_url":   s.apply_url,
        "source":      s.source,
        "scraped_at":  s.scraped_at.isoformat() if s.scraped_at else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", summary="List all schemes (paginated)")
def list_schemes(
    page:     int            = Query(1, ge=1, description="Page number"),
    limit:    int            = Query(20, ge=1, le=100, description="Results per page"),
    search:   Optional[str]  = Query(None, description="Search name/description/ministry"),
    category: Optional[str]  = Query(None, description="Filter by category"),
    ministry: Optional[str]  = Query(None, description="Filter by ministry"),
    db:       Session        = Depends(get_db),
):
    """
    Returns a paginated list of government welfare schemes.
    Supports full-text search and category/ministry filters.
    """
    q = db.query(Scheme)

    if search:
        term = f"%{search}%"
        q = q.filter(
            or_(
                Scheme.name.ilike(term),
                Scheme.description.ilike(term),
                Scheme.ministry.ilike(term),
            )
        )

    if category:
        q = q.filter(Scheme.category.ilike(f"%{category}%"))

    if ministry:
        q = q.filter(Scheme.ministry.ilike(f"%{ministry}%"))

    total = q.count()
    schemes = q.order_by(Scheme.name).offset((page - 1) * limit).limit(limit).all()

    # Get the top 25 most frequent categories for the frontend filter dropdown
    cat_query = (
        db.query(Scheme.category, func.count(Scheme.id))
        .group_by(Scheme.category)
        .order_by(func.count(Scheme.id).desc())
        .limit(25)
        .all()
    )
    all_categories = sorted([c[0] for c in cat_query if c[0]])

    return {
        "total":    total,
        "page":     page,
        "limit":    limit,
        "pages":      (total + limit - 1) // limit,
        "schemes":    [_to_dict(s) for s in schemes],
        "categories": all_categories,
    }


@router.get("/stats", summary="Scheme database statistics")
def scheme_stats(db: Session = Depends(get_db)):
    """Returns total count and breakdown by category."""
    total = db.query(func.count(Scheme.id)).scalar()
    categories = (
        db.query(Scheme.category, func.count(Scheme.id).label("count"))
        .group_by(Scheme.category)
        .order_by(func.count(Scheme.id).desc())
        .limit(20)
        .all()
    )
    ministries = (
        db.query(Scheme.ministry, func.count(Scheme.id).label("count"))
        .group_by(Scheme.ministry)
        .order_by(func.count(Scheme.id).desc())
        .limit(20)
        .all()
    )
    return {
        "total_schemes": total,
        "top_categories": [{"category": c, "count": n} for c, n in categories],
        "top_ministries": [{"ministry": m, "count": n} for m, n in ministries],
    }


@router.get("/{scheme_id}", summary="Get a single scheme by ID/slug")
def get_scheme(scheme_id: str, db: Session = Depends(get_db)):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail=f"Scheme '{scheme_id}' not found")
    return _to_dict(scheme)
