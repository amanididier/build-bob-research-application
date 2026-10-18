import { STTEvent } from './types';
import { micManager } from './microphoneManager';
import { pcmRecorder } from './pcmRecorder';
import { geminiTranscriptionService } from '../ai/GeminiTranscriptionService';
import { resolveGeminiApiKey } from '../ai/keyManager';

export interface STTProvider {
  start: (onTranscript: (event: STTEvent) => void, onError: (err: string) => void) => Promise<void>;
  stop: () => void;
  isListening: () => boolean;
  flush: (reason?: 'release' | 'vad') => Promise<string>;
  abort: () => void;
  isTranscribing: () => boolean;
}

const SAMPLE_RATE = 16000;
/** Rolling partials: transcribe a new slice of the hold every ~1.4s. */
const ROLL_INTERVAL_MS = 1400;
/** A rolling slice shorter than this is not worth a Whisper pass (~0.9s). */
const MIN_ROLL_SAMPLES = Math.round(SAMPLE_RATE * 0.9);
/**
 * The final pass must accept much shorter audio: a call-mode question is often
 * under a second long, and gating it at the rolling floor silently threw the
 * whole turn away (release → empty transcript → Bob never answered).
 */
const MIN_FINAL_SAMPLES = Math.round(SAMPLE_RATE * 0.3);
/** Hard ceiling so transcription can never hang "forever". */
const CHUNK_TIMEOUT_MS = 12000;

export class DualEngineSTTProvider implements STTProvider {
  private recognition: any = null;
  private active = false;
  private fullTranscript = '';
  private onTranscriptCallback?: (event: STTEvent) => void;
  private onErrorCallback?: (err: string) => void;
  private isProcessingChunk = false;
  private transcribing = false;
  private committedSampleCount = 0;
  private rollTimer: any = null;
  private webSpeechProducedText = false;

  constructor() {
    this.initWebSpeech();
  }

