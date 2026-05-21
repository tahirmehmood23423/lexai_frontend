# ─────────────────────────────────────────────────────────────
# routers/cases.py — Full case management for lawyers & clients
# ─────────────────────────────────────────────────────────────

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from core.database import get_db, Case, CaseUpdate, CaseStatus, User
from routers.auth import get_current_user, require_lawyer

router = APIRouter()


# ── Schemas ──

class CaseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    case_number: Optional[str] = None
    case_type: str                    # "Criminal", "Civil", "Family", "Corporate" etc.
    court_name: Optional[str] = None
    client_id: str
    filing_date: Optional[datetime] = None
    opposing_party: Optional[str] = None
    opposing_lawyer: Optional[str] = None
    judge_name: Optional[str] = None

class CaseUpdate_(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    case_number: Optional[str] = None
    court_name: Optional[str] = None
    status: Optional[CaseStatus] = None
    next_hearing_date: Optional[datetime] = None
    notes: Optional[str] = None
    opposing_party: Optional[str] = None
    judge_name: Optional[str] = None

class CaseUpdatePost(BaseModel):
    content: str
    is_visible_to_client: bool = True


# ── Routes ──

@router.get("/")
def list_cases(
    status: Optional[CaseStatus] = None,
    case_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lawyer sees all their cases.
    Client sees only their own cases.
    """
    query = db.query(Case)

    if current_user.role == "lawyer":
        lawyer_profile = current_user.lawyer_profile
        if not lawyer_profile:
            return []
        query = query.filter(Case.lawyer_id == lawyer_profile.id)
    else:
        query = query.filter(Case.client_id == current_user.id)

    if status:
        query = query.filter(Case.status == status)
    if case_type:
        query = query.filter(Case.case_type == case_type)

    return query.order_by(Case.updated_at.desc()).all()


@router.post("/", status_code=201)
def create_case(
    data: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lawyer)
):
    """Lawyers create cases for their clients."""
    lawyer_profile = current_user.lawyer_profile
    if not lawyer_profile:
        raise HTTPException(status_code=400, detail="Lawyer profile not set up yet")

    # Verify client exists
    client = db.query(User).filter(User.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    case = Case(
        title=data.title,
        description=data.description,
        case_number=data.case_number,
        case_type=data.case_type,
        court_name=data.court_name,
        client_id=data.client_id,
        lawyer_id=lawyer_profile.id,
        filing_date=data.filing_date,
        opposing_party=data.opposing_party,
        opposing_lawyer=data.opposing_lawyer,
        judge_name=data.judge_name,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@router.get("/{case_id}")
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Access control: only the assigned lawyer or client can view
    if current_user.role == "lawyer":
        if not current_user.lawyer_profile or case.lawyer_id != current_user.lawyer_profile.id:
            raise HTTPException(status_code=403, detail="Not your case")
    else:
        if case.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your case")

    return case


@router.put("/{case_id}")
def update_case(
    case_id: str,
    data: CaseUpdate_,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lawyer)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.lawyer_id != current_user.lawyer_profile.id:
        raise HTTPException(status_code=403, detail="Not your case")

    for field, value in data.dict(exclude_none=True).items():
        setattr(case, field, value)
    db.commit()
    db.refresh(case)
    return case


@router.post("/{case_id}/updates")
def post_case_update(
    case_id: str,
    data: CaseUpdatePost,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Post a timeline update on a case (lawyer only, visible to client)."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    update = CaseUpdate(
        case_id=case_id,
        author_id=current_user.id,
        content=data.content,
        is_visible_to_client=data.is_visible_to_client
    )
    db.add(update)
    db.commit()
    return {"message": "Update posted", "id": update.id}


# ─────────────────────────────────────────────────────────────
# routers/hearings.py — Hearing schedule management
# ─────────────────────────────────────────────────────────────

from fastapi import APIRouter as HAPIRouter
from core.database import Hearing, HearingStatus
import resend, os

h_router = HAPIRouter()
resend.api_key = os.getenv("RESEND_API_KEY", "")


class HearingCreate(BaseModel):
    case_id: str
    date: datetime
    court_room: Optional[str] = None
    court_name: Optional[str] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None

class HearingUpdateSchema(BaseModel):
    date: Optional[datetime] = None
    court_room: Optional[str] = None
    purpose: Optional[str] = None
    status: Optional[HearingStatus] = None
    outcome: Optional[str] = None
    next_date: Optional[datetime] = None
    notes: Optional[str] = None


@h_router.get("/case/{case_id}")
def get_hearings_for_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all hearings for a specific case."""
    return db.query(Hearing).filter(Hearing.case_id == case_id).order_by(Hearing.date).all()


@h_router.get("/upcoming")
def get_upcoming_hearings(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lawyer)
):
    """Get lawyer's hearings in the next N days."""
    from datetime import date, timedelta
    lawyer_profile = current_user.lawyer_profile
    cutoff = datetime.utcnow() + timedelta(days=days)

    hearings = (
        db.query(Hearing)
        .join(Case)
        .filter(
            Case.lawyer_id == lawyer_profile.id,
            Hearing.date >= datetime.utcnow(),
            Hearing.date <= cutoff,
            Hearing.status == HearingStatus.scheduled
        )
        .order_by(Hearing.date)
        .all()
    )
    return hearings


@h_router.post("/", status_code=201)
def create_hearing(
    data: HearingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lawyer)
):
    """Schedule a new court hearing."""
    case = db.query(Case).filter(Case.id == data.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.lawyer_id != current_user.lawyer_profile.id:
        raise HTTPException(status_code=403, detail="Not your case")

    hearing = Hearing(
        case_id=data.case_id,
        date=data.date,
        court_room=data.court_room,
        court_name=data.court_name,
        purpose=data.purpose,
        notes=data.notes,
    )
    db.add(hearing)

    # Update case next hearing date
    case.next_hearing_date = data.date
    db.commit()
    db.refresh(hearing)

    # Send email reminder to client
    _send_hearing_reminder(case, hearing, db)

    return hearing


@h_router.put("/{hearing_id}")
def update_hearing(
    hearing_id: str,
    data: HearingUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_lawyer)
):
    hearing = db.query(Hearing).filter(Hearing.id == hearing_id).first()
    if not hearing:
        raise HTTPException(status_code=404, detail="Hearing not found")

    for field, value in data.dict(exclude_none=True).items():
        setattr(hearing, field, value)
    db.commit()
    db.refresh(hearing)
    return hearing


