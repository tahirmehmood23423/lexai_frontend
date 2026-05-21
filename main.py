# ─────────────────────────────────────────────────────────────
# LexAI — FastAPI Backend Entry Point
# Run: uvicorn main:app --reload
# Deploy free: render.com (connect GitHub repo)
# ─────────────────────────────────────────────────────────────

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from routers import auth, lawyers, cases, hearings, documents, messages, bookings, reviews
from core.database import engine, Base

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LexAI API",
    description="Where Law Meets Intelligence — Pakistan Legal Services Platform",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI at /docs
    redoc_url="/redoc",
)

# ── CORS — allow your Vercel frontend domain ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",            # Vite dev server
        "https://lexai.vercel.app",         # Your Vercel domain
        "https://*.vercel.app",             # All Vercel preview deploys
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register all routers ──
app.include_router(auth.router,      prefix="/api/auth",      tags=["Authentication"])
app.include_router(lawyers.router,   prefix="/api/lawyers",   tags=["Lawyers"])
app.include_router(cases.router,     prefix="/api/cases",     tags=["Cases"])
app.include_router(hearings.router,  prefix="/api/hearings",  tags=["Hearings"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(messages.router,  prefix="/api/messages",  tags=["Messages"])
app.include_router(bookings.router,  prefix="/api/bookings",  tags=["Bookings"])
app.include_router(reviews.router,   prefix="/api/reviews",   tags=["Reviews"])

@app.get("/")
def root():
    return {"message": "LexAI API is running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}
