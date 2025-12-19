<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🤖 Robot Article Summarizer - Generatore Video AI

Trasforma articoli di Cosmonet.info in video TikTok (9:16) con robot narratore AI!

## ✨ Funzionalità

- 📰 **Analisi articoli** automatica con Gemini AI
- 🎙️ **Sintesi vocale** con voce robotica personalizzata
- 🎨 **Generazione immagini** robot in formato verticale 9:16
- 🎬 **Editor video** con filtri (Cinematic, Cyberpunk, Noir)
- ✂️ **Taglio durata** personalizzabile (5-30+ secondi)
- 🔇 **Controllo audio** mute/unmute
- 💾 **Export MP4** ottimizzato per TikTok (1080x1920)

## 🚀 Esecuzione Locale (GRATIS)

### Prerequisiti

- **Node.js** (versione 18 o superiore) - [Scarica qui](https://nodejs.org/)
- **Chiave API Google Gemini** (gratuita) - [Ottienila qui](https://makersuite.google.com/app/apikey)

### Installazione

1. **Clona il repository:**
   ```bash
   git clone https://github.com/CosmoNetinfo/Generatore-video-AI-.git
   cd Generatore-video-AI-
   git checkout claude/test-application-Iy4JI
   ```

2. **Installa le dipendenze:**
   ```bash
   npm install
   ```

3. **Configura la chiave API:**

   Crea un file `.env.local` nella root del progetto:
   ```bash
   cp .env.local.example .env.local
   ```

   Apri `.env.local` e inserisci la tua chiave API:
   ```
   GEMINI_API_KEY=la_tua_chiave_api_qui
   ```

4. **Avvia l'applicazione:**
   ```bash
   npm run dev
   ```

5. **Apri nel browser:**
   ```
   http://localhost:3000
   ```

### Come ottenere la chiave API Gemini (GRATUITA)

1. Vai su https://makersuite.google.com/app/apikey
2. Accedi con il tuo account Google
3. Clicca su "Create API Key"
4. Copia la chiave generata
5. Incollala nel file `.env.local`

## 📖 Come Usare l'App

1. Inserisci l'URL di un articolo da **Cosmonet.info**
2. Clicca "Crea Ora" e attendi la generazione
3. Personalizza il video con:
   - Filtri visivi (None, Cinematic, Cyberpunk, Noir)
   - Durata video (slider)
   - Audio muto/attivo
4. Clicca "APPLICA E ESPORTA" per scaricare il video MP4

## 🛠️ Comandi Disponibili

```bash
npm run dev      # Avvia server di sviluppo
npm run build    # Crea build di produzione
npm run preview  # Visualizza build di produzione
```

## 🔗 Link Utili

- **App su AI Studio:** https://ai.studio/apps/drive/1qE9HJ1gDWoMiHMaRIC9oj_npIm3RzXIk
- **Cosmonet.info:** https://cosmonet.info

## 📝 Note

- L'app usa modelli Gemini gratuiti
- La chiave API gratuita ha limiti di utilizzo giornalieri
- I video generati sono ottimizzati per TikTok (formato 9:16)

## 🎨 Tecnologie

- React 19 + TypeScript
- Vite
- Google Gemini AI (Flash + TTS + Image)
- Canvas API per rendering video
- MediaRecorder API per export
