#!/bin/bash

echo "🤖 Robot Article Summarizer - Setup Script"
echo "=========================================="
echo ""

# Verifica Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trovato!"
    echo "📥 Scaricalo da: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js trovato: $(node --version)"
echo ""

# Installa dipendenze
echo "📦 Installazione dipendenze..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Errore nell'installazione delle dipendenze"
    exit 1
fi

echo ""
echo "✅ Dipendenze installate!"
echo ""

# Crea .env.local se non esiste
if [ ! -f .env.local ]; then
    echo "📝 Creazione file .env.local..."
    cp .env.local.example .env.local
    echo "⚠️  IMPORTANTE: Modifica .env.local e inserisci la tua chiave API Gemini"
    echo "🔑 Ottieni la chiave gratuita su: https://makersuite.google.com/app/apikey"
else
    echo "✅ File .env.local già presente"
fi

echo ""
echo "🎉 Setup completato!"
echo ""
echo "📋 Prossimi passi:"
echo "   1. Apri il file .env.local"
echo "   2. Inserisci la tua chiave API Gemini (gratuita)"
echo "   3. Esegui: npm run dev"
echo "   4. Apri: http://localhost:3000"
echo ""
