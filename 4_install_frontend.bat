@echo off
REM ══════════════════════════════════════════════════════
REM LexAI — Frontend Setup Script
REM Run this from the ROOT lexai folder
REM ══════════════════════════════════════════════════════

echo ════════════════════════════════════════
echo  LexAI Frontend Setup
echo ════════════════════════════════════════
echo.

REM ── Check Node.js is installed ──
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found!
    echo.
    echo Please install Node.js first:
    echo 1. Go to: https://nodejs.org
    echo 2. Download the LTS version (e.g. 20.x)
    echo 3. Install with all defaults
    echo 4. Re-run this script after installing
    pause
    exit /b
)

echo ✅ Node.js found:
node --version
echo ✅ npm found:
npm --version
echo.

REM ── Create Vite + React project ──
echo Creating React project with Vite...
echo (Vite is a fast build tool for React apps)
echo.
cd frontend
call npm create vite@latest . -- --template react
echo.
echo ✅ React project created
echo.

REM ── Install dependencies ──
echo Installing React libraries...
call npm install
call npm install react-router-dom axios zustand @tanstack/react-query date-fns socket.io-client
echo.
echo ✅ Core libraries installed
echo.

REM ── Install Tailwind CSS ──
echo Installing Tailwind CSS (for styling)...
call npm install -D tailwindcss postcss autoprefixer
call npx tailwindcss init -p
echo.
echo ✅ Tailwind CSS installed
echo.

REM ── Configure Tailwind ──
echo Configuring Tailwind...
(
echo /** @type {import('tailwindcss').Config} */
echo export default {
echo   content: [
echo     "./index.html",
echo     "./src/**/*.{js,ts,jsx,tsx}",
echo   ],
echo   theme: {
echo     extend: {},
echo   },
echo   plugins: [],
echo }
) > tailwind.config.js

REM ── Update src/index.css with Tailwind directives ──
(
echo @tailwind base;
echo @tailwind components;
echo @tailwind utilities;
echo.
echo * {
echo   box-sizing: border-box;
echo }
echo.
echo body {
echo   margin: 0;
echo   font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
echo }
) > src\index.css

echo ✅ Tailwind configured
echo.

REM ── Create .env.local ──
(
echo # LexAI Frontend Environment Variables
echo VITE_API_URL=http://localhost:8000
echo VITE_GOOGLE_CLIENT_ID=your-google-client-id-here
) > .env.local
echo ✅ .env.local created
echo.

REM ── Replace the auto-generated App.jsx with our main.jsx content ──
echo Note: Copy the contents of src/main.jsx into src/App.jsx
echo       and update src/main.jsx to just be the React entry point
echo.

REM ── Create proper entry point ──
(
echo import React from 'react'
echo import ReactDOM from 'react-dom/client'
echo import App from './App.jsx'
echo import './index.css'
echo.
echo ReactDOM.createRoot(document.getElementById('root')).render(
echo   ^<React.StrictMode^>
echo     ^<App /^>
echo   ^</React.StrictMode^>
echo )
) > src\main.jsx

echo ✅ Entry point created
echo.

echo ════════════════════════════════════════
echo  FRONTEND SETUP COMPLETE!
echo ════════════════════════════════════════
echo.
echo Next: Run 5_run_frontend.bat to start the app
echo       Make sure backend is running first! (3_run_backend_local.bat)
echo.
pause
