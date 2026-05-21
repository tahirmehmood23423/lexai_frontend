@echo off
REM ══════════════════════════════════════════════════════
REM LexAI — Folder Setup Script for Windows
REM Run this ONCE from inside VS Code terminal
REM It will organize all your files into correct folders
REM ══════════════════════════════════════════════════════

echo Setting up LexAI folder structure...

REM Create backend folders
mkdir backend
mkdir backend\core
mkdir backend\routers

REM Create frontend folders
mkdir frontend
mkdir frontend\src
mkdir frontend\src\pages
mkdir frontend\src\pages\client
mkdir frontend\src\pages\lawyer
mkdir frontend\src\components
mkdir frontend\src\lib
mkdir frontend\src\store

REM Create database folder
mkdir database

REM ── Move backend files ──
copy main.py backend\main.py
copy database.py backend\core\database.py
copy auth.py backend\routers\auth.py
copy cases.py backend\routers\cases.py
copy all_routers.py backend\routers\all_routers.py

REM ── Move frontend files ──
copy main.jsx frontend\src\main.jsx

REM ── Move database file ──
copy schema.sql database\schema.sql

REM ── Create empty __init__.py files (Python needs these) ──
type nul > backend\__init__.py
type nul > backend\core\__init__.py
type nul > backend\routers\__init__.py

echo.
echo ✅ Done! Your folder structure is now:
echo.
echo lexai/
echo ├── backend/
echo │   ├── main.py
echo │   ├── core/
echo │   │   └── database.py
echo │   └── routers/
echo │       ├── auth.py
echo │       ├── cases.py
echo │       └── all_routers.py
echo ├── frontend/
echo │   └── src/
echo │       └── main.jsx
echo └── database/
echo     └── schema.sql
echo.
echo Next step: Run install_backend.bat
pause
