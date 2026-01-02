
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ArticleSummary } from "../types";

// Helper per riassumere l'articolo tramite URL con focus SEO e Hashtag
export const summarizeArticle = async (url: string): Promise<ArticleSummary> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Analizza l'articolo a questo URL: ${url}. 
  1. Crea uno script di circa 30 secondi (60-80 parole) per un video Short. Inizia con un "HOOK" (gancio) potente e finisci con una frase che permetta un loop perfetto.
  2. Genera un "seoTitle" stile ricerca (es. "Come fare X..." o "3 Segreti di Y...").
  3. Genera una "seoDescription" di 2 righe con parole chiave forti.
  4. Genera una lista di "seoHashtags" (almeno 6) mescolando tag generici (#Shorts #AI) con tag specifici basati sul tema dell'articolo.
  5. Genera una "headline" brevissima per l'immagine del robot.

  Rispondi esclusivamente in formato JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          script: { type: Type.STRING },
          headline: { type: Type.STRING },
          seoTitle: { type: Type.STRING },
          seoDescription: { type: Type.STRING },
          seoHashtags: { type: Type.STRING }
        },
        required: ["script", "headline", "seoTitle", "seoDescription", "seoHashtags"]
      }
    }
  });

  const summary = JSON.parse(response.text.trim());
  
  const sources: { uri: string; title?: string }[] = [];
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  
  if (groundingChunks) {
    groundingChunks.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        sources.push({
          uri: chunk.web.uri,
          title: chunk.web.title
        });
      }
    });
  }

  return {
    ...summary,
    sources
  };
};

// Generazione voce (TTS)
export const generateSpeech = async (script: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Dì con entusiasmo e ritmo incalzante da tech influencer: ${script}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Generazione audio fallita");
  return base64Audio;
};

// Generazione immagine del robot
export const generateRobotImage = async (headline: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imagePrompt = `A high-end 3D character design of a cute robot holding a hologram that says "${headline}". Vertical 9:16, cinematic lighting, futuristic server room background. High quality 8k render.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: imagePrompt }],
    },
    config: {
      imageConfig: { aspectRatio: "9:16" }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Generazione immagine fallita");
};

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};
