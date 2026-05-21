# ─────────────────────────────────────────────────────────────
# core/database.py — SQLAlchemy setup + all ORM models
# Free DB: Supabase PostgreSQL (supabase.com → free tier = 500MB)
# ─────────────────────────────────────────────────────────────

from sqlalchemy import (
    create_engine, Column, String, Integer, Float, Boolean,
    DateTime, Text, ForeignKey, Enum, JSON
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.sql import func
import os, enum, uuid

# ── Connection string from environment variable ──
# Set in Render.com dashboard: DATABASE_URL=postgresql://user:pass@host/db
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/lexai"   # local dev default
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency injected into every route that needs DB access."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ════════════════════════════════════════
# ENUMS
# ════════════════════════════════════════

class UserRole(str, enum.Enum):
    client = "client"
    lawyer = "lawyer"
    admin  = "admin"

class CaseStatus(str, enum.Enum):
    open       = "open"
    active     = "active"
    on_hold    = "on_hold"
    closed     = "closed"
    won        = "won"
    lost       = "lost"

class HearingStatus(str, enum.Enum):
    scheduled  = "scheduled"
    completed  = "completed"
    adjourned  = "adjourned"
    cancelled  = "cancelled"

class BookingStatus(str, enum.Enum):
    pending    = "pending"
    confirmed  = "confirmed"
    cancelled  = "cancelled"
    completed  = "completed"

class ConsultationType(str, enum.Enum):
    video      = "video"
    in_person  = "in_person"
    phone      = "phone"


# ════════════════════════════════════════
# MODELS
# ════════════════════════════════════════

class User(Base):
    __tablename__ = "users"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email         = Column(String, unique=True, nullable=False, index=True)
    full_name     = Column(String, nullable=False)
    password_hash = Column(String, nullable=True)       # Null for Google OAuth users
    role          = Column(Enum(UserRole), default=UserRole.client)
    phone         = Column(String, nullable=True)
    city          = Column(String, nullable=True)
    avatar_url    = Column(String, nullable=True)
    is_active     = Column(Boolean, default=True)
    is_verified   = Column(Boolean, default=False)
    google_id     = Column(String, nullable=True, unique=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    lawyer_profile = relationship("LawyerProfile", back_populates="user", uselist=False)
    sent_messages  = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    bookings       = relationship("Booking", foreign_keys="Booking.client_id", back_populates="client")
    reviews_given  = relationship("Review", foreign_keys="Review.client_id", back_populates="client")


class LawyerProfile(Base):
    __tablename__ = "lawyer_profiles"

    id                = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id           = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    bar_council_no    = Column(String, nullable=True)
    specializations   = Column(JSON, default=list)        # ["Criminal", "Family", "Corporate"]
    experience_years  = Column(Integer, default=0)
    education         = Column(JSON, default=list)        # [{"degree": "LLB", "university": "PU", "year": 2015}]
    languages         = Column(JSON, default=list)        # ["Urdu", "English", "Punjabi"]
    consultation_fee  = Column(Float, default=0.0)        # PKR per session
    bio               = Column(Text, nullable=True)
    office_address    = Column(String, nullable=True)
    city              = Column(String, nullable=True)
    province          = Column(String, nullable=True)
    court_types       = Column(JSON, default=list)        # ["High Court", "Sessions Court"]
    is_verified       = Column(Boolean, default=False)    # Admin verifies bar council number
    is_available      = Column(Boolean, default=True)
    rating_avg        = Column(Float, default=0.0)
    rating_count      = Column(Integer, default=0)
    profile_photo_url = Column(String, nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user      = relationship("User", back_populates="lawyer_profile")
    cases     = relationship("Case", back_populates="lawyer")
    bookings  = relationship("Booking", back_populates="lawyer")
    reviews   = relationship("Review", back_populates="lawyer")


class Case(Base):
    __tablename__ = "cases"

    id               = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title            = Column(String, nullable=False)
    description      = Column(Text, nullable=True)
    case_number      = Column(String, nullable=True)           # Court-assigned number
    case_type        = Column(String, nullable=False)          # "Criminal", "Civil", "Family" etc.
    court_name       = Column(String, nullable=True)
    status           = Column(Enum(CaseStatus), default=CaseStatus.open)
    client_id        = Column(String, ForeignKey("users.id"), nullable=False)
    lawyer_id        = Column(String, ForeignKey("lawyer_profiles.id"), nullable=False)
    filing_date      = Column(DateTime(timezone=True), nullable=True)
    next_hearing_date= Column(DateTime(timezone=True), nullable=True)
    notes            = Column(Text, nullable=True)             # Lawyer private notes
    opposing_party   = Column(String, nullable=True)
    opposing_lawyer  = Column(String, nullable=True)
    judge_name       = Column(String, nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    lawyer    = relationship("LawyerProfile", back_populates="cases")
    client    = relationship("User", foreign_keys=[client_id])
    hearings  = relationship("Hearing", back_populates="case", order_by="Hearing.date")
    documents = relationship("Document", back_populates="case")
    thread    = relationship("MessageThread", back_populates="case", uselist=False)
    updates   = relationship("CaseUpdate", back_populates="case", order_by="CaseUpdate.created_at.desc()")


class CaseUpdate(Base):
    """Lawyer posts updates visible to client — a timeline of case events."""
    __tablename__ = "case_updates"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id    = Column(String, ForeignKey("cases.id"), nullable=False)
    author_id  = Column(String, ForeignKey("users.id"), nullable=False)
    content    = Column(Text, nullable=False)
    is_visible_to_client = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    case   = relationship("Case", back_populates="updates")
    author = relationship("User")


class Hearing(Base):
    __tablename__ = "hearings"

    id           = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id      = Column(String, ForeignKey("cases.id"), nullable=False)
    date         = Column(DateTime(timezone=True), nullable=False)
    court_room   = Column(String, nullable=True)
    court_name   = Column(String, nullable=True)
    purpose      = Column(String, nullable=True)              # "Arguments", "Evidence", "Judgment"
    status       = Column(Enum(HearingStatus), default=HearingStatus.scheduled)
    outcome      = Column(Text, nullable=True)                # What happened at the hearing
    next_date    = Column(DateTime(timezone=True), nullable=True)
    reminder_sent= Column(Boolean, default=False)
    notes        = Column(Text, nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    case = relationship("Case", back_populates="hearings")


class Document(Base):
    __tablename__ = "documents"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id       = Column(String, ForeignKey("cases.id"), nullable=True)
    uploader_id   = Column(String, ForeignKey("users.id"), nullable=False)
    file_name     = Column(String, nullable=False)
    file_url      = Column(String, nullable=False)             # Supabase Storage URL
    file_size     = Column(Integer, nullable=True)             # Bytes
    file_type     = Column(String, nullable=True)              # "pdf", "docx", "jpg"
    category      = Column(String, nullable=True)              # "Petition", "Evidence", "Order"
    description   = Column(String, nullable=True)
    is_private    = Column(Boolean, default=False)             # If True, client cannot see
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    case     = relationship("Case", back_populates="documents")
    uploader = relationship("User")


class MessageThread(Base):
    """One thread per case between client and lawyer."""
    __tablename__ = "message_threads"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id    = Column(String, ForeignKey("cases.id"), nullable=True)
    client_id  = Column(String, ForeignKey("users.id"), nullable=False)
    lawyer_id  = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    case     = relationship("Case", back_populates="thread")
    messages = relationship("Message", back_populates="thread", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"

    id          = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    thread_id   = Column(String, ForeignKey("message_threads.id"), nullable=False)
    sender_id   = Column(String, ForeignKey("users.id"), nullable=False)
    content     = Column(Text, nullable=True)
    file_url    = Column(String, nullable=True)            # Attached file
    file_name   = Column(String, nullable=True)
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    thread = relationship("MessageThread", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")


class Booking(Base):
    """Consultation booking — client books a time slot with a lawyer."""
    __tablename__ = "bookings"

    id                = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id         = Column(String, ForeignKey("users.id"), nullable=False)
    lawyer_id         = Column(String, ForeignKey("lawyer_profiles.id"), nullable=False)
    consultation_type = Column(Enum(ConsultationType), default=ConsultationType.video)
    scheduled_at      = Column(DateTime(timezone=True), nullable=False)
    duration_minutes  = Column(Integer, default=30)
    status            = Column(Enum(BookingStatus), default=BookingStatus.pending)
    notes             = Column(Text, nullable=True)            # Client's issue description
    fee               = Column(Float, nullable=True)
    meet_link         = Column(String, nullable=True)          # Google Meet / Zoom link
    created_at        = Column(DateTime(timezone=True), server_default=func.now())

    client = relationship("User", foreign_keys=[client_id], back_populates="bookings")
    lawyer = relationship("LawyerProfile", back_populates="bookings")


class Review(Base):
    __tablename__ = "reviews"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id  = Column(String, ForeignKey("users.id"), nullable=False)
    lawyer_id  = Column(String, ForeignKey("lawyer_profiles.id"), nullable=False)
    booking_id = Column(String, ForeignKey("bookings.id"), nullable=True)
    rating     = Column(Integer, nullable=False)               # 1–5
    comment    = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    client = relationship("User", foreign_keys=[client_id], back_populates="reviews_given")
    lawyer = relationship("LawyerProfile", back_populates="reviews")
