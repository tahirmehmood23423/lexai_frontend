# backend/routers/cases.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from core.database import get_db, Case, Hearing, Document, User, LawyerProfile, CaseUpdate
from routers.auth import get_current_user

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────
class HearingCreate(BaseModel):
    date: datetime
    court_room: Optional[str] = None
    court_name: Optional[str] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None

class HearingUpdate(BaseModel):
    status: Optional[str] = None
    outcome: Optional[str] = None
    next_date: Optional[datetime] = None
    notes: Optional[str] = None

class DocumentCreate(BaseModel):
    file_name: str
    file_url: str
    category: Optional[str] = None
    description: Optional[str] = None
    is_private: bool = False

class CaseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    case_number: Optional[str] = None
    case_type: str
    court_name: Optional[str] = None
    lawyer_id: str
    client_id: Optional[str] = None   # set by lawyer when creating for a client
    opposing_party: Optional[str] = None
    judge_name: Optional[str] = None
    notes: Optional[str] = None

class CaseUpdateSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    court_name: Optional[str] = None
    opposing_party: Optional[str] = None
    judge_name: Optional[str] = None

# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────
def _case_dict(case: Case, db: Session) -> dict:
    client = db.query(User).filter(User.id == case.client_id).first()
    lp = db.query(LawyerProfile).filter(LawyerProfile.id == case.lawyer_id).first()
    lawyer_user = db.query(User).filter(User.id == lp.user_id).first() if lp else None
    hearings = db.query(Hearing).filter(Hearing.case_id == case.id).order_by(Hearing.date).all()
    upcoming = [h for h in hearings if h.status == 'scheduled']
    return {
        "id": case.id,
        "title": case.title,
        "case_number": case.case_number,
        "case_type": case.case_type,
        "status": case.status,
        "court_name": case.court_name,
        "description": case.description,
        "notes": case.notes,
        "opposing_party": case.opposing_party,
        "judge_name": case.judge_name,
        "filing_date": case.filing_date.isoformat() if case.filing_date else None,
        "next_hearing_date": case.next_hearing_date.isoformat() if case.next_hearing_date else None,
        "created_at": case.created_at.isoformat() if case.created_at else None,
        "updated_at": case.updated_at.isoformat() if case.updated_at else None,
        "client_id": case.client_id,
        "lawyer_id": case.lawyer_id,
        "client_name": client.full_name if client else "Unknown",
        "client_phone": client.phone if client else None,
        "client_email": client.email if client else None,
        "lawyer_name": lawyer_user.full_name if lawyer_user else "Unknown",
        "lawyer_profile_id": lp.id if lp else None,
        "hearing_count": len(hearings),
        "upcoming_hearings": len(upcoming),
    }

def _hearing_dict(h: Hearing) -> dict:
    return {
        "id": h.id,
        "case_id": h.case_id,
        "date": h.date.isoformat() if h.date else None,
        "court_room": h.court_room,
        "court_name": h.court_name,
        "purpose": h.purpose,
        "status": h.status,
        "outcome": h.outcome,
        "next_date": h.next_date.isoformat() if h.next_date else None,
        "notes": h.notes,
        "created_at": h.created_at.isoformat() if h.created_at else None,
    }

