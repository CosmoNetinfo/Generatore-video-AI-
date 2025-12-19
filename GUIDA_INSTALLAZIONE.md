# 📖 Guida Installazione Locale - Passo Passo

Segui questi passaggi **sul tuo PC Windows** per installare e usare l'applicazione gratuitamente.

## ⚙️ Passo 1: Installa Node.js

1. Vai su **https://nodejs.org/**
2. Scarica la versione **LTS** (Long Term Support)
3. Esegui il file scaricato e segui l'installazione
4. Riavvia il PC dopo l'installazione

**Verifica installazione:**
- Apri il **Prompt dei comandi** (CMD)
- Digita: `node --version`
- Dovresti vedere qualcosa tipo: `v20.x.x`

---

## 📥 Passo 2: Scarica l'Applicazione

### Opzione A: Con Git (consigliato)

1. Installa **Git** da https://git-scm.com/download/win
2. Apri il **Prompt dei comandi** (CMD)
3. Vai nella cartella dove vuoi scaricare l'app:
   ```cmd
   cd Desktop
   ```
4. Clona il repository:
   ```cmd
   git clone https://github.com/CosmoNetinfo/Generatore-video-AI-.git
   cd Generatore-video-AI-
   git checkout claude/test-application-Iy4JI
   ```

### Opzione B: Download ZIP (alternativa)

1. Vai su https://github.com/CosmoNetinfo/Generatore-video-AI-
2. Clicca su "Code" > "Download ZIP"
3. Estrai il file ZIP sul Desktop
4. Apri il Prompt dei comandi nella cartella estratta

---

## 🔧 Passo 3: Esegui il Setup Automatico

**Su Windows:**
1. Apri la cartella `Generatore-video-AI-`
2. Fai doppio click su `setup.bat`
3. Attendi il completamento dell'installazione

Lo script installerà automaticamente tutte le dipendenze necessarie.

---

## 🔑 Passo 4: Ottieni la Chiave API Gemini (GRATIS)

1. Apri il browser e vai su: **https://makersuite.google.com/app/apikey**
2. Accedi con il tuo **account Google**
3. Clicca su **"Create API Key"**
4. Seleziona un progetto esistente o creane uno nuovo
5. **Copia la chiave** generata (qualcosa tipo: `AIzaSyA...`)

---

## 📝 Passo 5: Configura la Chiave API

1. Nella cartella `Generatore-video-AI-`, trova il file `.env.local`
2. Aprilo con **Blocco Note** (tasto destro > Apri con > Blocco Note)
3. Sostituisci `la_tua_chiave_api_qui` con la chiave che hai copiato:
   ```
   GEMINI_API_KEY=AIzaSyA_la_tua_chiave_vera_qui
   ```
4. **Salva** il file (Ctrl+S)

---

## 🚀 Passo 6: Avvia l'Applicazione

1. Apri il **Prompt dei comandi** nella cartella dell'app
2. Digita:
   ```cmd
   npm run dev
   ```
3. Attendi il messaggio: `Local: http://localhost:3000/`
4. Apri il **browser** (Chrome, Edge, Firefox)
5. Vai su: **http://localhost:3000**

---

## 🎬 Passo 7: Usa l'Applicazione!

1. Copia l'URL di un articolo da **Cosmonet.info**
2. Incollalo nel campo di input
3. Clicca **"Crea Ora"**
4. Attendi la generazione (10-30 secondi)
5. Personalizza il video con filtri
6. Clicca **"APPLICA E ESPORTA"** per scaricare il video MP4

---

## 🆘 Risoluzione Problemi

### Errore: "node non è riconosciuto"
- Node.js non è installato correttamente
- Riavvia il PC dopo aver installato Node.js
- Reinstalla Node.js se il problema persiste

### Errore: "npm install fallisce"
- Verifica la connessione internet
- Esegui come Amministratore il Prompt dei comandi
- Prova con: `npm install --force`

### Errore: "API Key non valida"
- Verifica di aver copiato correttamente la chiave
- Assicurati di non avere spazi prima/dopo la chiave
- Genera una nuova chiave API se necessario

### Il browser non si connette
- Verifica che il server sia avviato (messaggio `Local: http://localhost:3000/`)
- Prova con http://127.0.0.1:3000
- Disabilita antivirus/firewall temporaneamente
- Prova con un altro browser

---

## 💡 Comandi Utili

```cmd
npm run dev      # Avvia l'app in modalità sviluppo
npm run build    # Crea versione ottimizzata
npm run preview  # Visualizza versione ottimizzata
```

**Per fermare il server:**
- Premi `Ctrl+C` nel Prompt dei comandi

---

## 📞 Supporto

Se hai problemi:
1. Verifica di aver seguito tutti i passaggi
2. Riavvia il PC e riprova
3. Controlla la console del browser per errori (F12)

---

## 🎉 Divertiti!

Ora hai l'applicazione funzionante **100% gratis** sul tuo PC!
Crea quanti video vuoi senza limiti (oltre ai limiti gratuiti di Gemini API).

**Cosmonet.info © 2025**
