# ═══════════════════════════════════════════════════════════════
# backend/routers/all_routers.py
# Utility routes — health, openapi, misc endpoints
# ═══════════════════════════════════════════════════════════════

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db, User, LawyerProfile
from routers.auth import get_current_user

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

@router.get("/lawyers/{lawyer_id}")
def get_lawyer(lawyer_id: str, db: Session = Depends(get_db)):
    """Get lawyer profile details."""
    lp = db.query(LawyerProfile).filter(LawyerProfile.id == lawyer_id).first()
    if not lp:
        raise __import__('fastapi').HTTPException(status_code=404, detail="Lawyer not found")
    
    if not lp.user:
        raise __import__('fastapi').HTTPException(status_code=404, detail="Lawyer user not found")
    
    return {
        "id": lp.id,
        "user_id": lp.user.id,
        "full_name": lp.user.full_name,
        "bio": lp.bio,
        "city": lp.city,
        "specializations": lp.specializations or [],
        "experience_years": lp.experience_years,
        "education": lp.education or [],
        "languages": lp.languages or [],
        "rating_avg": lp.rating_avg,
        "rating_count": lp.rating_count,
        "consultation_fee": lp.consultation_fee,
        "profile_photo_url": lp.profile_photo_url,
        "is_verified": lp.is_verified,
        "office_address": lp.office_address,
    }
