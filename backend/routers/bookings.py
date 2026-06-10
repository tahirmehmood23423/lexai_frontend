# backend/routers/bookings.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from core.database import get_db, User, Booking, LawyerProfile
from routers.auth import get_current_user

router = APIRouter()


def _booking_dict(b: Booking, db: Session) -> dict:
    client = db.query(User).filter(User.id == b.client_id).first()
    lp = db.query(LawyerProfile).filter(LawyerProfile.id == b.lawyer_id).first()
    lawyer_user = db.query(User).filter(User.id == lp.user_id).first() if lp else None
    return {
        "id": b.id,
        "client_id": b.client_id,
        "client_name": client.full_name if client else "Unknown",
        "client_email": client.email if client else None,
        "lawyer_id": b.lawyer_id,
        "lawyer_name": lawyer_user.full_name if lawyer_user else "Unknown",
        "consultation_type": b.consultation_type,
        "scheduled_at": b.scheduled_at.isoformat() if b.scheduled_at else None,
        "duration_minutes": b.duration_minutes,
        "status": b.status,
        "notes": b.notes,
        "fee": b.fee,
        "meet_link": b.meet_link,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


@router.get("/")
def list_bookings(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if user.role in ["lawyer", "firm_admin", "admin"]:
        lp = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
        if not lp:
            return {"bookings": [], "total": 0}
        query = db.query(Booking).filter(Booking.lawyer_id == lp.id)
    else:
        query = db.query(Booking).filter(Booking.client_id == user.id)

    if status:
        query = query.filter(Booking.status == status)

    bookings = query.order_by(Booking.scheduled_at.desc()).all()
    return {"bookings": [_booking_dict(b, db) for b in bookings], "total": len(bookings)}


class BookingCreate(BaseModel):
    lawyer_id: str
    scheduled_at: datetime
    consultation_type: str = "video"
    duration_minutes: int = 30
    notes: Optional[str] = None


@router.post("/", status_code=201)
def create_booking(
    data: BookingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if user.role not in ["client"]:
        raise HTTPException(status_code=403, detail="Only clients can book consultations")

    lp = db.query(LawyerProfile).filter(LawyerProfile.id == data.lawyer_id).first()
    if not lp:
        raise HTTPException(status_code=404, detail="Lawyer not found")

    booking = Booking(
        id=str(uuid.uuid4()),
        client_id=user.id,
        lawyer_id=data.lawyer_id,
        consultation_type=data.consultation_type,
        scheduled_at=data.scheduled_at,
        duration_minutes=data.duration_minutes,
        status="pending",
        notes=data.notes,
        fee=lp.consultation_fee,
    )
    db.add(booking)
    db.commit()
    return _booking_dict(booking, db)


class BookingStatusUpdate(BaseModel):
    status: str
    meet_link: Optional[str] = None


@router.put("/{booking_id}")
def update_booking(
    booking_id: str,
    data: BookingStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    lp = db.query(LawyerProfile).filter(LawyerProfile.id == booking.lawyer_id).first()
    is_lawyer = lp and lp.user_id == user.id
    is_client = booking.client_id == user.id

    if not (is_lawyer or is_client or user.role == "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")

    if data.status not in ["confirmed", "cancelled", "completed", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    booking.status = data.status
    if data.meet_link:
        booking.meet_link = data.meet_link
    db.commit()
    return _booking_dict(booking, db)
