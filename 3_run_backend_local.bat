@echo off
REM ══════════════════════════════════════════════════════
REM LexAI — Run Backend Locally for Testing
REM Uses SQLite so you don't need Supabase yet
REM ══════════════════════════════════════════════════════

echo ════════════════════════════════════════
echo  Starting LexAI Backend (Local Test Mode)
echo ════════════════════════════════════════
echo.

cd backend

REM ── Activate virtual environment ──
call venv\Scripts\activate.bat

REM ── Override DATABASE_URL to use local SQLite for testing ──
REM (SQLite = a simple file database, no setup needed)
set DATABASE_URL=sqlite:///./lexai_test.db

echo ✅ Using local SQLite database (lexai_test.db)
echo    No Supabase needed for local testing!
echo.
echo ════════════════════════════════════════
echo  Backend starting at:
echo  http://localhost:8000
echo.
echo  API Documentation at:
echo  http://localhost:8000/docs  ← Open this in browser!
echo  (Swagger UI - test all APIs visually)
echo ════════════════════════════════════════
echo.
echo Press Ctrl+C to stop the server
echo.

REM ── Start the server ──
uvicorn main:app --reload --host 0.0.0.0 --port 8000