  private initWebSpeech() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.maxAlternatives = 1;
          this.recognition.lang = navigator.language || 'en-US';
        } catch (e) {
          console.warn('[DualEngineSTT] SpeechRecognition initialization warning:', e);
        }
      }
    }
  }

  public async start(
    onTranscript: (event: STTEvent) => void,
    onError: (err: string) => void
  ): Promise<void> {
    if (this.active) return;

    this.active = true;
    this.fullTranscript = '';
    this.committedSampleCount = 0;
    this.webSpeechProducedText = false;
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;

    const stream = micManager.getStream();
    if (stream) {
      pcmRecorder.start(stream);
    }

    // Dictation uses Gemini transcription, with browser SpeechRecognition as
    // the instant fallback. Never load a local Whisper model in the background.
    const apiKey = resolveGeminiApiKey();
    if (!this.recognition && !apiKey) {
      onError(
        'Gemini API key required for voice dictation. Add your key in Settings.'
      );
    }

    // 1. Browser WebSpeech gives instant zero-latency live streaming words
    if (this.recognition) {
      try {
        this.setupRecognitionListeners();
        this.recognition.start();
      } catch (err: any) {
        console.warn('[DualEngineSTT] WebSpeech start warning:', err?.message);
      }
    }

    // 2. Rolling audio transcription
    this.startRollingTranscription();
  }

  private startRollingTranscription(): void {
    this.clearRollTimer();
    this.rollTimer = setInterval(() => {
      void this.transcribePendingSlice(false);
    }, ROLL_INTERVAL_MS);
  }

  private clearRollTimer(): void {
    if (this.rollTimer) {
      clearInterval(this.rollTimer);
      this.rollTimer = null;
    }
  }

  /**
   * Transcribes recorded audio slices. Where browser WebSpeech exists, it provides
   * instant live typing; for finalization (and primary in Electron), Gemini transcription
   * provides verbatim, high-speed text recognition.
   */
  private async transcribePendingSlice(isFinal: boolean): Promise<string> {
    if (!this.active) return '';
    if (this.isProcessingChunk) return '';
    if (this.webSpeechProducedText && !isFinal) return '';
    if (!isFinal && this.recognition) return '';

    const recorded = pcmRecorder.getRecordedAudio();
    if (!recorded) return '';

    const pending = recorded.samples.subarray(this.committedSampleCount);
    const floor = isFinal ? MIN_FINAL_SAMPLES : MIN_ROLL_SAMPLES;
    if (pending.length < floor) return '';

    this.isProcessingChunk = true;
    this.transcribing = true;

    try {
      const slice = new Float32Array(pending);

      // Primary: Gemini Cloud STT (fast, accurate, no model downloads)
      const apiKey = resolveGeminiApiKey();
      if (apiKey) {
        if (isFinal) {
          const res = await geminiTranscriptionService.transcribeAudio(recorded.blob, 'audio/wav');
          if (res.text) {
            this.fullTranscript = res.text.trim();
            this.committedSampleCount = recorded.samples.length;
            this.onTranscriptCallback?.({ transcript: this.fullTranscript, isFinal: true });
            return this.fullTranscript;
          } else if (res.error && !this.webSpeechProducedText) {
            this.onErrorCallback?.(res.error);
          }
        } else {
          // Rolling partial slice via Gemini
          const res = await geminiTranscriptionService.transcribeSamples(slice);
          if (res.text) {
            this.committedSampleCount += slice.length;
            this.fullTranscript += (this.fullTranscript ? ' ' : '') + res.text.trim();
            this.onTranscriptCallback?.({ transcript: this.fullTranscript, isFinal: false });
            return res.text.trim();
          }
        }
      }

      // No local model fallback: if Gemini fails, browser SpeechRecognition
      // remains the only alternate path and flush() reports a clear error otherwise.
      return '';
    } catch (e: any) {
      console.warn('[DualEngineSTT] Transcription warning:', e);
      return '';
    } finally {
      this.isProcessingChunk = false;
      this.transcribing = false;
    }
  }

  private setupRecognitionListeners() {
    if (!this.recognition) return;

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      if (final.trim()) {
        const trimmed = final.trim();
        this.fullTranscript += (this.fullTranscript ? ' ' : '') + trimmed;
        this.webSpeechProducedText = true;
        this.onTranscriptCallback?.({ transcript: this.fullTranscript, isFinal: true });
      } else if (interim.trim()) {
        const live = this.fullTranscript ? `${this.fullTranscript} ${interim.trim()}` : interim.trim();
        this.onTranscriptCallback?.({ transcript: live, isFinal: false });
      }
    };

    this.recognition.onerror = (e: any) => {
      const error = e.error || '';
      if (error === 'no-speech' || error === 'aborted') {
        return; // Standard pauses between words
      }

      console.warn('[DualEngineSTT] WebSpeech error:', error);
      if (error === 'not-allowed') {
        this.onErrorCallback?.('Microphone access was denied. Please allow microphone permissions.');
      }
    };

    this.recognition.onend = () => {
      if (this.active) {
        setTimeout(() => {
          if (this.active && this.recognition) {
            try {
              this.recognition.start();
            } catch {}
          }
        }, 150);
      }
    };
  }

  /**
   * Finalizes the current turn: transcribes whatever is recorded and returns
   * the complete transcript. Gemini is the audio transcription engine; no local model is loaded.
   */
  public async flush(reason: 'release' | 'vad' = 'release'): Promise<string> {
    if (!this.active) return this.fullTranscript.trim();

    this.clearRollTimer();

    // Wait for any in-flight rolling slice
    const waitedStart = Date.now();
    while (this.isProcessingChunk && Date.now() - waitedStart < CHUNK_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, 60));
    }

    // If WebSpeech produced complete text, we already have words!
    if (this.webSpeechProducedText && this.fullTranscript.trim()) {
      const result = this.fullTranscript.trim();
      this.committedSampleCount = 0;
      pcmRecorder.resetTurn();
      this.startRollingTranscription();
      return result;
    }

    // Transcribe recorded audio with Gemini
    await this.transcribePendingSlice(true);

    if (!this.fullTranscript.trim()) {
      const recorded = pcmRecorder.getRecordedAudio();
      if (recorded && recorded.samples.length >= MIN_FINAL_SAMPLES) {
        const res = await geminiTranscriptionService.transcribeAudio(recorded.blob, 'audio/wav');
        if (res.text) {
          this.fullTranscript = res.text.trim();
          this.onTranscriptCallback?.({ transcript: this.fullTranscript, isFinal: true });
        } else if (res.error && reason === 'release') {
          this.onErrorCallback?.(res.error);
        }
      }
    }

    if (reason === 'release' && !this.fullTranscript.trim()) {
      const apiKey = resolveGeminiApiKey();
      if (!apiKey && !this.recognition) {
        this.onErrorCallback?.('Gemini API key required for voice dictation. Add your key in Settings.');
      } else {
        this.onErrorCallback?.('No speech was detected in that recording. Speak a little closer to the microphone.');
      }
    }

    const finalResult = this.fullTranscript.trim();
    this.committedSampleCount = 0;
    pcmRecorder.resetTurn();
    this.startRollingTranscription();

    return finalResult;
  }

  /** Discards the current turn without transcribing (used when voice mode stops). */
  public abort(): void {
    this.clearRollTimer();
    this.isProcessingChunk = false;
    this.transcribing = false;
    this.committedSampleCount = 0;
    this.fullTranscript = '';
    pcmRecorder.resetTurn();
  }

  public isTranscribing(): boolean {
    return this.transcribing;
  }

  public stop(): void {
    this.active = false;
    this.clearRollTimer();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }

    pcmRecorder.stop();
    this.isProcessingChunk = false;
    this.transcribing = false;
    this.committedSampleCount = 0;
  }

  public isListening(): boolean {
    return this.active;
  }
}

export const stt = new DualEngineSTTProvider();
