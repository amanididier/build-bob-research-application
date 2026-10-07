import { MicTranscriber, ModelArch, type ProgressCallback } from '@moonshine-ai/moonshine-wasm';
import { STTEvent, STTResult } from './types';
import { voiceDiagnostics } from './diagnostics';
import { MODEL_LOAD_TIMEOUT_MS, MIC_START_TIMEOUT_MS, STT_FINALIZE_TIMEOUT_MS } from './voiceConfig';

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

export interface STTProvider {
  start: (onTranscript: (event: STTEvent) => void, onError: (err: string) => void) => Promise<void>;
  stop: () => void;
  flush: () => Promise<void>;
  finalize: () => Promise<STTResult>;
  isListening: () => boolean;
}

export type STTModelStatus =
  | { state: 'idle' | 'ready' | 'listening'; progress: number; message: string; file?: string }
  | { state: 'loading' | 'downloading'; progress: number; message: string; file?: string }
  | { state: 'error'; progress: number; message: string; file?: string };

type STTStatusListener = (status: STTModelStatus) => void;

function normalizeTranscript(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function punctuateDictation(text: string): string {
  const clean = normalizeTranscript(text);
  if (!clean) return '';
  const first = clean.charAt(0).toUpperCase() + clean.slice(1);
  return /[.!?]$/.test(first) ? first : `${first}.`;
}

function classifyMoonshineError(error: unknown): STTResult['error'] {
  const raw = String((error as any)?.message || error || 'Local transcription failed.');
  const lower = raw.toLowerCase();

  if (lower.includes('permission') || lower.includes('notallowed')) {
    return {
      code: 'MICROPHONE_PERMISSION_DENIED',
      message: 'Microphone permission was denied. Allow microphone access and try again.',
    };
  }
  if (lower.includes('notfound') || lower.includes('device') || lower.includes('microphone')) {
    return {
      code: 'MICROPHONE_NOT_FOUND',
      message: 'Bob could not find a working microphone.',
    };
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('download')) {
    return {
      code: 'NETWORK',
      message: 'Moonshine needs to download its local speech model once. Check your connection and try again.',
    };
  }
  if (lower.includes('model') || lower.includes('wasm')) {
    return {
      code: 'MODEL_LOAD_FAILED',
      message: 'Bob could not start the local Moonshine speech model.',
    };
  }
  return { code: 'STT_FAILED', message: raw.slice(0, 180) || 'Local transcription failed.' };
}

/**
 * Local-first speech recognition. Moonshine downloads its model once into the
 * browser Cache API, then runs transcription in WebAssembly without sending
 * microphone audio to Gemini or any cloud STT service.
 */
export class MoonshineSTTProvider implements STTProvider {
  private mic: MicTranscriber | null = null;
  private active = false;
  private loaded = false;
  private fullTranscript = '';
  private partialTranscript = '';
  private onTranscriptCallback?: (event: STTEvent) => void;
  private onErrorCallback?: (err: string) => void;
  private listeners: Set<STTStatusListener> = new Set();
  private status: STTModelStatus = {
    state: 'idle',
    progress: 0,
    message: 'Moonshine Tiny is not loaded yet.',
  };

  public subscribe(listener: STTStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  public getStatus(): STTModelStatus {
    return this.status;
  }

  private setStatus(status: STTModelStatus): void {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }

  private emitTranscript(text: string, isFinal: boolean): void {
    const transcript = isFinal ? punctuateDictation(text) : normalizeTranscript(text);
    if (!transcript) return;
    this.onTranscriptCallback?.({ transcript, isFinal, engine: 'moonshine' });
  }

  private getMic(): MicTranscriber {
    if (this.mic) return this.mic;

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
        message: progress > 0 && progress < 1 ? `Downloading Moonshine Tiny (${pct}%, ${detail})` : 'Loading Moonshine Tiny...',
      });
      voiceDiagnostics.set({ stt: `Moonshine model ${pct}%` });
    };

    this.mic = new MicTranscriber()
      .language('en')
      .modelArch(ModelArch.TinyStreaming)
      .audioConstraints({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      })
      .onProgress(onProgress)
      .onText((text) => {
        if (!this.active) return;
        this.partialTranscript = normalizeTranscript(text);
        const live = normalizeTranscript(`${this.fullTranscript} ${this.partialTranscript}`);
        this.emitTranscript(live, false);
      })
      .onLine((line) => {
        if (!this.active) return;
        const lineText = normalizeTranscript(line.text);
        if (!lineText) return;
        this.fullTranscript = normalizeTranscript(`${this.fullTranscript} ${lineText}`);
        this.partialTranscript = '';
        voiceDiagnostics.mark('sttEnd');
        this.emitTranscript(this.fullTranscript, true);
      })
      .onError((error) => {
        const classified = classifyMoonshineError(error);
        voiceDiagnostics.error(classified.code, classified.message);
        this.setStatus({ state: 'error', progress: this.status.progress, message: classified.message });
        this.onErrorCallback?.(classified.message);
      });

    return this.mic;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.setStatus({ state: 'loading', progress: 0, message: 'Loading Moonshine Tiny...' });
    voiceDiagnostics.set({ stt: 'loading Moonshine Tiny' });
    try {
      await withTimeout(
        this.getMic().load(),
        MODEL_LOAD_TIMEOUT_MS,
        'Loading the local speech model took too long. Check your connection or free up memory and try again.'
      );
      this.loaded = true;
      this.setStatus({ state: 'ready', progress: 1, message: 'Moonshine Tiny ready.' });
      voiceDiagnostics.set({ stt: 'Moonshine Tiny ready' });
    } catch (error) {
      const classified = classifyMoonshineError(error);
      this.setStatus({ state: 'error', progress: this.status.progress, message: classified.message });
      throw new Error(classified.message);
    }
  }

  public async start(
    onTranscript: (event: STTEvent) => void,
    onError: (err: string) => void
  ): Promise<void> {
    if (this.active) return;

    this.fullTranscript = '';
    this.partialTranscript = '';
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;
    this.active = true;

    try {
      await this.ensureLoaded();
      await withTimeout(
        this.getMic().start(),
        MIC_START_TIMEOUT_MS,
        "Microphone didn't respond. Check your mic or try again."
      );
      this.setStatus({ state: 'listening', progress: 1, message: 'Listening locally with Moonshine.' });
      voiceDiagnostics.set({ stt: 'Moonshine Tiny (local)' });
    } catch (error) {
      this.active = false;
      const classified = classifyMoonshineError(error);
      this.onErrorCallback?.(classified.message);
      throw new Error(classified.message);
    }
  }

  public async flush(): Promise<void> {
    // Moonshine streaming commits automatically on its own end-of-speech event.
  }

  public async finalize(): Promise<STTResult> {
    if (!this.active && !this.partialTranscript && !this.fullTranscript) {
      return { text: '', error: { code: 'NO_AUDIO', message: 'No speech was captured.' } };
    }

    try {
      if (this.mic?.isRunning) {
        await withTimeout(
          this.mic.stop(),
          STT_FINALIZE_TIMEOUT_MS,
          'Transcription is taking too long. Try again.'
        );
      }
    } catch (error) {
      const classified = classifyMoonshineError(error);
      this.active = false;
      return { text: '', error: classified };
    }

    this.active = false;
    const text = punctuateDictation(`${this.fullTranscript} ${this.partialTranscript}`);
    this.partialTranscript = '';
    this.fullTranscript = text;
    this.setStatus({ state: 'ready', progress: 1, message: 'Moonshine Tiny ready.' });

    if (!text) {
      return { text: '', error: { code: 'STT_EMPTY', message: 'Moonshine heard audio but produced no transcript.' } };
    }
    return { text };
  }

  public stop(): void {
    this.active = false;
    if (this.mic?.isRunning) {
      void this.mic.stop().catch(() => {});
    }
    this.partialTranscript = '';
    this.onTranscriptCallback = undefined;
    this.onErrorCallback = undefined;
    this.setStatus(this.loaded
      ? { state: 'ready', progress: 1, message: 'Moonshine Tiny ready.' }
      : { state: 'idle', progress: 0, message: 'Moonshine Tiny is not loaded yet.' });
    voiceDiagnostics.set({ stt: this.loaded ? 'Moonshine Tiny ready' : 'idle' });
  }

  public isListening(): boolean {
    return this.active;
  }
}

export const stt = new MoonshineSTTProvider();