# ─────────────────────────────────────────────────────────────
# CASES
# ─────────────────────────────────────────────────────────────
@router.post("/", status_code=201)
def create_case(
    data: CaseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if user.role in ["lawyer", "firm_admin", "admin"]:
        lp = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
        if not lp:
            raise HTTPException(status_code=400, detail="Lawyer profile not found. Complete your profile first.")
        lawyer_id = lp.id
        # Lawyer must specify a client
        client_id = data.client_id
        if not client_id:
            raise HTTPException(status_code=400, detail="client_id required when lawyer creates a case")
    else:
        # Client creates case and picks a lawyer
        lawyer_id = data.lawyer_id
        client_id = user.id

    case = Case(
        id=str(uuid.uuid4()),
        title=data.title,
        description=data.description,
        case_number=data.case_number or f"CASE-{uuid.uuid4().hex[:8].upper()}",
        case_type=data.case_type,
        court_name=data.court_name,
        status="open",
        client_id=client_id,
        lawyer_id=lawyer_id,
        opposing_party=data.opposing_party,
        judge_name=data.judge_name,
        notes=data.notes,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return _case_dict(case, db)


@router.get("/")
def list_cases(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if user.role in ["lawyer", "firm_admin", "admin"]:
        lp = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
        if not lp:
            return {"cases": [], "total": 0}
        query = db.query(Case).filter(Case.lawyer_id == lp.id)
    else:
        query = db.query(Case).filter(Case.client_id == user.id)

    if status:
        query = query.filter(Case.status == status)

    cases = query.order_by(Case.created_at.desc()).all()
    return {"cases": [_case_dict(c, db) for c in cases], "total": len(cases)}


@router.get("/hearings/upcoming")
def list_upcoming_hearings(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """All upcoming hearings for the current lawyer."""
    if user.role not in ["lawyer", "firm_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Lawyers only")
    lp = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    if not lp:
        return {"hearings": []}

    cases = db.query(Case).filter(Case.lawyer_id == lp.id).all()
    case_ids = [c.id for c in cases]
    case_map = {c.id: c for c in cases}

    hearings = (
        db.query(Hearing)
        .filter(Hearing.case_id.in_(case_ids), Hearing.date >= datetime.utcnow())
        .order_by(Hearing.date)
        .all()
    )
    result = []
    for h in hearings:
        d = _hearing_dict(h)
        case = case_map.get(h.case_id)
        if case:
            client = db.query(User).filter(User.id == case.client_id).first()
            d["case_title"] = case.title
            d["case_type"] = case.case_type
            d["client_name"] = client.full_name if client else "Unknown"
        result.append(d)
    return {"hearings": result}


@router.get("/{case_id}")
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    lp = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    is_lawyer = lp and lp.id == case.lawyer_id
    is_client = case.client_id == user.id

    if not (is_client or is_lawyer or user.role == "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")

    return _case_dict(case, db)


@router.put("/{case_id}")
def update_case(
    case_id: str,
    data: CaseUpdateSchema,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    lp = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    if not (lp and lp.id == case.lawyer_id) and user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the assigned lawyer can update")

    for k, v in data.dict(exclude_unset=True).items():
        setattr(case, k, v)
    db.commit()
    return _case_dict(case, db)


@router.delete("/{case_id}")
def delete_case(
    case_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.client_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(case)
    db.commit()
    return {"message": "Case deleted"}


# ─────────────────────────────────────────────────────────────
# HEARINGS
# ─────────────────────────────────────────────────────────────
@router.post("/{case_id}/hearings", status_code=201)
def add_hearing(
    case_id: str,
    data: HearingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    lp = db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).first()
    if not (lp and lp.id == case.lawyer_id) and user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the assigned lawyer can add hearings")

    hearing = Hearing(
        id=str(uuid.uuid4()),
        case_id=case_id,
        date=data.date,
        court_room=data.court_room,
        court_name=data.court_name or case.court_name,
        purpose=data.purpose,
        notes=data.notes,
        status="scheduled",
    )
    db.add(hearing)
    case.next_hearing_date = data.date
    db.commit()
    return _hearing_dict(hearing)


@router.get("/{case_id}/hearings")
def list_hearings(case_id: str, db: Session = Depends(get_db)):
    hearings = db.query(Hearing).filter(Hearing.case_id == case_id).order_by(Hearing.date).all()
    return {"hearings": [_hearing_dict(h) for h in hearings]}


@router.put("/{case_id}/hearings/{hearing_id}")
def update_hearing(
    case_id: str,
    hearing_id: str,
    data: HearingUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    hearing = db.query(Hearing).filter(Hearing.id == hearing_id, Hearing.case_id == case_id).first()
    if not hearing:
        raise HTTPException(status_code=404, detail="Hearing not found")

    for k, v in data.dict(exclude_unset=True).items():
        setattr(hearing, k, v)
    db.commit()
    return _hearing_dict(hearing)


# ─────────────────────────────────────────────────────────────
# DOCUMENTS
# ─────────────────────────────────────────────────────────────
@router.post("/{case_id}/documents", status_code=201)
def upload_document(
    case_id: str,
    data: DocumentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    doc = Document(
        id=str(uuid.uuid4()),
        case_id=case_id,
        uploader_id=user.id,
        file_name=data.file_name,
        file_url=data.file_url,
        category=data.category,
        description=data.description,
        is_private=data.is_private,
    )
    db.add(doc)
    db.commit()
    return {"id": doc.id, "file_name": doc.file_name}


@router.get("/{case_id}/documents")
def list_documents(case_id: str, db: Session = Depends(get_db)):
    docs = db.query(Document).filter(Document.case_id == case_id).order_by(Document.created_at.desc()).all()
    return {
        "documents": [
            {
                "id": d.id,
                "file_name": d.file_name,
                "file_url": d.file_url,
                "category": d.category,
                "description": d.description,
                "is_private": d.is_private,
                "uploaded_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in docs
        ]
    }


@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.uploader_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}
