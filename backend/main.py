from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import engine, Base
from routers.auth import router as auth_router
from routers.cases import router as cases_router
from routers.all_routers import router as all_routes_router
from routers.chatbot import router as chatbot_router
from routers.firms import router as firms_router
from routers.messages import router as messages_router
from routers.bookings import router as bookings_router
import os
from dotenv import load_dotenv

load_dotenv()
Base.metadata.create_all(bind=engine)

app = FastAPI(title="LexAI API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,        prefix="/api/auth",     tags=["Authentication"])
app.include_router(cases_router,       prefix="/api/cases",    tags=["Cases"])
app.include_router(firms_router,       prefix="/api/firms",    tags=["Law Firms"])
app.include_router(messages_router,    prefix="/api/messages", tags=["Messages"])
app.include_router(bookings_router,    prefix="/api/bookings", tags=["Bookings"])
app.include_router(all_routes_router,  prefix="/api",          tags=["General"])
app.include_router(chatbot_router,     prefix="/api/chat",     tags=["Chatbot"])

@app.get("/")
def root():
    return {"message": "LexAI API v4.0"}

@app.get("/health")
def health():
    return {"status": "ok", "version": "4.0.0"}
