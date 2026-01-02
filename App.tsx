
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { summarizeArticle, generateSpeech, generateRobotImage, decodeBase64, decodeAudioData } from './services/gemini';
import { GenerationStatus, ArticleSummary } from './types';

type VideoFilter = 'none' | 'cinematic' | 'cyberpunk' | 'noir';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState<ArticleSummary | null>(null);
  const [status, setStatus] = useState<GenerationStatus>({ step: 'idle', message: '' });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState<VideoFilter>('none');
  const [trimDuration, setTrimDuration] = useState<number>(34);
  const [maxAudioDuration, setMaxAudioDuration] = useState<number>(34);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

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

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    // Simple alert for feedback
    alert("Testo copiato!");
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
      
      if (!isSilent && isAudioMuted) {
          const gainNode = ctx.createGain();
          gainNode.gain.value = 0;
          source.connect(gainNode);
          gainNode.connect(destination);
      } else {
          source.connect(destination);
      }
      
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
      console.error("Errore audio:", err);
      return null;
    }
  }, [audioBase64, isAudioMuted]);

  const getFilterString = (filter: VideoFilter) => {
    switch (filter) {
      case 'cinematic': return 'contrast(1.2) saturate(0.8) sepia(0.1) brightness(0.9)';
      case 'cyberpunk': return 'hue-rotate(45deg) saturate(2) contrast(1.1) brightness(1.2)';
      case 'noir': return 'grayscale(1) contrast(1.4)';
      default: return 'none';
    }
  };

  const exportForTikTok = async () => {
    if (!imageUrl || !audioBase64 || !summary) return;

    setStatus({ step: 'exporting', message: 'Inizializzazione rendering...' });

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    await new Promise((resolve, reject) => { 
      img.onload = resolve;
      img.onerror = () => reject(new Error("Impossibile caricare l'immagine del robot per l'esportazione"));
    });

    const audioInfo = await playResult(true);
    if (!audioInfo) return;

    const stream = canvas.captureStream(30);
    
    if (!isAudioMuted && audioInfo.destination) {
      const audioTrack = audioInfo.destination.getAudioTracks()[0];
      if (audioTrack) stream.addTrack(audioTrack);
    }

    const recorder = new MediaRecorder(stream, { 
      mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm;codecs=vp9,opus' 
    });
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `cosmonet-robot-${Date.now()}.mp4`;
      a.click();
      setStatus({ step: 'complete', message: 'Video scaricato con successo!' });
    };

    recorder.start();
    const startTime = Date.now();
    const videoDurationMs = trimDuration * 1000;

    const renderFrame = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > videoDurationMs) {
        recorder.stop();
        audioInfo.source.stop();
        return;
      }

      ctx.save();
      ctx.filter = getFilterString(activeFilter);
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0,0,0,0.4)');
      gradient.addColorStop(0.3, 'transparent');
      gradient.addColorStop(0.7, 'transparent');
      gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.font = 'bold 60px Bungee, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('COSMONET.INFO', canvas.width / 2, canvas.height - 180);

      requestAnimationFrame(renderFrame);
    };

    setStatus({ step: 'exporting', message: 'Rendering in corso...' });
    renderFrame();
  };

  const startGeneration = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      alert("Inserisci un link dell'articolo");
      return;
    }

    const finalUrl = trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`;

    try {
      setImageUrl(null);
      setAudioBase64(null);
      setSummary(null);
      setIsPlaying(false);

      setStatus({ step: 'summarizing', message: 'Analisi SEO e Hashtag...' });
      const summaryResult = await summarizeArticle(finalUrl);
      setSummary(summaryResult);

      setStatus({ step: 'generating_audio', message: 'Registrazione voce robotica...' });
      const audioResult = await generateSpeech(summaryResult.script);
      setAudioBase64(audioResult);
      
      const decoded = decodeBase64(audioResult);
      const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const buffer = await decodeAudioData(decoded, tempCtx, 24000, 1);
      
      const bufferDuration = 4;
      const totalDuration = buffer.duration + bufferDuration;
      
      setMaxAudioDuration(totalDuration);
      setTrimDuration(totalDuration);

      setStatus({ step: 'generating_image', message: 'Creazione avatar...' });
      const img = await generateRobotImage(summaryResult.headline);
      setImageUrl(img);

      setStatus({ step: 'complete', message: 'Analisi completata!' });
    } catch (err: any) {
      console.error(err);
      setStatus({ step: 'error', message: "Errore: " + (err.message || "riprova più tardi.") });
    }
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${min < 10 ? '0' : ''}${min}:${s < 10 ? '0' : ''}${s}`;
  };

  const isProcessing = ['summarizing', 'generating_audio', 'generating_image', 'exporting'].includes(status.step);

  if (!hasApiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="max-w-md w-full bg-slate-900 rounded-3xl p-8 border border-blue-500/20 shadow-2xl text-center">
          <div className="text-7xl mb-6">🤖</div>
          <h1 className="text-3xl font-robot mb-4 text-blue-400">Cosmonet Studio</h1>
          <button onClick={handleSetupKey} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all">Configura Studio</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-robot text-blue-400 mb-2 drop-shadow-md">ROBOT CREATOR</h1>
        <p className="text-slate-400 text-lg">Ottimizzato per SEO e Social Engagement.</p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sinistra: Input e SEO Kit */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl">
            <label className="block text-xs font-bold text-blue-500 uppercase tracking-widest mb-4">Link Articolo</label>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                className={`w-full bg-slate-950 text-slate-100 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none border transition-all ${status.step === 'error' ? 'border-red-500' : 'border-slate-800'}`}
                placeholder="cosmonet.info/tuo-articolo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isProcessing}
              />
              <button
                onClick={startGeneration}
                disabled={!url.trim() || isProcessing}
                className={`w-full py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-3 ${isProcessing ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>{status.message}</span>
                  </>
                ) : '✨ Genera Kit Video & SEO'}
              </button>
            </div>
          </div>

          {summary && (
            <div className="bg-slate-900/80 rounded-3xl p-8 border border-slate-800 shadow-2xl space-y-8 animate-fade-in">
              <h2 className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em]">Kit Social SEO</h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Titolo Suggerito</label>
                    <button onClick={() => copyText(summary.seoTitle)} className="text-[10px] text-blue-400 hover:underline">Copia</button>
                  </div>
                  <p className="bg-slate-950 p-4 rounded-xl text-sm border border-slate-800 font-semibold">{summary.seoTitle}</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Descrizione Ottimizzata</label>
                    <button onClick={() => copyText(summary.seoDescription)} className="text-[10px] text-blue-400 hover:underline">Copia</button>
                  </div>
                  <p className="bg-slate-950 p-4 rounded-xl text-xs border border-slate-800 text-slate-300 leading-relaxed">{summary.seoDescription}</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Hashtag Strategici</label>
                    <button onClick={() => copyText(summary.seoHashtags)} className="text-[10px] text-blue-400 hover:underline">Copia</button>
                  </div>
                  <p className="bg-slate-950 p-4 rounded-xl text-sm border border-slate-800 text-blue-400 font-mono">{summary.seoHashtags}</p>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Script Narrativo</label>
                  <p className="text-slate-400 italic text-sm bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 leading-relaxed">
                    "{summary.script}"
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Destra: Preview e Personalizzazione */}
        <section className="lg:col-span-5">
          <div className="sticky top-12 space-y-6">
            <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl aspect-[9/16] max-h-[70vh] mx-auto relative group flex items-center justify-center bg-black">
              {imageUrl ? (
                <div className="relative w-full h-full" style={{ filter: getFilterString(activeFilter) }}>
                  <img src={imageUrl} alt="Robot Avatar" className={`w-full h-full object-cover transition-transform duration-1000 ${isPlaying ? 'scale-105' : 'scale-100'}`} />
                  <div className={`absolute inset-0 bg-blue-500/10 pointer-events-none transition-opacity ${isPlaying ? 'opacity-100 animate-pulse' : 'opacity-0'}`}></div>
                  <div className="absolute bottom-16 left-0 right-0 text-center">
                    <p className="text-white font-robot text-sm tracking-widest drop-shadow-lg">COSMONET.INFO</p>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800 p-8 text-center">
                   <div className="text-8xl mb-6 opacity-10">📹</div>
                   <p className="font-robot text-[10px] tracking-[0.2em] uppercase opacity-20">Preview Studio</p>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center z-20 p-8 text-center">
                  <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="text-blue-400 font-bold uppercase tracking-widest text-[10px] mt-8 animate-pulse">{status.message}</p>
                </div>
              )}
            </div>

            {imageUrl && status.step === 'complete' && (
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6 animate-slide-up">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => playResult()}
                    className={`flex items-center justify-center gap-3 py-3 rounded-xl font-bold transition-all border ${isPlaying ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700'}`}
                  >
                    <span>{isPlaying ? '⏹️ Stop' : '🔊 Ascolta'}</span>
                  </button>
                  <button
                    onClick={() => setIsAudioMuted(!isAudioMuted)}
                    className={`flex items-center justify-center gap-3 py-3 rounded-xl font-bold transition-all border ${isAudioMuted ? 'bg-slate-950 text-slate-500 border-slate-800' : 'bg-blue-900/30 text-blue-400 border-blue-800'}`}
                  >
                    <span>{isAudioMuted ? 'Muto' : 'Audio On'}</span>
                  </button>
                </div>

                <button
                  onClick={exportForTikTok}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-500/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3"
                >
                  <span>🎬</span>
                  <span>ESPORTA VIDEO MP4</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="mt-24 pt-8 border-t border-slate-900 text-center text-slate-600 text-[10px] font-robot tracking-[0.4em] uppercase">
        Cosmonet Artificial Intelligence &copy; 2025
      </footer>

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
