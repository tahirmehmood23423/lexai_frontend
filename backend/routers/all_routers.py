# ═══════════════════════════════════════════════════════════════
# backend/routers/all_routers.py
# Utility routes — health, profile, lawyer discovery, lawyer profile mgmt
# ═══════════════════════════════════════════════════════════════

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db, User, LawyerProfile, Case, Booking, Message, MessageThread
from routers.auth import get_current_user
import uuid

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# HEALTH & STATUS
# ─────────────────────────────────────────────────────────────
@router.get("/health")
def health():
    """General health check."""
    return {
        "status": "ok",
        "service": "LexAI API v3.0",
        "message": "Server is running"
    }

@router.get("/status")
def status(db: Session = Depends(get_db)):
    """Check database connectivity."""
    try:
        db.execute("SELECT 1")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "database": db_status,
        "api": "running",
        "timestamp": __import__('datetime').datetime.utcnow().isoformat()
    }

# ─────────────────────────────────────────────────────────────
# USER PROFILE
# ─────────────────────────────────────────────────────────────
@router.get("/profile")
def get_profile(user: User = Depends(get_current_user)):
    """Get current user profile."""
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "city": user.city,
        "phone": user.phone,
        "avatar_url": user.avatar_url,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }

@router.put("/profile")
def update_profile(
    data: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update current user profile."""
    allowed_fields = ['full_name', 'phone', 'city', 'avatar_url']
    for field in allowed_fields:
        if field in data:
            setattr(user, field, data[field])
    
    db.commit()
    return {"message": "Profile updated"}

# ─────────────────────────────────────────────────────────────
# SEARCH & DISCOVERY
# ─────────────────────────────────────────────────────────────
@router.get("/search/cities")
def search_cities(db: Session = Depends(get_db)):
    """Get list of cities with users/lawyers."""
    cities = db.query(User.city).distinct().filter(User.city.isnot(None)).limit(50).all()
    return {"cities": [c[0] for c in cities if c[0]]}

@router.get("/search/provinces")
def search_provinces():
    """Get list of Pakistani provinces."""
    return {
        "provinces": [
            "Punjab",
            "Sindh",
            "KPK",
            "Balochistan",
            "Federal",
        ]
    }

# ─────────────────────────────────────────────────────────────
# STATS (public or admin only)
# ─────────────────────────────────────────────────────────────
@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """Public platform statistics."""
    total_users = db.query(User).count()
    total_lawyers = db.query(User).filter(User.role.in_(["lawyer", "firm_admin"])).count()
    
    return {
        "total_users": total_users,
        "total_lawyers": total_lawyers,
        "total_clients": total_users - total_lawyers,
    }

# ─────────────────────────────────────────────────────────────
# LAWYER DISCOVERY
# ─────────────────────────────────────────────────────────────
@router.get("/lawyers")
def search_lawyers(
    city: str = None,
    specialization: str = None,
    min_rating: float = 0,
    db: Session = Depends(get_db)
):
    """Search for lawyers."""
    query = db.query(LawyerProfile).filter(LawyerProfile.is_available == True)
    
    if city:
        query = query.filter(LawyerProfile.city == city)
    if min_rating > 0:
        query = query.filter(LawyerProfile.rating_avg >= min_rating)
    
    lawyers = query.order_by(LawyerProfile.rating_avg.desc()).limit(50).all()
    
    result = []
    for lp in lawyers:
        if lp.user:
            result.append({
                "id": lp.id,
                "user_id": lp.user.id,
                "full_name": lp.user.full_name,
                "city": lp.city,
                "specializations": lp.specializations or [],
                "experience_years": lp.experience_years,
                "rating_avg": lp.rating_avg,
                "rating_count": lp.rating_count,
                "consultation_fee": lp.consultation_fee,
                "profile_photo_url": lp.profile_photo_url,
            })
    
    return {"lawyers": result, "total": len(result)}

def _lp_dict(lp: LawyerProfile) -> dict:
    u = lp.user
    return {
        "id": lp.id,
        "user_id": u.id if u else None,
        "full_name": u.full_name if u else "Unknown",
        "email": u.email if u else None,
        "bio": lp.bio,
        "city": lp.city,
        "province": lp.province,
        "office_address": lp.office_address,
        "specializations": lp.specializations or [],
        "experience_years": lp.experience_years,
        "education": lp.education or [],
        "languages": lp.languages or [],
        "court_types": lp.court_types or [],
        "consultation_fee": lp.consultation_fee,
        "is_available": lp.is_available,
        "is_verified": lp.is_verified,
        "rating_avg": lp.rating_avg,
        "rating_count": lp.rating_count,
        "profile_photo_url": lp.profile_photo_url,
        "bar_council_no": lp.bar_council_no,
        "role_in_firm": lp.role_in_firm,
        "firm_id": lp.firm_id,
    }


@router.get("/lawyers/me")
def get_my_lawyer_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if user.role not in ["lawyer", "firm_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Not a lawyer account")
    lp = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    if not lp:
        return None
    return _lp_dict(lp)


@router.post("/lawyers/me", status_code=201)
def create_or_update_lawyer_profile(
    data: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if user.role not in ["lawyer", "firm_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Not a lawyer account")

    lp = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    if not lp:
        lp = LawyerProfile(id=str(uuid.uuid4()), user_id=user.id)
        db.add(lp)

    allowed = [
        "bio", "city", "province", "office_address", "specializations",
        "experience_years", "education", "languages", "court_types",
        "consultation_fee", "is_available", "profile_photo_url", "bar_council_no",
        "role_in_firm",
    ]
    for field in allowed:
        if field in data:
            setattr(lp, field, data[field])

    db.commit()
    db.refresh(lp)
    return _lp_dict(lp)


@router.get("/lawyers/{lawyer_id}")
def get_lawyer(lawyer_id: str, db: Session = Depends(get_db)):
    lp = db.query(LawyerProfile).filter(LawyerProfile.id == lawyer_id).first()
    if not lp:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    if not lp.user:
        raise HTTPException(status_code=404, detail="Lawyer user not found")
    return _lp_dict(lp)


@router.get("/dashboard/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Quick stats for the current user's dashboard."""
    if user.role in ["lawyer", "firm_admin", "admin"]:
        lp = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
        lp_id = lp.id if lp else None
        total_cases = db.query(Case).filter(Case.lawyer_id == lp_id).count() if lp_id else 0
        active_cases = db.query(Case).filter(Case.lawyer_id == lp_id, Case.status.in_(["open", "active"])).count() if lp_id else 0
        total_bookings = db.query(Booking).filter(Booking.lawyer_id == lp_id).count() if lp_id else 0
        pending_bookings = db.query(Booking).filter(Booking.lawyer_id == lp_id, Booking.status == "pending").count() if lp_id else 0
    else:
        total_cases = db.query(Case).filter(Case.client_id == user.id).count()
        active_cases = db.query(Case).filter(Case.client_id == user.id, Case.status.in_(["open", "active"])).count()
        total_bookings = db.query(Booking).filter(Booking.client_id == user.id).count()
        pending_bookings = db.query(Booking).filter(Booking.client_id == user.id, Booking.status == "pending").count()

    unread_msgs = (
        db.query(Message)
        .join(MessageThread, Message.thread_id == MessageThread.id)
        .filter(
            Message.sender_id != user.id,
            Message.is_read == False,
            (MessageThread.client_id == user.id) | (MessageThread.lawyer_id == user.id)
        )
        .count()
    )

    return {
        "total_cases": total_cases,
        "active_cases": active_cases,
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "unread_messages": unread_msgs,
    }
