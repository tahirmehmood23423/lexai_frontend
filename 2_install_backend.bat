@echo off
REM ══════════════════════════════════════════════════════
REM LexAI — Backend Setup Script
REM Run this from the ROOT lexai folder (not inside backend/)
REM ══════════════════════════════════════════════════════

echo ════════════════════════════════════════
echo  LexAI Backend Setup
echo ════════════════════════════════════════
echo.

REM ── Check Python is installed ──
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found!
    echo.
    echo Please install Python first:
    echo 1. Go to: https://www.python.org/downloads/
    echo 2. Download Python 3.11 or newer
    echo 3. During install: CHECK "Add Python to PATH"
    echo 4. Re-run this script after installing
    pause
    exit /b
)

echo ✅ Python found:
python --version
echo.

REM ── Go into backend folder ──
cd backend

REM ── Create virtual environment ──
echo Creating virtual environment (venv)...
echo (This keeps your project packages separate from system Python)
python -m venv venv
echo ✅ Virtual environment created
echo.

REM ── Activate virtual environment ──
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo ✅ Virtual environment activated
echo.

REM ── Create requirements.txt ──
echo Creating requirements.txt...
(
echo fastapi==0.111.0
echo uvicorn[standard]==0.29.0
echo sqlalchemy==2.0.30
echo psycopg2-binary==2.9.9
echo python-jose[cryptography]==3.3.0
echo passlib[bcrypt]==1.7.4
echo pydantic[email]==2.7.1
echo python-multipart==0.0.9
echo httpx==0.27.0
echo resend==0.7.0
echo python-dotenv==1.0.1
echo alembic==1.13.1
) > requirements.txt
echo ✅ requirements.txt created
echo.

REM ── Install all packages ──
echo Installing packages (this takes 2-3 minutes)...
pip install -r requirements.txt
echo.
echo ✅ All packages installed!
echo.

REM ── Create .env file ──
echo Creating .env file with placeholder values...
(
echo # LexAI Backend Environment Variables
echo # Replace placeholder values with real ones
echo.
echo # Database - Get from supabase.com (free)
echo DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/lexai
echo.
echo # Security - Change this to any long random string
echo SECRET_KEY=lexai-super-secret-key-change-this-in-production-2024
echo.
echo # Google OAuth - Get from console.cloud.google.com (free)
echo GOOGLE_CLIENT_ID=your-google-client-id-here
echo GOOGLE_CLIENT_SECRET=your-google-client-secret-here
echo GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
echo.
echo # Supabase - Get from supabase.com (free)
echo SUPABASE_URL=https://yourproject.supabase.co
echo SUPABASE_SERVICE_KEY=your-supabase-service-key
echo.
echo # Resend Email - Get from resend.com (free)
echo RESEND_API_KEY=re_your_resend_key_here
) > .env
echo ✅ .env file created
echo.

echo ════════════════════════════════════════
echo  SETUP COMPLETE!
echo ════════════════════════════════════════
echo.
echo For LOCAL TESTING (without real database):
echo Run: 3_run_backend_local.bat
echo.
echo For FULL SETUP (with real database):
echo Follow the instructions in SETUP_AND_DEPLOY.txt
echo.
pause
