@echo off
REM ══════════════════════════════════════════════════════
REM LexAI — Run Frontend
REM ══════════════════════════════════════════════════════

echo ════════════════════════════════════════
echo  Starting LexAI Frontend
echo ════════════════════════════════════════
echo.
echo Make sure backend is running in another terminal first!
echo Backend: http://localhost:8000
echo.

cd frontend

echo ✅ Frontend starting at:
echo    http://localhost:5173
echo.
echo Open http://localhost:5173 in your browser
echo Press Ctrl+C to stop
echo.

call npm run dev
