
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
  
  // Editor State
  const [activeFilter, setActiveFilter] = useState<VideoFilter>('none');
  const [trimDuration, setTrimDuration] = useState<number>(30);
  const [maxAudioDuration, setMaxAudioDuration] = useState<number>(30);
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
      
      // Mute logic if user has selected mute (only for non-silent exports, 
      // though silent exports are for the recorder so we handle that in the recorder logic)
      if (!isSilent && isAudioMuted) {
          // If muted, we don't connect to destination or we use a gain node at 0
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
      console.error("Errore audio", err);
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

    setStatus({ step: 'exporting', message: 'Rendering video...' });

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
    if (!audioInfo) return;

    const stream = canvas.captureStream(30);
    
    // Solo se non è mutato aggiungiamo la traccia audio
    if (!isAudioMuted && audioInfo.destination) {
      stream.addTrack(audioInfo.destination.getAudioTracks()[0]);
    }

    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `cosmonet-${isAudioMuted ? 'muted-' : ''}${Date.now()}.mp4`;
      a.click();
      setStatus({ step: 'complete', message: 'Video pronto!' });
    };

    recorder.start();

    const startTime = Date.now();
    const duration = Math.min(audioInfo.audioBuffer.duration, trimDuration) * 1000;

    const render = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
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
      gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
      gradient.addColorStop(0.3, 'transparent');
      gradient.addColorStop(0.7, 'transparent');
      gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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
      
      const decoded = decodeBase64(audioResult);
      const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const buffer = await decodeAudioData(decoded, tempCtx, 24000, 1);
      setMaxAudioDuration(buffer.duration);
      setTrimDuration(Math.min(30, buffer.duration));

      setStatus({ step: 'generating_image', message: 'Creazione Robot 9:16...' });
      const img = await generateRobotImage(summaryResult.headline);
      setImageUrl(img);

      setStatus({ step: 'complete', message: 'Contenuto pronto!' });
    } catch (err: any) {
      console.error(err);
      setStatus({ step: 'error', message: err.message || 'Errore durante la generazione' });
    }
  };

  const formatTime = (seconds: number) => {
    const s = Math.floor(seconds);
    return `00:${s < 10 ? '0' : ''}${s}`;
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
          Studio Creativo
        </div>
        <h1 className="text-5xl font-robot text-blue-400 mb-2 drop-shadow-md uppercase">Robot Creator</h1>
        <p className="text-slate-400 text-lg">Personalizza e pubblica il tuo riassunto in pochi click.</p>
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

          {imageUrl && status.step === 'complete' && (
            <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl space-y-8 animate-fade-in">
              <h2 className="text-xs font-bold text-blue-500 uppercase tracking-[0.2em]">Editor Video</h2>
              
              {/* Filtri */}
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold mb-4">Filtri Visuali</p>
                <div className="grid grid-cols-4 gap-3">
                  {(['none', 'cinematic', 'cyberpunk', 'noir'] as VideoFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={`py-3 rounded-xl text-[10px] font-bold uppercase transition-all border ${activeFilter === f ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Settings */}
              <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <p className="text-white text-xs font-bold uppercase tracking-widest">Audio Narratore</p>
                  <p className="text-slate-500 text-[10px]">Attiva o disattiva la voce del robot</p>
                </div>
                <button 
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[10px] transition-all ${isAudioMuted ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'}`}
                >
                  {isAudioMuted ? '🔇 MUTO' : '🔊 ATTIVO'}
                </button>
              </div>

              {/* Trimming */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-slate-500 text-[10px] uppercase font-bold">Taglio Durata</p>
                  <span className="text-blue-400 font-robot text-xs">{formatTime(trimDuration)}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max={maxAudioDuration}
                  step="0.5"
                  value={trimDuration}
                  onChange={(e) => setTrimDuration(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 bg-slate-950 rounded-lg appearance-none cursor-pointer h-2"
                />
                <div className="flex justify-between mt-2 text-[10px] text-slate-600 uppercase font-bold">
                  <span>5s</span>
                  <span>{formatTime(maxAudioDuration)}</span>
                </div>
              </div>

              {/* Esporta */}
              <button
                onClick={exportForTikTok}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/30 transition-all transform hover:scale-[1.02]"
              >
                <span>🎬</span>
                <span>APPLICA E ESPORTA</span>
              </button>
            </div>
          )}

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
                <div className="relative w-full h-full" style={{ filter: getFilterString(activeFilter) }}>
                  <img src={imageUrl} alt="Robot Avatar" className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`} />
                  <div className={`absolute inset-0 bg-blue-500/5 pointer-events-none transition-opacity ${isPlaying ? 'opacity-100 animate-pulse' : 'opacity-0'}`}></div>
                  
                  {/* Branding in anteprima */}
                  <div className="absolute bottom-16 left-0 right-0 text-center" style={{ filter: 'none' }}>
                    <p className="text-white font-robot text-sm tracking-widest drop-shadow-md">COSMONET.INFO</p>
                  </div>

                  {/* Icona Mute in anteprima se attivo */}
                  {isAudioMuted && (
                    <div className="absolute top-6 right-6 bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10" style={{ filter: 'none' }}>
                       <span className="text-white text-xs">🔇</span>
                    </div>
                  )}
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
              <div className="mt-8 grid grid-cols-1 animate-slide-up">
                <button
                  onClick={() => playResult()}
                  className={`flex items-center justify-center gap-3 py-4 rounded-2xl font-bold transition-all ${isPlaying ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700'}`}
                >
                  <span>{isPlaying ? '⏹️' : (isAudioMuted ? '🔇' : '🔊')}</span>
                  <span>{isPlaying ? 'STOP' : (isAudioMuted ? 'TEST AUDIO (MUTO)' : 'ASCOLTA VOCE')}</span>
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
        
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
          margin-top: -6px;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 8px;
          cursor: pointer;
          background: #1e293b;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default App;
