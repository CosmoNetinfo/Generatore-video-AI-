
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ArticleSummary } from "../types";

// Helper per riassumere l'articolo tramite URL
export const summarizeArticle = async (url: string): Promise<ArticleSummary> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Analizza l'articolo: ${url}. 
  Crea uno script di 30 secondi (60-80 parole) per un robottino cartoon che riassume i punti chiave.
  Termina con: "Leggi tutto su Cosmonet.info!". Rispondi in JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          script: { type: Type.STRING },
          headline: { type: Type.STRING }
        },
        required: ["script", "headline"]
      }
    }
  });

  return JSON.parse(response.text.trim());
};

// Generazione voce (TTS)
export const generateSpeech = async (script: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Voce robottino amichevole: ${script}` }] }],
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
  if (!base64Audio) throw new Error("Audio fallito");
  return base64Audio;
};

// Generazione immagine statica del robot ottimizzata per TikTok (9:16)
// Il prompt è ora specifico per il robot mostrato dall'utente
export const generateRobotImage = async (headline: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imagePrompt = `A high-quality 3D render of a specific friendly cartoon robot: it has a polished silver/grey metallic body with orange circular accents on its joints and ears. It has large, glowing, expressive cyan blue circular eyes. The robot is standing in a high-tech dark server room with racks of servers and glowing green and blue circuit patterns. The robot is holding a small, glowing, semi-transparent holographic screen. Cinematic lighting, vertical 9:16 aspect ratio, Pixar/Disney style, 8k resolution, highly detailed textures. The theme of the holographic screen is: ${headline}.`;

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
  const dataInt16 = new Int16Array(data.buffer);
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
