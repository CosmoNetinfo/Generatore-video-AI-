
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { summarizeArticle, generateSpeech, generateRobotImage, decodeBase64, decodeAudioData } from './services/gemini';
import { GenerationStatus, ArticleSummary } from './types';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState<ArticleSummary | null>(null);
  const [status, setStatus] = useState<GenerationStatus>({ step: 'idle', message: '' });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      const studio = (window as any).aistudio;
      if (studio) {
        const selected = await studio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSetupKey = async () => {
    const studio = (window as any).aistudio;
    if (studio) {
      await studio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const playResult = useCallback(async (isSilent = false) => {
    if (!audioBase64) return null;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    
    try {
      const decoded = decodeBase64(audioBase64);
      const audioBuffer = await decodeAudioData(decoded, ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      
      const destination = isSilent ? ctx.createMediaStreamDestination() : ctx.destination;
      source.connect(destination);
      
      if (!isSilent) {
        source.onended = () => setIsPlaying(false);
        sourceNodeRef.current = source;
        source.start();
        setIsPlaying(true);
      } else {
        source.start();
      }
      
      return { source, audioBuffer, destination: (destination as any).stream || null };
    } catch (err) {
      console.error("Errore audio", err);
      return null;
    }
  }, [audioBase64]);

  const exportForTikTok = async () => {
    if (!imageUrl || !audioBase64 || !summary) return;

    setStatus({ step: 'exporting', message: 'Rendering video per TikTok...' });

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    await new Promise((resolve) => { img.onload = resolve; });

    const audioInfo = await playResult(true);
    if (!audioInfo || !audioInfo.destination) return;

    const stream = canvas.captureStream(30);
    stream.addTrack(audioInfo.destination.getAudioTracks()[0]);

    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `cosmonet-tiktok-${Date.now()}.mp4`;
      a.click();
      setStatus({ step: 'complete', message: 'Video scaricato! Caricalo ora su TikTok.' });
    };

    recorder.start();

    const startTime = Date.now();
    const duration = audioInfo.audioBuffer.duration * 1000;

    const render = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        recorder.stop();
        audioInfo.source.stop();
        return;
      }

      // 1. Sfondo
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Immagine Robot (Ora è già 9:16)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 3. Vignettatura/Overlay Gradiente per profondità
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
      gradient.addColorStop(0.3, 'transparent');
      gradient.addColorStop(0.7, 'transparent');
      gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 4. Branding Fisso (Semplice e pulito)
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.font = 'bold 50px Bungee, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('COSMONET.INFO', canvas.width / 2, canvas.height - 150);

      requestAnimationFrame(render);
    };

    render();
  };

  const startGeneration = async () => {
    if (!url.trim() || !url.startsWith('http')) {
      alert("Inserisci un link valido di Cosmonet.info");
      return;
    }

    try {
      setImageUrl(null);
      setAudioBase64(null);
      setSummary(null);
      setIsPlaying(false);

      setStatus({ step: 'summarizing', message: 'Analisi articolo...' });
      const summaryResult = await summarizeArticle(url);
      setSummary(summaryResult);

      setStatus({ step: 'generating_audio', message: 'Sintesi vocale...' });
      const audioResult = await generateSpeech(summaryResult.script);
      setAudioBase64(audioResult);

      setStatus({ step: 'generating_image', message: 'Creazione Robot 9:16...' });
      const img = await generateRobotImage(summaryResult.headline);
      setImageUrl(img);

      setStatus({ step: 'complete', message: 'Contenuto pronto!' });
    } catch (err: any) {
      console.error(err);
      setStatus({ step: 'error', message: err.message || 'Errore durante la generazione' });
    }
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="max-w-md w-full bg-slate-900 rounded-3xl p-8 border border-blue-500/20 shadow-2xl text-center">
          <div className="text-7xl mb-6 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">🤖</div>
          <h1 className="text-3xl font-robot mb-4 text-blue-400">Cosmonet Free Studio</h1>
          <p className="text-slate-400 mb-8">Usa la tua chiave API gratuita di Google per creare video senza costi.</p>
          <button onClick={handleSetupKey} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20">Configura Chiave Gratuita</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <header className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-1 rounded-full text-xs font-bold mb-4 tracking-widest uppercase border border-green-500/20">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Ready for TikTok
        </div>
        <h1 className="text-5xl font-robot text-blue-400 mb-2 drop-shadow-md uppercase">Robot Creator</h1>
        <p className="text-slate-400 text-lg">Formatto verticale 9:16 nativo per i tuoi social.</p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl">
            <label className="block text-xs font-bold text-blue-500 uppercase tracking-widest mb-4">Link Cosmonet.info</label>
            <input
              type="url"
              className="w-full bg-slate-950 text-slate-100 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none border border-slate-800 transition-all mb-4"
              placeholder="Incolla URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={status.step !== 'idle' && status.step !== 'complete' && status.step !== 'error'}
            />
            <button
              onClick={startGeneration}
              disabled={!url.trim() || (status.step !== 'idle' && status.step !== 'complete' && status.step !== 'error' && status.step !== 'exporting')}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3"
            >
              {status.step === 'summarizing' || status.step === 'generating_audio' || status.step === 'generating_image' ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : '✨ Crea Ora'}
            </button>
          </div>

          {summary && (
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 animate-fade-in">
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded font-bold uppercase mb-4 inline-block">Script Narratore</span>
              <p className="text-slate-300 italic text-sm leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
                "{summary.script}"
              </p>
            </div>
          )}
        </section>

        <section>
          <div className="sticky top-12">
            <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl aspect-[9/16] max-h-[75vh] mx-auto relative group flex items-center justify-center bg-black">
              {imageUrl ? (
                <div className="relative w-full h-full">
                  <img src={imageUrl} alt="Robot Avatar" className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`} />
                  <div className={`absolute inset-0 bg-blue-500/5 pointer-events-none transition-opacity ${isPlaying ? 'opacity-100 animate-pulse' : 'opacity-0'}`}></div>
                  
                  {/* Branding in anteprima */}
                  <div className="absolute bottom-16 left-0 right-0 text-center">
                    <p className="text-white font-robot text-sm tracking-widest drop-shadow-md">COSMONET.INFO</p>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700 p-8 text-center">
                   <div className="text-8xl mb-6 opacity-5 animate-pulse">🤖</div>
                   <p className="font-robot text-[10px] tracking-[0.2em] uppercase opacity-30">Anteprima Video</p>
                </div>
              )}

              {(status.step !== 'idle' && status.step !== 'complete' && status.step !== 'error') && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-20">
                  <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="text-blue-400 font-bold uppercase tracking-widest text-[10px] mt-6 animate-pulse">{status.message}</p>
                </div>
              )}
            </div>

            {imageUrl && audioBase64 && status.step === 'complete' && (
              <div className="mt-8 grid grid-cols-2 gap-4 animate-slide-up">
                <button
                  onClick={() => playResult()}
                  className={`flex items-center justify-center gap-3 py-4 rounded-2xl font-bold transition-all ${isPlaying ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700'}`}
                >
                  <span>{isPlaying ? '⏹️' : '🔊'}</span>
                  <span>{isPlaying ? 'STOP' : 'ASCOLTA'}</span>
                </button>

                <button
                  onClick={exportForTikTok}
                  className="flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/30 transition-all transform hover:scale-[1.02]"
                >
                  <span>🎬</span>
                  <span>ESPORTA VIDEO</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="mt-24 pt-8 border-t border-slate-900 text-center">
        <p className="text-slate-600 text-[10px] tracking-[0.3em] font-robot uppercase">Cosmonet.info &copy; 2025</p>
      </footer>

      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
