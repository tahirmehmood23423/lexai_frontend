# ═══════════════════════════════════════════════════════════════
# backend/routers/firms.py
# Law Firm management — CRUD, team, dashboard
# ═══════════════════════════════════════════════════════════════

import re
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel

from core.database import get_db, LawFirm, User, LawyerProfile, Case
from routers.auth import get_current_user

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────
class FirmCreate(BaseModel):
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    practice_areas: List[str] = []
    services: List[str] = []
    established_year: Optional[int] = None
    logo_url: Optional[str] = None


class FirmUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    practice_areas: Optional[List[str]] = None
    services: Optional[List[str]] = None
    established_year: Optional[int] = None
    logo_url: Optional[str] = None


class AddLawyerToFirm(BaseModel):
    user_email: str
    role_in_firm: Optional[str] = "Associate"


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────
def slugify(name: str) -> str:
    """Convert firm name to URL-friendly slug."""
    s = name.lower().strip()
    s = re.sub(r'[^a-z0-9\s-]', '', s)
    s = re.sub(r'\s+', '-', s)
    return s[:60]


def get_unique_slug(name: str, db: Session) -> str:
    base = slugify(name)
    if not base:
        base = "firm"
    slug = base
    n = 1
    while db.query(LawFirm).filter(LawFirm.slug == slug).first():
        n += 1
        slug = f"{base}-{n}"
    return slug


