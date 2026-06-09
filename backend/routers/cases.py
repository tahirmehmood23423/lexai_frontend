# ═══════════════════════════════════════════════════════════════
# backend/routers/cases.py
# Case management — CRUD for cases, hearings, documents
# ═══════════════════════════════════════════════════════════════

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from core.database import get_db, Case, Hearing, Document, User, LawyerProfile
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
    opposing_party: Optional[str] = None
    judge_name: Optional[str] = None

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class CaseResponse(BaseModel):
    id: str
    title: str
    case_number: str
    case_type: str
    status: str
    court_name: str
    next_hearing_date: Optional[datetime]
    client_id: str
    lawyer_id: str

# ─────────────────────────────────────────────────────────────
# CASES
# ─────────────────────────────────────────────────────────────
@router.post("/", response_model=CaseResponse, status_code=201)
def create_case(
    data: CaseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create a new case."""
    case = Case(
        id=str(uuid.uuid4()),
        title=data.title,
        description=data.description,
        case_number=data.case_number,
        case_type=data.case_type,
        court_name=data.court_name,
        status="open",
        client_id=user.id,
        lawyer_id=data.lawyer_id,
        opposing_party=data.opposing_party,
        judge_name=data.judge_name,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return CaseResponse(**case.__dict__)

@router.get("/")
def list_cases(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """List cases for current user (as client or lawyer)."""
    if user.role in ["lawyer", "firm_admin", "admin"]:
        cases = db.query(Case).filter(Case.lawyer_id.in_(
            [lp.id for lp in db.query(LawyerProfile).filter(LawyerProfile.user_id == user.id).all()]
        )).all()
    else:
        cases = db.query(Case).filter(Case.client_id == user.id).all()
    
    return {
        "cases": [CaseResponse(**c.__dict__) for c in cases],
        "total": len(cases)
    }

@router.get("/{case_id}")
def get_case(case_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Get case details."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if case.client_id != user.id and not any(lp.id == case.lawyer_id for lp in [user.lawyer_profile] if user.lawyer_profile):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return CaseResponse(**case.__dict__)

@router.put("/{case_id}")
def update_case(
    case_id: str,
    data: CaseUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Update case (lawyer only)."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if case.lawyer_id != (user.lawyer_profile.id if user.lawyer_profile else None):
        raise HTTPException(status_code=403, detail="Only the assigned lawyer can update")
    
    for k, v in data.dict(exclude_unset=True).items():
        setattr(case, k, v)
    db.commit()
    return {"message": "Case updated"}

@router.delete("/{case_id}")
def delete_case(case_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Delete case (client or admin only)."""
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
    """Add a hearing to a case."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    hearing = Hearing(
        id=str(uuid.uuid4()),
        case_id=case_id,
        date=data.date,
        court_room=data.court_room,
        court_name=data.court_name,
        purpose=data.purpose,
        status="scheduled",
    )
    db.add(hearing)
    case.next_hearing_date = data.date
    db.commit()
    return {"id": hearing.id, "date": hearing.date.isoformat()}

@router.get("/{case_id}/hearings")
def list_hearings(case_id: str, db: Session = Depends(get_db)):
    """List all hearings for a case."""
    hearings = db.query(Hearing).filter(Hearing.case_id == case_id).order_by(Hearing.date).all()
    return {
        "hearings": [
            {
                "id": h.id,
                "date": h.date.isoformat() if h.date else None,
                "court_name": h.court_name,
                "status": h.status,
                "outcome": h.outcome,
            }
            for h in hearings
        ]
    }

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
    """Upload a document to a case."""
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
    return {"id": doc.id, "filename": doc.file_name}

@router.get("/{case_id}/documents")
def list_documents(case_id: str, db: Session = Depends(get_db)):
    """List all documents for a case."""
    docs = db.query(Document).filter(Document.case_id == case_id).order_by(Document.created_at.desc()).all()
    return {
        "documents": [
            {
                "id": d.id,
                "file_name": d.file_name,
                "file_url": d.file_url,
                "category": d.category,
                "uploaded_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in docs
        ]
    }

@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Delete a document (uploader only)."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc.uploader_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}
