# backend/routers/messages.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid

from core.database import get_db, User, MessageThread, Message, LawyerProfile
from routers.auth import get_current_user

router = APIRouter()


def _thread_preview(thread: MessageThread, user_id: str, db: Session) -> dict:
    last_msg = (
        db.query(Message)
        .filter(Message.thread_id == thread.id)
        .order_by(Message.created_at.desc())
        .first()
    )
    other_id = thread.lawyer_id if thread.client_id == user_id else thread.client_id
    other = db.query(User).filter(User.id == other_id).first()
    unread = (
        db.query(Message)
        .filter(Message.thread_id == thread.id, Message.sender_id != user_id, Message.is_read == False)
        .count()
    )
    return {
        "id": thread.id,
        "case_id": thread.case_id,
        "other_user": {
            "id": other.id if other else None,
            "full_name": other.full_name if other else "Unknown",
            "role": other.role if other else "unknown",
        },
        "last_message": {
            "content": last_msg.content if last_msg else None,
            "created_at": last_msg.created_at.isoformat() if last_msg and last_msg.created_at else None,
            "is_mine": last_msg.sender_id == user_id if last_msg else False,
        } if last_msg else None,
        "unread": unread,
        "created_at": thread.created_at.isoformat() if thread.created_at else None,
    }


@router.get("/threads")
def list_threads(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    threads = (
        db.query(MessageThread)
        .filter(
            (MessageThread.client_id == user.id) | (MessageThread.lawyer_id == user.id)
        )
        .order_by(MessageThread.created_at.desc())
        .all()
    )
    return {"threads": [_thread_preview(t, user.id, db) for t in threads]}


@router.get("/threads/{thread_id}")
def get_thread(
    thread_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    thread = db.query(MessageThread).filter(MessageThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    if thread.client_id != user.id and thread.lawyer_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    msgs = db.query(Message).filter(Message.thread_id == thread_id).order_by(Message.created_at).all()

    # Mark unread as read
    for m in msgs:
        if m.sender_id != user.id and not m.is_read:
            m.is_read = True
    db.commit()

    return {
        "thread_id": thread_id,
        "messages": [
            {
                "id": m.id,
                "content": m.content,
                "sender_id": m.sender_id,
                "is_mine": m.sender_id == user.id,
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in msgs
        ],
    }


class SendMsg(BaseModel):
    thread_id: Optional[str] = None
    other_user_id: Optional[str] = None
    case_id: Optional[str] = None
    content: str


@router.post("/send", status_code=201)
def send_message(
    data: SendMsg,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    thread_id = data.thread_id
    if not thread_id:
        if not data.other_user_id:
            raise HTTPException(status_code=400, detail="thread_id or other_user_id required")

        other = db.query(User).filter(User.id == data.other_user_id).first()
        if not other:
            raise HTTPException(status_code=404, detail="User not found")

        if user.role in ["lawyer", "firm_admin"]:
            client_id, lawyer_id = data.other_user_id, user.id
        else:
            client_id, lawyer_id = user.id, data.other_user_id

        existing = db.query(MessageThread).filter(
            MessageThread.client_id == client_id,
            MessageThread.lawyer_id == lawyer_id,
        ).first()

        if existing:
            thread_id = existing.id
        else:
            t = MessageThread(
                id=str(uuid.uuid4()),
                client_id=client_id,
                lawyer_id=lawyer_id,
                case_id=data.case_id,
            )
            db.add(t)
            db.flush()
            thread_id = t.id

    msg = Message(
        id=str(uuid.uuid4()),
        thread_id=thread_id,
        sender_id=user.id,
        content=data.content.strip(),
        is_read=False,
    )
    db.add(msg)
    db.commit()

    return {
        "id": msg.id,
        "thread_id": thread_id,
        "content": msg.content,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }
