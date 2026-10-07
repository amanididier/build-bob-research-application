import {
  TextToSpeech,
  type ProgressCallback,
  type TtsSynthesisResult,
  type TtsVoiceEntry,
} from '@moonshine-ai/moonshine-wasm';
import { TTSEngine } from './types';
import { voiceDiagnostics } from './diagnostics';
import { MODEL_LOAD_TIMEOUT_MS, TTS_GENERATE_TIMEOUT_MS } from './voiceConfig';

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeoutMessage: string): Promise<T> {
  let timer: any;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(onTimeoutMessage)), ms);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: { message: string }) => void;
  onEngine?: (engine: TTSEngine) => void;
}

export interface TTSProvider {
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  stop: () => void;
  isSpeaking: () => boolean;
}

export type TTSModelStatus =
  | { state: 'idle' | 'ready' | 'speaking'; progress: number; message: string; file?: string }
  | { state: 'loading' | 'downloading'; progress: number; message: string; file?: string }
  | { state: 'error'; progress: number; message: string; file?: string };

type TTSStatusListener = (status: TTSModelStatus) => void;

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\[\^?\d+\]/g, '')
    .replace(/```[\s\S]*?```/g, 'Here is the relevant code block.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\|.*\|/g, '')
    .replace(/https?:\/\/\S+/g, 'source link')
    .replace(/[#*_~]/g, '')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

function floatToWavBlob(result: TtsSynthesisResult): Blob {
  const samples = result.audio;
  const sampleRate = result.sampleRate;
  const pcmBytes = samples.length * 2;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, pcmBytes, true);

  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return new Blob([header, pcm], { type: 'audio/wav' });
}

function classifyTTSError(error: unknown): string {
  const raw = String((error as any)?.message || error || 'Local speech failed.');
  const lower = raw.toLowerCase();
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('download')) {
    return 'Bob needs to download the local voice model once. Check your connection and try again.';
  }
  if (lower.includes('model') || lower.includes('wasm')) {
    return 'Bob could not start the local voice model.';
  }
  return raw.slice(0, 180) || 'Bob could not generate local speech.';
}

/**
 * Local TTS provider using Moonshine's WASM speech engine. It does not call
 * Gemini TTS, Gemini Live, Edge TTS, or browser speechSynthesis.
 */
export class MoonshineTTSProvider implements TTSProvider {
  private engine: TextToSpeech | null = null;
  private loaded = false;
  private speaking = false;
  private loadPromise: Promise<void> | null = null;
  private listeners: Set<TTSStatusListener> = new Set();
  private status: TTSModelStatus = {
    state: 'idle',
    progress: 0,
    message: 'Local voice model is not loaded yet.',
  };

  public subscribe(listener: TTSStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  public getStatus(): TTSModelStatus {
    return this.status;
  }

  private setStatus(status: TTSModelStatus): void {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }

  public getEngine(): TTSEngine | 'none' {
    return this.loaded ? 'moonshine-tts' : 'none';
  }

  public getPlannedEngine(): TTSEngine {
    return 'moonshine-tts';
  }

  private getEngineInstance(): TextToSpeech {
    if (this.engine) return this.engine;

    const onProgress: ProgressCallback = (fraction, file, bytes) => {
      const progress = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0;
      const pct = Math.round(progress * 100);
      const detail = bytes?.total
        ? `${Math.round((bytes.loaded / 1024 / 1024) * 10) / 10} / ${Math.round((bytes.total / 1024 / 1024) * 10) / 10} MB`
        : file;
      this.setStatus({
        state: progress > 0 && progress < 1 ? 'downloading' : 'loading',
        progress,
        file,
        message: progress > 0 && progress < 1 ? `Downloading local voice (${pct}%, ${detail})` : 'Loading local voice...',
      });
      voiceDiagnostics.set({ tts: `local voice ${pct}%` });
    };

    this.engine = new TextToSpeech()
      .language('en_us')
      .onProgress(onProgress);

    return this.engine;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.setStatus({ state: 'loading', progress: 0, message: 'Loading local voice...' });
    voiceDiagnostics.set({ tts: 'loading local voice' });
    this.loadPromise = withTimeout(
      this.getEngineInstance().load(),
      MODEL_LOAD_TIMEOUT_MS,
      'Loading the local voice model took too long. Check your connection or free up memory and try again.'
    )
      .then(() => {
        this.loaded = true;
        this.setStatus({ state: 'ready', progress: 1, message: 'Local voice ready.' });
        voiceDiagnostics.set({ tts: 'Moonshine local TTS ready' });
      })
      .catch((error) => {
        const message = classifyTTSError(error);
        this.setStatus({ state: 'error', progress: this.status.progress, message });
        voiceDiagnostics.error('TTS_INITIALIZATION_FAILED', message);
        throw new Error(message);
      })
      .finally(() => {
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  public async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    const clean = cleanTextForSpeech(text);
    if (!clean) {
      options.onEnd?.();
      return;
    }

    try {
      await this.ensureLoaded();
      options.onEngine?.('moonshine-tts');
      this.speaking = true;
      this.setStatus({ state: 'speaking', progress: 1, message: 'Bob is speaking locally.' });
      voiceDiagnostics.set({ tts: 'Moonshine local TTS' });
      voiceDiagnostics.mark('firstAudio');
      options.onStart?.();
      await withTimeout(
        this.getEngineInstance().say(clean),
        TTS_GENERATE_TIMEOUT_MS,
        "Bob couldn't generate speech quickly enough. Try shorter text."
      );
    } catch (error) {
      const message = classifyTTSError(error);
      options.onError?.({ message });
      voiceDiagnostics.error('TTS_GENERATION_FAILED', message);
    } finally {
      this.speaking = false;
      this.setStatus(this.loaded
        ? { state: 'ready', progress: 1, message: 'Local voice ready.' }
        : { state: 'idle', progress: 0, message: 'Local voice model is not loaded yet.' });
      options.onEnd?.();
    }
  }

  public async prepare(text: string): Promise<string | null> {
    const clean = cleanTextForSpeech(text);
    if (!clean) return null;

    try {
      await this.ensureLoaded();
      const result = this.getEngineInstance().synthesize(clean);
      return URL.createObjectURL(floatToWavBlob(result));
    } catch {
      return null;
    }
  }

  public async speakPrepared(url: string, options: SpeakOptions = {}): Promise<void> {
    options.onEngine?.('moonshine-tts');
    this.speaking = true;
    this.setStatus({ state: 'speaking', progress: 1, message: 'Bob is speaking locally.' });
    await new Promise<void>((resolve) => {
      const audio = new Audio(url);
      audio.onplay = () => {
        voiceDiagnostics.mark('firstAudio');
        options.onStart?.();
      };
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        options.onError?.({ message: 'Bob generated speech but could not play it.' });
        resolve();
      };
      audio.play().catch((error) => {
        URL.revokeObjectURL(url);
        options.onError?.({ message: `Audio playback blocked: ${String(error?.message || error).slice(0, 80)}` });
        resolve();
      });
    });
    this.speaking = false;
    this.setStatus({ state: 'ready', progress: 1, message: 'Local voice ready.' });
    options.onEnd?.();
  }

  public stop(): void {
    try {
      this.engine?.stop();
    } catch {}
    this.speaking = false;
    this.setStatus(this.loaded
      ? { state: 'ready', progress: 1, message: 'Local voice ready.' }
      : { state: 'idle', progress: 0, message: 'Local voice model is not loaded yet.' });
    voiceDiagnostics.set({ audio: 'idle' });
  }

  public isSpeaking(): boolean {
    return this.speaking || Boolean(this.engine?.isTalking);
  }

  public async listVoices(): Promise<TtsVoiceEntry[]> {
    return TextToSpeech.voices({ language: 'en_us' });
  }
}

export const tts = new MoonshineTTSProvider();
