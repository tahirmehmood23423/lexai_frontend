# ═══════════════════════════════════════════════════════════════
# backend/routers/chatbot.py
# LexAI — Chatbot with Memory + Anonymous Support
# ═══════════════════════════════════════════════════════════════

import os
import json
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Session, relationship
from sqlalchemy.sql import func
from pydantic import BaseModel

from core.database import get_db, Base, User, engine

router = APIRouter()

# ─────────────────────────────────────────────────────────────
# DATABASE MODELS
# ─────────────────────────────────────────────────────────────
class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id    = Column(String, ForeignKey("users.id"), nullable=True)
    title      = Column(String, default="New Conversation")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    messages   = relationship("ChatMemory", back_populates="session", cascade="all, delete-orphan")
    user       = relationship("User", foreign_keys=[user_id])


class ChatMemory(Base):
    __tablename__ = "chat_memories"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    role       = Column(String, nullable=False)
    content    = Column(Text, nullable=False)
    sources    = Column(JSON, nullable=True)
    confidence = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    session    = relationship("ChatSession", back_populates="messages")


Base.metadata.create_all(bind=engine)

# ─────────────────────────────────────────────────────────────
# RAG ENGINE — lazy singleton
# ─────────────────────────────────────────────────────────────
_rag_engine = None
_rag_loading = False

def get_rag_engine():
    global _rag_engine, _rag_loading
    if _rag_engine is not None:
        return _rag_engine
    if _rag_loading:
        return None
    try:
        _rag_loading = True
        from core.rag_engine import LexAIRetriever
        _rag_engine = LexAIRetriever()
        print("✅ RAG engine loaded successfully")
    except Exception as e:
        print(f"❌ RAG engine failed to load: {e}")
        _rag_engine = None
    finally:
        _rag_loading = False
    return _rag_engine

# ─────────────────────────────────────────────────────────────
# GROQ LLM
# ─────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """You are LexAI, an expert AI legal assistant specializing in Pakistani law.

You help users understand:
- Pakistani constitutional law
- Criminal law (Pakistan Penal Code)
- Civil and family law
- Property and land law
- Labor and employment law
- Corporate and business law
- Court procedures and legal processes

Guidelines:
- Answer in the SAME language the user writes in (Urdu or English)
- Be accurate, clear, and cite relevant laws/sections when possible
- Always recommend consulting a qualified lawyer for specific legal advice
- If you don't know something, say so clearly
- Keep answers concise but complete
- For Urdu queries, respond in Urdu script