# ─────────────────────────────────────────────────────────────
# PUBLIC ENDPOINTS (no auth)
# ─────────────────────────────────────────────────────────────
@router.get("/")
def list_firms(
    city: Optional[str] = None,
    province: Optional[str] = None,
    practice_area: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Public list of law firms (for marketplace)."""
    query = db.query(LawFirm).filter(LawFirm.is_active == True)
    if city:
        query = query.filter(LawFirm.city == city)
    if province:
        query = query.filter(LawFirm.province == province)
    if q:
        query = query.filter(or_(
            LawFirm.name.ilike(f"%{q}%"),
            LawFirm.description.ilike(f"%{q}%")
        ))
    firms = query.order_by(LawFirm.is_verified.desc(), LawFirm.created_at.desc()).limit(50).all()
    result = []
    for f in firms:
        if practice_area and practice_area not in (f.practice_areas or []):
            continue
        result.append({
            "id":             f.id,
            "name":           f.name,
            "slug":           f.slug,
            "description":    f.description,
            "logo_url":       f.logo_url,
            "city":           f.city,
            "province":       f.province,
            "practice_areas": f.practice_areas,
            "is_verified":    f.is_verified,
            "lawyer_count":   len(f.lawyers),
            "established_year": f.established_year,
        })
    return {"firms": result, "total": len(result)}


@router.get("/{slug}")
def get_firm(slug: str, db: Session = Depends(get_db)):
    """Public firm profile page."""
    firm = db.query(LawFirm).filter(LawFirm.slug == slug).first()
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")

    # Get firm lawyers with their user info
    lawyers = []
    for lp in firm.lawyers:
        if lp.user:
            lawyers.append({
                "id":               lp.id,
                "user_id":          lp.user.id,
                "full_name":        lp.user.full_name,
                "role_in_firm":     lp.role_in_firm,
                "specializations":  lp.specializations or [],
                "experience_years": lp.experience_years,
                "bio":              lp.bio,
                "profile_photo_url": lp.profile_photo_url,
                "rating_avg":       lp.rating_avg,
                "consultation_fee": lp.consultation_fee,
            })

    return {
        "id":              firm.id,
        "name":            firm.name,
        "slug":            firm.slug,
        "description":     firm.description,
        "logo_url":        firm.logo_url,
        "website":         firm.website,
        "email":           firm.email,
        "phone":           firm.phone,
        "address":         firm.address,
        "city":            firm.city,
        "province":        firm.province,
        "practice_areas":  firm.practice_areas or [],
        "services":        firm.services or [],
        "established_year": firm.established_year,
        "is_verified":     firm.is_verified,
        "lawyers":         lawyers,
        "lawyer_count":    len(lawyers),
    }


# ─────────────────────────────────────────────────────────────
# AUTHENTICATED ENDPOINTS
# ─────────────────────────────────────────────────────────────
@router.post("/", status_code=201)
def create_firm(
    data: FirmCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create a new law firm. Caller becomes the owner + firm_admin."""
    if user.role not in ("lawyer", "firm_admin", "admin"):
        raise HTTPException(status_code=403, detail="Only lawyers can create firms")

    slug = get_unique_slug(data.name, db)
    firm = LawFirm(
        id=str(uuid.uuid4()),
        name=data.name,
        slug=slug,
        description=data.description,
        website=data.website,
        email=data.email,
        phone=data.phone,
        address=data.address,
        city=data.city,
        province=data.province,
        practice_areas=data.practice_areas,
        services=data.services,
        established_year=data.established_year,
        logo_url=data.logo_url,
        owner_id=user.id,
    )
    db.add(firm)

    # Promote user to firm_admin
    user.role = "firm_admin"

    # Link user's lawyer profile to firm if exists
    profile = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    if profile:
        profile.firm_id = firm.id
        profile.role_in_firm = "Owner"

    db.commit()
    db.refresh(firm)
    return {"id": firm.id, "slug": firm.slug, "name": firm.name}


@router.put("/{firm_id}")
def update_firm(
    firm_id: str,
    data: FirmUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update firm details (only firm owner or admin)."""
    firm = db.query(LawFirm).filter(LawFirm.id == firm_id).first()
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")
    if firm.owner_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = data.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(firm, k, v)
    db.commit()
    return {"message": "Firm updated"}


@router.post("/{firm_id}/lawyers")
def add_lawyer_to_firm(
    firm_id: str,
    data: AddLawyerToFirm,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Add an existing lawyer (by email) to the firm."""
    firm = db.query(LawFirm).filter(LawFirm.id == firm_id).first()
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")
    if firm.owner_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    target_user = db.query(User).filter(User.email == data.user_email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found with that email")

    profile = db.query(LawyerProfile).filter(LawyerProfile.user_id == target_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="That user is not a lawyer")

    if profile.firm_id and profile.firm_id != firm_id:
        raise HTTPException(status_code=400, detail="Lawyer already belongs to another firm")

    profile.firm_id = firm_id
    profile.role_in_firm = data.role_in_firm
    db.commit()
    return {"message": f"{target_user.full_name} added to firm"}


@router.delete("/{firm_id}/lawyers/{lawyer_id}")
def remove_lawyer_from_firm(
    firm_id: str,
    lawyer_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Remove a lawyer from the firm."""
    firm = db.query(LawFirm).filter(LawFirm.id == firm_id).first()
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")
    if firm.owner_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    profile = db.query(LawyerProfile).filter(LawyerProfile.id == lawyer_id).first()
    if not profile or profile.firm_id != firm_id:
        raise HTTPException(status_code=404, detail="Lawyer not in this firm")

    profile.firm_id = None
    profile.role_in_firm = None
    db.commit()
    return {"message": "Lawyer removed from firm"}


@router.get("/{firm_id}/dashboard")
def firm_dashboard(
    firm_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Firm-wide dashboard stats (only for firm members + admin)."""
    firm = db.query(LawFirm).filter(LawFirm.id == firm_id).first()
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")

    # Check if user belongs to firm
    profile = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    is_firm_member = (profile and profile.firm_id == firm_id) or firm.owner_id == user.id or user.role == "admin"
    if not is_firm_member:
        raise HTTPException(status_code=403, detail="Not a firm member")

    lawyer_ids = [lp.id for lp in firm.lawyers]
    cases = db.query(Case).filter(Case.lawyer_id.in_(lawyer_ids)).all() if lawyer_ids else []

    by_status = {}
    for c in cases:
        by_status[c.status] = by_status.get(c.status, 0) + 1

    by_lawyer = []
    for lp in firm.lawyers:
        lawyer_cases = [c for c in cases if c.lawyer_id == lp.id]
        by_lawyer.append({
            "lawyer_id":   lp.id,
            "full_name":   lp.user.full_name if lp.user else "Unknown",
            "role_in_firm": lp.role_in_firm,
            "total_cases":  len(lawyer_cases),
            "active_cases": len([c for c in lawyer_cases if c.status == "active"]),
        })

    return {
        "firm_id":      firm.id,
        "firm_name":    firm.name,
        "lawyer_count": len(firm.lawyers),
        "total_cases":  len(cases),
        "cases_by_status": by_status,
        "lawyers":      by_lawyer,
    }


@router.get("/my/firm")
def my_firm(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Get the firm the current user belongs to (as owner or member)."""
    # Owned firm
    firm = db.query(LawFirm).filter(LawFirm.owner_id == user.id).first()
    if firm:
        return {"id": firm.id, "slug": firm.slug, "name": firm.name, "role": "owner"}

    # Member of firm via lawyer profile
    profile = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    if profile and profile.firm_id:
        firm = db.query(LawFirm).filter(LawFirm.id == profile.firm_id).first()
        if firm:
            return {"id": firm.id, "slug": firm.slug, "name": firm.name, "role": profile.role_in_firm or "member"}

    return None
