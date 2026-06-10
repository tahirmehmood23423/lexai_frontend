# ═══════════════════════════════════════════════════════════════
# backend/routers/firms.py
# Law Firms Portal — Complete backend
# Mount in main.py with: app.include_router(firms.router, prefix="/api/firms")
# ═══════════════════════════════════════════════════════════════

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import re
import uuid

from core.database import (
    get_db, User, UserRole,
    LawFirm, FirmMember, FirmMemberRole,
    FirmInvite, InviteStatus,
    FirmInquiry, InquiryStatus,
    FirmReview,
)
from routers.auth import get_current_user

router = APIRouter()


# ═════════════════════════════════════════════════════════════════
# PYDANTIC SCHEMAS
# ═════════════════════════════════════════════════════════════════

class FirmCreate(BaseModel):
    name:                 str
    description:          Optional[str] = None
    website:              Optional[str] = None
    email:                Optional[EmailStr] = None
    phone:                Optional[str] = None
    address:              Optional[str] = None
    city:                 Optional[str] = None
    province:             Optional[str] = None
    established_year:     Optional[int] = None
    bar_council_membership: Optional[str] = None
    practice_areas:       List[str] = []
    services:             List[str] = []
    languages:            List[str] = ["English", "Urdu"]


class FirmUpdate(BaseModel):
    name:                 Optional[str] = None
    description:          Optional[str] = None
    logo_url:             Optional[str] = None
    website:              Optional[str] = None
    email:                Optional[EmailStr] = None
    phone:                Optional[str] = None
    address:              Optional[str] = None
    city:                 Optional[str] = None
    province:             Optional[str] = None
    established_year:     Optional[int] = None
    bar_council_membership: Optional[str] = None
    practice_areas:       Optional[List[str]] = None
    services:             Optional[List[str]] = None
    languages:            Optional[List[str]] = None


class FirmOut(BaseModel):
    id:               str
    name:             str
    slug:             str
    description:      Optional[str]
    logo_url:         Optional[str]
    website:          Optional[str]
    email:            Optional[str]
    phone:            Optional[str]
    address:          Optional[str]
    city:             Optional[str]
    province:         Optional[str]
    established_year: Optional[int]
    practice_areas:   List[str]
    services:         List[str]
    languages:        List[str]
    is_verified:      bool
    rating_avg:       float
    rating_count:     int
    lawyer_count:     int = 0

    class Config:
        from_attributes = True


class FirmMemberOut(BaseModel):
    id:             str
    user_id:        str
    full_name:      str
    email:          str
    role:           str
    role_in_firm:   Optional[str]
    is_active:      bool
    joined_at:      datetime
    experience_years: Optional[int] = 0
    specializations: List[str] = []

    class Config:
        from_attributes = True


class InviteCreate(BaseModel):
    email:        EmailStr
    role:         FirmMemberRole = FirmMemberRole.associate
    role_in_firm: Optional[str] = None
    message:      Optional[str] = None


class MemberRoleUpdate(BaseModel):
    role:         Optional[FirmMemberRole] = None
    role_in_firm: Optional[str] = None


class InquiryCreate(BaseModel):
    name:          str
    email:         EmailStr
    phone:         Optional[str] = None
    subject:       Optional[str] = None
    message:       str
    practice_area: Optional[str] = None


class InquiryUpdate(BaseModel):
    status:      Optional[InquiryStatus] = None
    assigned_to: Optional[str] = None
    notes:       Optional[str] = None


class ReviewCreate(BaseModel):
    rating:  int   # 1-5
    comment: Optional[str] = None


# ═════════════════════════════════════════════════════════════════
# HELPERS
# ═════════════════════════════════════════════════════════════════

def slugify(text: str) -> str:
    """Convert firm name to URL slug."""
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")[:80]


def unique_slug(db: Session, base: str) -> str:
    """Generate a unique slug, appending -2, -3, etc. if needed."""
    slug = slugify(base)
    if not slug:
        slug = f"firm-{uuid.uuid4().hex[:8]}"

    counter, candidate = 1, slug
    while db.query(LawFirm).filter(LawFirm.slug == candidate).first():
        counter += 1
        candidate = f"{slug}-{counter}"
    return candidate


