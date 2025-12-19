@echo off
echo.
echo 🤖 Robot Article Summarizer - Setup Script
echo ==========================================
echo.

REM Verifica Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js non trovato!
    echo 📥 Scaricalo da: https://nodejs.org/
    pause
    exit /b 1
)

node --version
echo ✅ Node.js trovato!
echo.

REM Installa dipendenze
echo 📦 Installazione dipendenze...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Errore nell'installazione delle dipendenze
    pause
    exit /b 1
)

echo.
echo ✅ Dipendenze installate!
echo.

REM Crea .env.local se non esiste
if not exist .env.local (
    echo 📝 Creazione file .env.local...
    copy .env.local.example .env.local
    echo ⚠️  IMPORTANTE: Modifica .env.local e inserisci la tua chiave API Gemini
    echo 🔑 Ottieni la chiave gratuita su: https://makersuite.google.com/app/apikey
) else (
    echo ✅ File .env.local già presente
)

echo.
echo 🎉 Setup completato!
echo.
echo 📋 Prossimi passi:
echo    1. Apri il file .env.local con Blocco Note
echo    2. Inserisci la tua chiave API Gemini (gratuita)
echo    3. Esegui: npm run dev
echo    4. Apri nel browser: http://localhost:3000
echo.
pause