You have access to retrieved legal documents to support your answers."""


def detect_language(text: str) -> str:
    urdu_chars = set('ابتثجحخدذرزسشصضطظعغفقکگلمنوہیئاآپچڈڑژڤ')
    return "urdu" if sum(1 for c in text if c in urdu_chars) > 2 else "english"


def calculate_confidence(chunks: list) -> str:
    if not chunks: return "Insufficient"
    top = chunks[0].get('rerank_score', chunks[0].get('score', 0))
    if top >= 0.7: return "High"
    if top >= 0.4: return "Medium"
    if top >= 0.2: return "Low"
    return "Insufficient"


def format_context(chunks: list) -> str:
    if not chunks: return "No relevant legal documents found."
    parts = []
    for i, c in enumerate(chunks[:5], 1):
        meta = c.get('metadata', {})
        source = meta.get('source', meta.get('filename', 'Unknown'))
        score = c.get('rerank_score', c.get('score', 0))
        text = c.get('text', '')[:800]
        parts.append(f"[Document {i}] Source: {source} (Relevance: {score:.0%})\n{text}")
    return "\n\n---\n\n".join(parts)


def format_sources(chunks: list) -> list:
    return [{
        "filename":  c.get('metadata', {}).get('source', c.get('metadata', {}).get('filename', 'Unknown')),
        "relevance": round(c.get('rerank_score', c.get('score', 0)) * 100),
        "page":      c.get('metadata', {}).get('page'),
        "section":   c.get('metadata', {}).get('section'),
    } for c in chunks[:5]]


# ─────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    province_filter: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    session_id: Optional[str]
    message_id: str
    sources: list
    confidence: str
    language: str


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────
def get_history(session_id: str, db: Session, max_turns: int = 6) -> list:
    if not session_id:
        return []
    memories = (
        db.query(ChatMemory)
        .filter(ChatMemory.session_id == session_id)
        .order_by(ChatMemory.created_at.desc())
        .limit(max_turns * 2).all()
    )
    memories.reverse()
    return [{"role": m.role, "content": m.content} for m in memories]


def get_or_create_session(session_id, user_id, title, db) -> str:
    if session_id:
        s = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if s: return s.id
    s = ChatSession(id=str(uuid.uuid4()), user_id=user_id, title=title[:80] if title else "New Chat")
    db.add(s); db.commit(); db.refresh(s)
    return s.id


def save_messages(session_id, user_msg, assistant_msg, sources, confidence, db):
    db.add(ChatMemory(session_id=session_id, role="user", content=user_msg))
    db.add(ChatMemory(session_id=session_id, role="assistant", content=assistant_msg,
                      sources=sources, confidence=confidence))
    db.commit()


# ─────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────
@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    language = detect_language(req.message)
    is_anonymous = not req.user_id  # NEW: anonymous users don't save sessions
    session_id = None
    if not is_anonymous:
        session_id = get_or_create_session(req.session_id, req.user_id, req.message[:80], db)

    rag = get_rag_engine()
    chunks = []
    if rag:
        try:
            chunks = rag.retrieve(req.message, province_filter=req.province_filter)
        except Exception as e:
            print(f"⚠️ RAG failed: {e}")

    confidence = calculate_confidence(chunks)
    sources = format_sources(chunks)
    context = format_context(chunks)
    history = get_history(session_id, db) if session_id else []

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": f"Retrieved Legal Context:\n\n{context}"},
        *history,
        {"role": "user", "content": req.message},
    ]

    try:
        import httpx
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={"model": GROQ_MODEL, "messages": messages, "max_tokens": 1024, "temperature": 0.1})
            r.raise_for_status()
            answer = r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {str(e)}")

    if session_id:
        save_messages(session_id, req.message, answer, sources, confidence, db)

    return ChatResponse(
        answer=answer,
        session_id=session_id,
        message_id=str(uuid.uuid4()),
        sources=sources,
        confidence=confidence,
        language=language,
    )


@router.post("/stream")
async def chat_stream(req: ChatRequest, db: Session = Depends(get_db)):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    language = detect_language(req.message)
    is_anonymous = not req.user_id
    session_id = None
    if not is_anonymous:
        session_id = get_or_create_session(req.session_id, req.user_id, req.message[:80], db)

    rag = get_rag_engine()
    chunks = []
    if rag:
        try: chunks = rag.retrieve(req.message, province_filter=req.province_filter)
        except Exception as e: print(f"⚠️ RAG failed: {e}")

    confidence = calculate_confidence(chunks)
    sources = format_sources(chunks)
    context = format_context(chunks)
    history = get_history(session_id, db) if session_id else []

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": f"Retrieved Legal Context:\n\n{context}"},
        *history,
        {"role": "user", "content": req.message},
    ]

    async def event_generator():
        import httpx
        full = ""
        meta = {
            "type": "meta", "session_id": session_id, "confidence": confidence,
            "language": language, "sources": sources, "anonymous": is_anonymous,
        }
        yield f"data: {json.dumps(meta)}\n\n"

        payload = {"model": GROQ_MODEL, "messages": messages, "max_tokens": 1024,
                   "temperature": 0.1, "stream": True}
        try:
            async with httpx.AsyncClient(timeout=60) as c:
                async with c.stream("POST", GROQ_URL,
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                    json=payload) as resp:
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]": break
                            try:
                                chunk = json.loads(data)
                                delta = chunk["choices"][0]["delta"].get("content", "")
                                if delta:
                                    full += delta
                                    yield f"data: {json.dumps({'type': 'token', 'content': delta})}\n\n"
                            except Exception: continue
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
            return

        if session_id:
            save_messages(session_id, req.message, full, sources, confidence, db)
        yield f"data: {json.dumps({'type': 'done', 'session_id': session_id})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no",
                 "Access-Control-Allow-Origin": "*"})


@router.get("/sessions")
def list_sessions(user_id: Optional[str] = None, db: Session = Depends(get_db)):
    if not user_id: return []
    sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id)\
        .order_by(ChatSession.updated_at.desc()).limit(50).all()
    return [{"id": s.id, "title": s.title,
             "created_at": s.created_at.isoformat() if s.created_at else None,
             "updated_at": s.updated_at.isoformat() if s.updated_at else None} for s in sessions]


@router.get("/sessions/{session_id}/messages")
def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    msgs = db.query(ChatMemory).filter(ChatMemory.session_id == session_id)\
        .order_by(ChatMemory.created_at.asc()).all()
    return {"session_id": session_id, "title": session.title,
            "messages": [{"id": m.id, "role": m.role, "content": m.content,
                          "sources": m.sources, "confidence": m.confidence,
                          "created_at": m.created_at.isoformat() if m.created_at else None} for m in msgs]}


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not s: raise HTTPException(status_code=404, detail="Not found")
    db.delete(s); db.commit()
    return {"message": "Deleted"}


@router.get("/health")
def chat_health():
    rag = get_rag_engine()
    if rag is None:
        return {"status": "degraded", "rag_loaded": False, "groq_ready": bool(GROQ_API_KEY),
                "message": "RAG engine not loaded"}
    try:
        count = rag.collection.count() if rag.collection else 0
        return {"status": "ok", "rag_loaded": True, "vector_count": count,
                "groq_ready": bool(GROQ_API_KEY), "message": f"Ready with {count:,} vectors"}
    except Exception as e:
        return {"status": "error", "rag_loaded": False, "message": str(e), "groq_ready": bool(GROQ_API_KEY)}


@router.get("/suggest")
def suggest_questions():
    return {"suggestions": [
        "What are my rights if I am arrested in Pakistan?",
        "How do I file for divorce under Pakistani law?",
        "What is the procedure to register a property in Pakistan?",
        "What are the labor rights for employees in Pakistan?",
        "How can I register a business/company in Pakistan?",
        "What is the punishment for theft under the Pakistan Penal Code?",
        "How do I file an FIR with the police?",
        "What are the inheritance laws in Pakistan?",
        "پاکستان میں طلاق کا طریقہ کار کیا ہے؟",
        "پاکستان میں ملازمت کے حقوق کیا ہیں؟",
    ]}
