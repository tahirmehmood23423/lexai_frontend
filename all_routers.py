# ─────────────────────────────────────────────────────────────
# routers/documents.py — File upload/download via Supabase Storage
# ─────────────────────────────────────────────────────────────

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os, uuid, httpx

from core.database import get_db, Document, Case, User
from routers.auth import get_current_user

router = APIRouter()

SUPABASE_URL    = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY    = os.getenv("SUPABASE_SERVICE_KEY", "")
STORAGE_BUCKET  = "case-documents"


async def upload_to_supabase(file: UploadFile, path: str) -> str:
    """Upload a file to Supabase Storage and return public URL."""
    content = await file.read()
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": file.content_type or "application/octet-stream",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{path}",
            headers=headers,
            content=content
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail=f"Storage upload failed: {resp.text}")

    return f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{path}"


@router.post("/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    case_id: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_private: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a legal document. Supports PDF, DOCX, JPG, PNG."""
    # Validate file type
    allowed_types = {"application/pdf", "application/msword",
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                     "image/jpeg", "image/png"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not allowed")

    # Validate file size (max 20MB)
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    # Build storage path: case_id/uuid_filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    storage_path = f"{case_id or 'general'}/{uuid.uuid4()}.{ext}"

    file_url = await upload_to_supabase(file, storage_path)

    doc = Document(
        case_id=case_id,
        uploader_id=current_user.id,
        file_name=file.filename,
        file_url=file_url,
        file_size=size,
        file_type=ext,
        category=category,
        description=description,
        is_private=is_private,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/case/{case_id}")
def get_case_documents(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all documents for a case. Clients don't see private docs."""
    query = db.query(Document).filter(Document.case_id == case_id)
    if current_user.role != "lawyer":
        query = query.filter(Document.is_private == False)
    return query.order_by(Document.created_at.desc()).all()


@router.delete("/{doc_id}")
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.uploader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your document")

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}


# ─────────────────────────────────────────────────────────────
# routers/messages.py — Real-time messaging between client & lawyer
# ─────────────────────────────────────────────────────────────

from fastapi import APIRouter as MAPIRouter, WebSocket, WebSocketDisconnect
from core.database import Message, MessageThread
import json
from collections import defaultdict

m_router = MAPIRouter()

# In-memory WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, thread_id: str, websocket: WebSocket):
        await websocket.accept()
        self.connections[thread_id].append(websocket)

    def disconnect(self, thread_id: str, websocket: WebSocket):
        self.connections[thread_id].remove(websocket)

    async def broadcast(self, thread_id: str, message: dict):
        for ws in self.connections[thread_id]:
            try:
                await ws.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()


@m_router.get("/threads")
def get_my_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all message threads for the current user."""
    if current_user.role == "lawyer":
        lawyer_user_id = current_user.id
        threads = db.query(MessageThread).filter(
            MessageThread.lawyer_id == lawyer_user_id
        ).all()
    else:
        threads = db.query(MessageThread).filter(
            MessageThread.client_id == current_user.id
        ).all()
    return threads


@m_router.get("/threads/{thread_id}/messages")
def get_thread_messages(
    thread_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    messages = db.query(Message).filter(
        Message.thread_id == thread_id
    ).order_by(Message.created_at).all()

    # Mark messages as read
    for msg in messages:
        if msg.sender_id != current_user.id:
            msg.is_read = True
    db.commit()

    return messages


@m_router.post("/threads/{thread_id}/messages")
async def send_message(
    thread_id: str,
    content: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = Message(
        thread_id=thread_id,
        sender_id=current_user.id,
        content=content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Broadcast to any connected WebSocket clients in this thread
    await manager.broadcast(thread_id, {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "sender_name": current_user.full_name,
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    })

    return msg


@m_router.websocket("/ws/{thread_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    thread_id: str,
    db: Session = Depends(get_db)
):
    """WebSocket for real-time messaging in a thread."""
    await manager.connect(thread_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast received message to all in thread
            await manager.broadcast(thread_id, json.loads(data))
    except WebSocketDisconnect:
        manager.disconnect(thread_id, websocket)


# ─────────────────────────────────────────────────────────────
# routers/lawyers.py — Lawyer search and profile management
# ─────────────────────────────────────────────────────────────

from fastapi import APIRouter as LAPIRouter, Query
from core.database import LawyerProfile
from pydantic import BaseModel as LBaseModel
from typing import List as LList

l_router = LAPIRouter()


class LawyerProfileCreate(LBaseModel):
    bar_council_no: Optional[str] = None
    specializations: LList[str] = []
    experience_years: int = 0
    education: LList[dict] = []
    languages: LList[str] = ["Urdu", "English"]
    consultation_fee: float = 0.0
    bio: Optional[str] = None
    office_address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    court_types: LList[str] = []


@l_router.get("/search")
def search_lawyers(
    specialization: Optional[str] = None,
    city: Optional[str] = None,
    province: Optional[str] = None,
    min_experience: Optional[int] = None,
    max_fee: Optional[float] = None,
    language: Optional[str] = None,
    q: Optional[str] = None,         # Free text search on name / bio
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db)
):
    """Search and filter lawyers — public endpoint, no auth required."""
    query = db.query(LawyerProfile).filter(
        LawyerProfile.is_available == True
    )

    if city:
        query = query.filter(LawyerProfile.city.ilike(f"%{city}%"))
    if province:
        query = query.filter(LawyerProfile.province.ilike(f"%{province}%"))
    if min_experience:
        query = query.filter(LawyerProfile.experience_years >= min_experience)
    if max_fee:
        query = query.filter(LawyerProfile.consultation_fee <= max_fee)

    # Specialization filter (JSON array field — PostgreSQL contains)
    if specialization:
        query = query.filter(
            LawyerProfile.specializations.cast(db.bind.dialect.type_descriptor).contains(specialization)
        )

    offset = (page - 1) * limit
    lawyers = query.order_by(LawyerProfile.rating_avg.desc()).offset(offset).limit(limit).all()
    total = query.count()

    return {"lawyers": lawyers, "total": total, "page": page, "pages": (total + limit - 1) // limit}


@l_router.get("/{lawyer_id}")
def get_lawyer_profile(lawyer_id: str, db: Session = Depends(get_db)):
    """Get a lawyer's public profile."""
    lawyer = db.query(LawyerProfile).filter(LawyerProfile.id == lawyer_id).first()
    if not lawyer:
        raise HTTPException(status_code=404, detail="Lawyer not found")
    return lawyer


@l_router.post("/profile", status_code=201)
def create_lawyer_profile(
    data: LawyerProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create lawyer profile (only for users with lawyer role)."""
    if current_user.role != "lawyer":
        raise HTTPException(status_code=403, detail="Only lawyers can create a profile")
    if current_user.lawyer_profile:
        raise HTTPException(status_code=400, detail="Profile already exists")

    profile = LawyerProfile(
        user_id=current_user.id,
        **data.dict()
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@l_router.put("/profile")
def update_lawyer_profile(
    data: LawyerProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.lawyer_profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    for field, value in data.dict(exclude_none=True).items():
        setattr(current_user.lawyer_profile, field, value)
    db.commit()
    return current_user.lawyer_profile


# ─────────────────────────────────────────────────────────────
# routers/bookings.py — Consultation bookings
# ─────────────────────────────────────────────────────────────

from fastapi import APIRouter as BAPIRouter
from core.database import Booking, BookingStatus, ConsultationType

b_router = BAPIRouter()


class BookingCreate(LBaseModel):
    lawyer_id: str
    consultation_type: ConsultationType = ConsultationType.video
    scheduled_at: datetime
    duration_minutes: int = 30
    notes: Optional[str] = None


@b_router.post("/", status_code=201)
def create_booking(
    data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Client books a consultation with a lawyer."""
    lawyer = db.query(LawyerProfile).filter(LawyerProfile.id == data.lawyer_id).first()
    if not lawyer:
        raise HTTPException(status_code=404, detail="Lawyer not found")

    booking = Booking(
        client_id=current_user.id,
        lawyer_id=data.lawyer_id,
        consultation_type=data.consultation_type,
        scheduled_at=data.scheduled_at,
        duration_minutes=data.duration_minutes,
        notes=data.notes,
        fee=lawyer.consultation_fee,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@b_router.get("/my")
def my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "lawyer":
        return db.query(Booking).filter(
            Booking.lawyer_id == current_user.lawyer_profile.id
        ).order_by(Booking.scheduled_at.desc()).all()
    return db.query(Booking).filter(
        Booking.client_id == current_user.id
    ).order_by(Booking.scheduled_at.desc()).all()


@b_router.put("/{booking_id}/status")
def update_booking_status(
    booking_id: str,
    status: BookingStatus,
    meet_link: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lawyer confirms/cancels booking and adds meeting link."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = status
    if meet_link:
        booking.meet_link = meet_link
    db.commit()
    return booking


# ─────────────────────────────────────────────────────────────
# routers/reviews.py — Client reviews for lawyers
# ─────────────────────────────────────────────────────────────

from fastapi import APIRouter as RAPIRouter
from core.database import Review
from sqlalchemy import func as sqlfunc

r_router = RAPIRouter()


class ReviewCreate(LBaseModel):
    lawyer_id: str
    booking_id: Optional[str] = None
    rating: int      # 1–5
    comment: Optional[str] = None


@r_router.post("/", status_code=201)
def create_review(
    data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not 1 <= data.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    review = Review(
        client_id=current_user.id,
        lawyer_id=data.lawyer_id,
        booking_id=data.booking_id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    db.commit()

    # Recompute lawyer rating average
    avg = db.query(sqlfunc.avg(Review.rating)).filter(
        Review.lawyer_id == data.lawyer_id
    ).scalar()
    count = db.query(sqlfunc.count(Review.id)).filter(
        Review.lawyer_id == data.lawyer_id
    ).scalar()

    lawyer = db.query(LawyerProfile).filter(LawyerProfile.id == data.lawyer_id).first()
    if lawyer:
        lawyer.rating_avg = round(avg, 2)
        lawyer.rating_count = count
        db.commit()

    return review


@r_router.get("/lawyer/{lawyer_id}")
def get_lawyer_reviews(lawyer_id: str, db: Session = Depends(get_db)):
    return db.query(Review).filter(Review.lawyer_id == lawyer_id).order_by(
        Review.created_at.desc()
    ).all()
