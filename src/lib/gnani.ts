import { supabase } from '@/lib/supabase';
import type { SupportedLanguage } from '@/types';

/**
 * Gnani AI service layer — proxies to Supabase Edge Functions which hold the API keys.
 * Browser recordings (WebM/Opus) are converted to WAV before upload because Gnani
 * Prisma STT accepts MP3, WAV, M4A, AAC, FLAC, OGG — but not WebM.
 */

export interface SttResult {
  transcript: string;
  language: SupportedLanguage;
  mode: 'real' | 'mock';
}

export interface TtsResult {
  audioBase64: string;
  mode: 'real' | 'mock';
}

function edgeUrl(fn: string): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return `${url}/functions/v1/${fn}`;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

/**
 * Convert any browser-recorded audio blob (WebM/Opus, etc.) to 16kHz 16-bit mono WAV
 * using the Web Audio API. Gnani Prisma STT requires WAV (or MP3/M4A/AAC/FLAC/OGG).
 */
async function convertToWav(inputBlob: Blob): Promise<Blob> {
  const arrayBuffer = await inputBlob.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: 16000 });
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer);
    const numChannels = 1;
    const sampleRate = 16000;
    const samples = decoded.length;

    // Downmix to mono
    const channelData = new Float32Array(samples);
    if (decoded.numberOfChannels === 1) {
      channelData.set(decoded.getChannelData(0));
    } else {
      const left = decoded.getChannelData(0);
      const right = decoded.getChannelData(1);
      for (let i = 0; i < samples; i++) {
        channelData[i] = (left[i] + right[i]) / 2;
      }
    }

    // Resample if the decoded sample rate isn't 16kHz (AudioContext already resamples
    // during decodeAudioData when context.sampleRate is set, but decode may produce
    // the original rate on some browsers — resample manually to be safe)
    let pcm = channelData;
    if (decoded.sampleRate !== sampleRate) {
      const ratio = decoded.sampleRate / sampleRate;
      const newLength = Math.round(samples / ratio);
      pcm = new Float32Array(newLength);
      for (let i = 0; i < newLength; i++) {
        const srcIndex = Math.floor(i * ratio);
        pcm[i] = channelData[srcIndex] ?? 0;
      }
    }

    // Encode Float32 PCM to 16-bit PCM WAV
    const dataLength = pcm.length * 2;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);         // fmt chunk size
    view.setUint16(20, 1, true);          // audio format = PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
    view.setUint16(32, numChannels * 2, true);              // block align
    view.setUint16(34, 16, true);         // bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < pcm.length; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  } finally {
    audioContext.close();
  }
}

export async function transcribeAudio(
  audioBlob: Blob,
  language: SupportedLanguage,
): Promise<SttResult> {
  // Convert browser recording (WebM/Opus) to WAV — Gnani Prisma does not accept WebM
  const wavBlob = await convertToWav(audioBlob);

  const formData = new FormData();
  formData.append('audio', wavBlob, 'recording.wav');
  formData.append('language', language);

  const res = await fetch(edgeUrl('gnani-stt'), {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Speech recognition service unavailable (${res.status}). ${detail}`);
  }

  const data = await res.json();
  if (!data || typeof data.transcript !== 'string') {
    throw new Error('Received an unexpected response from the speech service.');
  }
  return {
    transcript: data.transcript,
    language: data.language ?? language,
    mode: data.mode === 'real' ? 'real' : 'mock',
  };
}

export async function synthesizeSpeech(
  text: string,
  language: SupportedLanguage,
): Promise<TtsResult> {
  const res = await fetch(edgeUrl('gnani-tts'), {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Voice playback service unavailable (${res.status}). ${detail}`);
  }

  const data = await res.json();
  if (!data || typeof data.audioBase64 !== 'string') {
    throw new Error('Received an unexpected response from the voice service.');
  }
  return {
    audioBase64: data.audioBase64,
    mode: data.mode === 'real' ? 'real' : 'mock',
  };
}

export function playAudioBase64(base64: string, mimeType = 'audio/wav'): HTMLAudioElement {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.play().catch(() => {});
  audio.addEventListener('ended', () => URL.revokeObjectURL(url));
  return audio;
}