def get_firm_or_404(db: Session, firm_id_or_slug: str) -> LawFirm:
    """Lookup firm by ID first, fall back to slug."""
    firm = db.query(LawFirm).filter(LawFirm.id == firm_id_or_slug).first()
    if not firm:
        firm = db.query(LawFirm).filter(LawFirm.slug == firm_id_or_slug).first()
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")
    return firm


def require_firm_member(
    db: Session, firm_id: str, user_id: str,
    min_role: Optional[FirmMemberRole] = None
) -> FirmMember:
    """Require user to be an active member, optionally with minimum role."""
    member = db.query(FirmMember).filter(
        FirmMember.firm_id == firm_id,
        FirmMember.user_id == user_id,
        FirmMember.is_active == True,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this firm")

    if min_role:
        # Hierarchy: owner > admin > partner > associate > intern
        hierarchy = [
            FirmMemberRole.intern, FirmMemberRole.associate,
            FirmMemberRole.partner, FirmMemberRole.admin, FirmMemberRole.owner,
        ]
        if hierarchy.index(member.role) < hierarchy.index(min_role):
            raise HTTPException(
                status_code=403,
                detail=f"Requires {min_role.value} role or higher"
            )
    return member


def serialize_firm(firm: LawFirm, lawyer_count: int = 0) -> dict:
    """Convert firm to dict with lawyer count."""
    return {
        "id":               firm.id,
        "name":             firm.name,
        "slug":             firm.slug,
        "description":      firm.description,
        "logo_url":         firm.logo_url,
        "website":          firm.website,
        "email":            firm.email,
        "phone":            firm.phone,
        "address":          firm.address,
        "city":             firm.city,
        "province":         firm.province,
        "established_year": firm.established_year,
        "practice_areas":   firm.practice_areas or [],
        "services":         firm.services or [],
        "languages":        firm.languages or [],
        "is_verified":      firm.is_verified,
        "rating_avg":       firm.rating_avg or 0.0,
        "rating_count":     firm.rating_count or 0,
        "lawyer_count":     lawyer_count,
    }


# ═════════════════════════════════════════════════════════════════
# PUBLIC ENDPOINTS — Marketplace browsing
# ═════════════════════════════════════════════════════════════════

@router.get("/")
def list_firms(
    q:              Optional[str] = None,
    city:           Optional[str] = None,
    province:       Optional[str] = None,
    practice_area:  Optional[str] = None,
    verified_only:  bool = False,
    page:           int = Query(1, ge=1),
    limit:          int = Query(20, le=50),
    db:             Session = Depends(get_db),
):
    """Public list/search of all firms."""
    query = db.query(LawFirm)

    if q:
        like = f"%{q}%"
        query = query.filter(or_(
            LawFirm.name.ilike(like),
            LawFirm.description.ilike(like),
            LawFirm.city.ilike(like),
        ))
    if city:
        query = query.filter(LawFirm.city.ilike(f"%{city}%"))
    if province:
        query = query.filter(LawFirm.province.ilike(f"%{province}%"))
    if verified_only:
        query = query.filter(LawFirm.is_verified == True)
    if practice_area:
        # JSON contains check — SQLite/Postgres compatible-ish
        query = query.filter(LawFirm.practice_areas.cast(String).ilike(f"%{practice_area}%"))

    total = query.count()
    firms = (query
             .order_by(LawFirm.is_verified.desc(), LawFirm.rating_avg.desc())
             .offset((page - 1) * limit)
             .limit(limit)
             .all())

    # Get lawyer counts efficiently in one query
    firm_ids = [f.id for f in firms]
    counts = dict(
        db.query(FirmMember.firm_id, func.count(FirmMember.id))
          .filter(FirmMember.firm_id.in_(firm_ids), FirmMember.is_active == True)
          .group_by(FirmMember.firm_id)
          .all()
    ) if firm_ids else {}

    return {
        "firms": [serialize_firm(f, counts.get(f.id, 0)) for f in firms],
        "total": total,
        "page":  page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/{firm_slug}")
def get_firm_detail(firm_slug: str, db: Session = Depends(get_db)):
    """Public firm profile page."""
    firm = get_firm_or_404(db, firm_slug)

    # Get active members with their LawyerProfile data
    members = (db.query(FirmMember)
                 .filter(FirmMember.firm_id == firm.id, FirmMember.is_active == True)
                 .all())

    member_list = []
    for m in members:
        # Get lawyer profile if it exists
        lawyer_profile = None
        try:
            from core.database import LawyerProfile
            lawyer_profile = db.query(LawyerProfile).filter(
                LawyerProfile.user_id == m.user_id
            ).first()
        except Exception:
            pass

        member_list.append({
            "id":               m.id,
            "user_id":          m.user_id,
            "full_name":        m.user.full_name if m.user else "—",
            "email":            m.user.email if m.user else None,
            "role":             m.role.value,
            "role_in_firm":     m.role_in_firm,
            "experience_years": lawyer_profile.experience_years if lawyer_profile else 0,
            "specializations":  lawyer_profile.specializations if lawyer_profile else [],
            "joined_at":        m.joined_at,
        })

    out = serialize_firm(firm, len(member_list))
    out["lawyers"]      = member_list
    out["lawyer_count"] = len(member_list)
    return out


# ═════════════════════════════════════════════════════════════════
# OWNERSHIP & DASHBOARD
# ═════════════════════════════════════════════════════════════════

@router.post("/")
def create_firm(
    payload:      FirmCreate,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new law firm. Caller becomes owner + first member."""
    if current_user.role not in [UserRole.lawyer]:
        # Allow any lawyer to create a firm; clients can't.
        # Adjust this rule to your business logic.
        pass  # Permissive default — uncomment below to restrict
        # raise HTTPException(status_code=403, detail="Only lawyers can create firms")

    # One firm per owner — adjust if you want to allow multiple
    existing = db.query(LawFirm).filter(LawFirm.owner_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"You already own a firm: {existing.name}"
        )

    firm = LawFirm(
        name=payload.name,
        slug=unique_slug(db, payload.name),
        description=payload.description,
        website=payload.website,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        city=payload.city,
        province=payload.province,
        established_year=payload.established_year,
        bar_council_membership=payload.bar_council_membership,
        practice_areas=payload.practice_areas,
        services=payload.services,
        languages=payload.languages,
        owner_id=current_user.id,
    )
    db.add(firm)
    db.flush()

    # Add owner as first member
    member = FirmMember(
        firm_id=firm.id,
        user_id=current_user.id,
        role=FirmMemberRole.owner,
        role_in_firm="Founder",
    )
    db.add(member)
    db.commit()
    db.refresh(firm)

    return {"id": firm.id, "slug": firm.slug, "name": firm.name}


@router.get("/my/firm")
def get_my_firm(
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the firm the current user belongs to (as member)."""
    member = (db.query(FirmMember)
                .filter(FirmMember.user_id == current_user.id, FirmMember.is_active == True)
                .first())
    if not member:
        raise HTTPException(status_code=404, detail="You're not in any firm")

    firm = member.firm
    return {
        "id":           firm.id,
        "slug":         firm.slug,
        "name":         firm.name,
        "logo_url":     firm.logo_url,
        "role":         member.role.value,
        "role_in_firm": member.role_in_firm,
    }


@router.put("/{firm_id}")
def update_firm(
    firm_id:      str,
    payload:      FirmUpdate,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update firm settings. Admins+ only."""
    firm = get_firm_or_404(db, firm_id)
    require_firm_member(db, firm.id, current_user.id, min_role=FirmMemberRole.admin)

    update_data = payload.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != firm.name:
        # Regenerate slug if name changed
        update_data["slug"] = unique_slug(db, update_data["name"])

    for k, v in update_data.items():
        setattr(firm, k, v)
    db.commit()
    db.refresh(firm)
    return {"message": "Firm updated", "slug": firm.slug}


@router.delete("/{firm_id}")
def delete_firm(
    firm_id:      str,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a firm. Owner only."""
    firm = get_firm_or_404(db, firm_id)
    if firm.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can delete the firm")

    db.delete(firm)
    db.commit()
    return {"message": "Firm deleted"}


@router.get("/{firm_id}/dashboard")
def firm_dashboard(
    firm_id:      str,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Firm-wide stats for members."""
    firm = get_firm_or_404(db, firm_id)
    require_firm_member(db, firm.id, current_user.id, min_role=FirmMemberRole.associate)

    members = (db.query(FirmMember)
                 .filter(FirmMember.firm_id == firm.id, FirmMember.is_active == True)
                 .all())

    # Count cases per lawyer (if Case model has lawyer_id)
    lawyer_stats = []
    total_cases = 0
    cases_by_status = {"active": 0, "won": 0, "lost": 0, "pending": 0}

    try:
        from core.database import Case
        for m in members:
            lawyer_cases = db.query(Case).filter(Case.lawyer_id == m.user_id).all()
            active = sum(1 for c in lawyer_cases if c.status == "active")
            total_cases += len(lawyer_cases)
            for c in lawyer_cases:
                cases_by_status[c.status] = cases_by_status.get(c.status, 0) + 1

            lawyer_stats.append({
                "lawyer_id":    m.user_id,
                "full_name":    m.user.full_name if m.user else "—",
                "role_in_firm": m.role_in_firm,
                "role":         m.role.value,
                "total_cases":  len(lawyer_cases),
                "active_cases": active,
            })
    except Exception:
        # Case model doesn't exist or doesn't have lawyer_id
        for m in members:
            lawyer_stats.append({
                "lawyer_id":    m.user_id,
                "full_name":    m.user.full_name if m.user else "—",
                "role_in_firm": m.role_in_firm,
                "role":         m.role.value,
                "total_cases":  0,
                "active_cases": 0,
            })

    # Pending inquiries
    pending_inquiries = (db.query(FirmInquiry)
                           .filter(FirmInquiry.firm_id == firm.id,
                                   FirmInquiry.status == InquiryStatus.new)
                           .count())

    return {
        "firm_id":           firm.id,
        "name":              firm.name,
        "lawyer_count":      len(members),
        "total_cases":       total_cases,
        "cases_by_status":   cases_by_status,
        "pending_inquiries": pending_inquiries,
        "lawyers":           lawyer_stats,
    }


# ═════════════════════════════════════════════════════════════════
# MEMBER MANAGEMENT
# ═════════════════════════════════════════════════════════════════

@router.get("/{firm_id}/members")
def list_members(
    firm_id:      str,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all members of a firm. Members only."""
    firm = get_firm_or_404(db, firm_id)
    require_firm_member(db, firm.id, current_user.id)

    members = (db.query(FirmMember)
                 .filter(FirmMember.firm_id == firm.id, FirmMember.is_active == True)
                 .all())

    return [{
        "id":           m.id,
        "user_id":      m.user_id,
        "full_name":    m.user.full_name if m.user else "—",
        "email":        m.user.email if m.user else None,
        "role":         m.role.value,
        "role_in_firm": m.role_in_firm,
        "joined_at":    m.joined_at,
    } for m in members]


@router.post("/{firm_id}/members/invite")
def invite_member(
    firm_id:      str,
    payload:      InviteCreate,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Invite a lawyer to join the firm via email. Admins+ only."""
    firm = get_firm_or_404(db, firm_id)
    require_firm_member(db, firm.id, current_user.id, min_role=FirmMemberRole.admin)

    # Check if user with that email already in firm
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        existing_member = (db.query(FirmMember)
                             .filter(FirmMember.firm_id == firm.id,
                                     FirmMember.user_id == existing_user.id,
                                     FirmMember.is_active == True)
                             .first())
        if existing_member:
            raise HTTPException(status_code=400, detail="Already a member")

    # Check for pending invite
    existing_invite = (db.query(FirmInvite)
                         .filter(FirmInvite.firm_id == firm.id,
                                 FirmInvite.email == payload.email,
                                 FirmInvite.status == InviteStatus.pending)
                         .first())
    if existing_invite:
        raise HTTPException(status_code=400, detail="Invite already pending for this email")

    invite = FirmInvite(
        firm_id=firm.id,
        email=payload.email,
        invited_by=current_user.id,
        role=payload.role,
        role_in_firm=payload.role_in_firm,
        message=payload.message,
        expires_at=datetime.utcnow() + timedelta(days=14),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    # TODO: Send email to invitee with invite.token link
    # send_invite_email(invite.email, firm.name, invite.token)

    return {
        "id":      invite.id,
        "token":   invite.token,
        "email":   invite.email,
        "expires": invite.expires_at,
    }


@router.post("/invites/{token}/accept")
def accept_invite(
    token:        str,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept a pending firm invite."""
    invite = db.query(FirmInvite).filter(FirmInvite.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    if invite.status != InviteStatus.pending:
        raise HTTPException(status_code=400, detail=f"Invite already {invite.status.value}")

    if invite.expires_at and invite.expires_at < datetime.utcnow():
        invite.status = InviteStatus.expired
        db.commit()
        raise HTTPException(status_code=400, detail="Invite expired")

    if invite.email.lower() != current_user.email.lower():
        raise HTTPException(status_code=403, detail="This invite is for a different email")

    # Add as firm member
    member = FirmMember(
        firm_id=invite.firm_id,
        user_id=current_user.id,
        role=invite.role,
        role_in_firm=invite.role_in_firm,
    )
    db.add(member)

    invite.status      = InviteStatus.accepted
    invite.accepted_at = datetime.utcnow()
    db.commit()

    return {"firm_id": invite.firm_id, "role": invite.role.value}


@router.post("/invites/{token}/decline")
def decline_invite(
    token: str,
    db:    Session = Depends(get_db),
):
    """Decline a pending firm invite. Doesn't require auth (public link)."""
    invite = db.query(FirmInvite).filter(FirmInvite.token == token).first()
    if not invite or invite.status != InviteStatus.pending:
        raise HTTPException(status_code=404, detail="Invite not found or expired")
    invite.status = InviteStatus.declined
    db.commit()
    return {"message": "Invite declined"}


@router.put("/{firm_id}/members/{member_id}/role")
def update_member_role(
    firm_id:      str,
    member_id:    str,
    payload:      MemberRoleUpdate,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change a member's role. Admins+ only. Can't change owner."""
    firm = get_firm_or_404(db, firm_id)
    require_firm_member(db, firm.id, current_user.id, min_role=FirmMemberRole.admin)

    member = db.query(FirmMember).filter(
        FirmMember.id == member_id,
        FirmMember.firm_id == firm.id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.role == FirmMemberRole.owner:
        raise HTTPException(status_code=400, detail="Cannot change owner role")

    if payload.role:
        if payload.role == FirmMemberRole.owner:
            raise HTTPException(status_code=400, detail="Use transfer-ownership endpoint")
        member.role = payload.role
    if payload.role_in_firm is not None:
        member.role_in_firm = payload.role_in_firm

    db.commit()
    return {"message": "Role updated"}


@router.delete("/{firm_id}/members/{member_id}")
def remove_member(
    firm_id:      str,
    member_id:    str,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a member from the firm. Admins+ or self-removal."""
    firm = get_firm_or_404(db, firm_id)
    member = db.query(FirmMember).filter(
        FirmMember.id == member_id,
        FirmMember.firm_id == firm.id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Self-removal OR admin+ removing someone else
    if member.user_id != current_user.id:
        require_firm_member(db, firm.id, current_user.id, min_role=FirmMemberRole.admin)

    if member.role == FirmMemberRole.owner:
        raise HTTPException(
            status_code=400,
            detail="Owner cannot be removed. Transfer ownership or delete the firm."
        )

    member.is_active = False
    member.left_at = datetime.utcnow()
    db.commit()
    return {"message": "Member removed"}


# ═════════════════════════════════════════════════════════════════
# INQUIRIES (Lead Capture)
# ═════════════════════════════════════════════════════════════════

@router.post("/{firm_slug}/inquire")
def create_inquiry(
    firm_slug: str,
    payload:   InquiryCreate,
    db:        Session = Depends(get_db),
):
    """Public endpoint — anyone can submit an inquiry (no auth required)."""
    firm = get_firm_or_404(db, firm_slug)

    # Try to link to authenticated user if email matches
    user = db.query(User).filter(User.email == payload.email).first()

    inquiry = FirmInquiry(
        firm_id=firm.id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        user_id=user.id if user else None,
        subject=payload.subject,
        message=payload.message,
        practice_area=payload.practice_area,
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)

    # TODO: notify firm admins via email/in-app
    # send_inquiry_notification(firm, inquiry)

    return {
        "id":         inquiry.id,
        "message":    "Inquiry submitted. The firm will contact you soon.",
        "created_at": inquiry.created_at,
    }


@router.get("/{firm_id}/inquiries")
def list_inquiries(
    firm_id:        str,
    status_filter:  Optional[InquiryStatus] = Query(None, alias="status"),
    db:             Session = Depends(get_db),
    current_user:   User = Depends(get_current_user),
):
    """View leads for a firm. Members only."""
    firm = get_firm_or_404(db, firm_id)
    require_firm_member(db, firm.id, current_user.id)

    query = db.query(FirmInquiry).filter(FirmInquiry.firm_id == firm.id)
    if status_filter:
        query = query.filter(FirmInquiry.status == status_filter)

    inquiries = query.order_by(FirmInquiry.created_at.desc()).limit(200).all()

    return [{
        "id":            i.id,
        "name":          i.name,
        "email":         i.email,
        "phone":         i.phone,
        "subject":       i.subject,
        "message":       i.message,
        "practice_area": i.practice_area,
        "status":        i.status.value,
        "assigned_to":   i.assigned_to,
        "notes":         i.notes,
        "created_at":    i.created_at,
    } for i in inquiries]


@router.put("/{firm_id}/inquiries/{inquiry_id}")
def update_inquiry(
    firm_id:      str,
    inquiry_id:   str,
    payload:      InquiryUpdate,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an inquiry's status/assignment/notes."""
    firm = get_firm_or_404(db, firm_id)
    require_firm_member(db, firm.id, current_user.id)

    inquiry = db.query(FirmInquiry).filter(
        FirmInquiry.id == inquiry_id,
        FirmInquiry.firm_id == firm.id,
    ).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(inquiry, k, v)
    db.commit()
    return {"message": "Inquiry updated"}


# ═════════════════════════════════════════════════════════════════
# REVIEWS
# ═════════════════════════════════════════════════════════════════

@router.post("/{firm_slug}/reviews")
def create_review(
    firm_slug:    str,
    payload:      ReviewCreate,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Authenticated user posts a review. One review per user per firm."""
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")

    firm = get_firm_or_404(db, firm_slug)

    # Members can't review their own firm
    existing_member = db.query(FirmMember).filter(
        FirmMember.firm_id == firm.id,
        FirmMember.user_id == current_user.id,
    ).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="Cannot review your own firm")

    # Update or insert
    review = db.query(FirmReview).filter(
        FirmReview.firm_id == firm.id,
        FirmReview.user_id == current_user.id,
    ).first()

    if review:
        review.rating  = payload.rating
        review.comment = payload.comment
    else:
        review = FirmReview(
            firm_id=firm.id,
            user_id=current_user.id,
            rating=payload.rating,
            comment=payload.comment,
        )
        db.add(review)

    db.flush()

    # Recompute firm rating average
    avg, count = db.query(
        func.avg(FirmReview.rating),
        func.count(FirmReview.id),
    ).filter(FirmReview.firm_id == firm.id).first()

    firm.rating_avg   = float(avg) if avg else 0.0
    firm.rating_count = count or 0

    db.commit()
    return {"message": "Review saved", "rating": review.rating}


@router.get("/{firm_slug}/reviews")
def list_reviews(
    firm_slug: str,
    db:        Session = Depends(get_db),
):
    """Public — anyone can read reviews."""
    firm = get_firm_or_404(db, firm_slug)
    reviews = (db.query(FirmReview)
                 .filter(FirmReview.firm_id == firm.id)
                 .order_by(FirmReview.created_at.desc())
                 .limit(100)
                 .all())

    return {
        "rating_avg":   firm.rating_avg or 0.0,
        "rating_count": firm.rating_count or 0,
        "reviews": [{
            "id":         r.id,
            "rating":     r.rating,
            "comment":    r.comment,
            "user_name":  r.user.full_name if r.user else "Anonymous",
            "created_at": r.created_at,
            "is_verified": r.is_verified,
        } for r in reviews],
    }