def _send_hearing_reminder(case: Case, hearing: Hearing, db: Session):
    """Send email to client about upcoming hearing using Resend (free tier)."""
    try:
        client_user = db.query(User).filter(User.id == case.client_id).first()
        lawyer_user = db.query(User).filter(
            User.id == case.lawyer.user_id
        ).first()

        if not client_user or not resend.api_key:
            return

        resend.Emails.send({
            "from": "LexAI <noreply@lexai.pk>",
            "to": client_user.email,
            "subject": f"Hearing Scheduled — {case.title}",
            "html": f"""
            <h2>Court Hearing Scheduled</h2>
            <p>A hearing has been scheduled for your case.</p>
            <table>
                <tr><td><strong>Case:</strong></td><td>{case.title}</td></tr>
                <tr><td><strong>Court:</strong></td><td>{hearing.court_name or 'TBD'}</td></tr>
                <tr><td><strong>Date & Time:</strong></td><td>{hearing.date.strftime('%d %B %Y at %I:%M %p')}</td></tr>
                <tr><td><strong>Purpose:</strong></td><td>{hearing.purpose or 'General hearing'}</td></tr>
                <tr><td><strong>Your Lawyer:</strong></td><td>{lawyer_user.full_name if lawyer_user else 'Your lawyer'}</td></tr>
            </table>
            <p>Please contact your lawyer if you have any questions.</p>
            <p>— LexAI Team</p>
            """
        })
    except Exception as e:
        print(f"Email send failed: {e}")   # Don't crash if email fails
