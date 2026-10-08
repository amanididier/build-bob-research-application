import { STTEvent } from './types';
import { micManager } from './microphoneManager';
import { localVoiceManager } from './localVoiceManager';
import { pcmRecorder } from './pcmRecorder';

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
/** A slice shorter than this is not worth a Whisper pass (~0.9s of audio). */
const MIN_CHUNK_SAMPLES = Math.round(SAMPLE_RATE * 0.9);
/** Hard ceiling so transcription can never hang "forever". */
const FLUSH_TIMEOUT_MS = 20000;
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
  private hasWhisper = false;

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

    // Warm the on-device model now so the first release does not pay the load cost.
    this.hasWhisper = localVoiceManager.isReady();
    if (!this.hasWhisper && localVoiceManager.isModelInstalled()) {
      void localVoiceManager.ensureReady().then((ok) => {
        this.hasWhisper = ok;
      });
    }

    if (!this.recognition && !localVoiceManager.isModelInstalled()) {
      onError(
        'No speech engine available. Install the on-device transcription model from Settings → Voice Models.'
      );
    }

    // 1. Browser WebSpeech gives free zero-latency live words where it exists
    //    (Chrome). Electron has no SpeechRecognition, so Whisper does the work.
    if (this.recognition) {
      try {
        this.setupRecognitionListeners();
        this.recognition.start();
      } catch (err: any) {
        console.warn('[DualEngineSTT] WebSpeech start warning:', err?.message);
      }
    }

    // 2. Rolling on-device transcription while the user is still holding to talk.
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
   * Transcribes everything recorded since the last committed sample and appends
   * it to the live transcript. Used both for rolling partials while holding and
   * for the final tail on release.
   */
  private async transcribePendingSlice(isFinal: boolean): Promise<string> {
    if (!this.active) return '';
    if (this.isProcessingChunk) return '';
    // Where the browser streams live words for free, let it own the transcript —
    // running Whisper in parallel would duplicate every phrase. Whisper only takes
    // over on release if WebSpeech came back empty (and always in Electron).
    if (this.webSpeechProducedText) return '';
    if (!isFinal && this.recognition) return '';
    if (!this.hasWhisper) {
      this.hasWhisper = localVoiceManager.isReady();
      if (!this.hasWhisper) return '';
    }

    const recorded = pcmRecorder.getRecordedAudio();
    if (!recorded) return '';

    const pending = recorded.samples.subarray(this.committedSampleCount);
    if (pending.length < MIN_CHUNK_SAMPLES) return '';

    this.isProcessingChunk = true;
    this.transcribing = true;
    try {
      const slice = new Float32Array(pending);
      const text = await this.withTimeout(
        localVoiceManager.transcribeSamples(slice),
        isFinal ? FLUSH_TIMEOUT_MS : CHUNK_TIMEOUT_MS
      );
      this.committedSampleCount += slice.length;

      const clean = (text || '').trim();
      if (clean) {
        this.fullTranscript += (this.fullTranscript ? ' ' : '') + clean;
        this.onTranscriptCallback?.({ transcript: this.fullTranscript, isFinal });
      }
      return clean;
    } catch (e: any) {
      if (e?.message === 'timeout') {
        this.onErrorCallback?.(
          'Transcription is taking too long on this device. Try a shorter recording.'
        );
      } else {
        console.warn('[DualEngineSTT] Transcription warning:', e);
        this.onErrorCallback?.('On-device transcription failed. Please try again.');
      }
      return '';
    } finally {
      this.isProcessingChunk = false;
      this.transcribing = false;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
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
      // On 'network' or other WebSpeech browser errors we do NOT crash:
      // the PCM recorder + on-device Whisper take over seamlessly.
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
   * Finalizes the current turn: transcribes whatever is still uncommitted and
   * returns the complete transcript. Always terminates — bounded by FLUSH_TIMEOUT_MS.
   * `reason` distinguishes an explicit release (worth reporting silence) from a
   * background VAD pause (silence is normal there, so stay quiet).
   */
  public async flush(reason: 'release' | 'vad' = 'release'): Promise<string> {
    if (!this.active) return this.fullTranscript.trim();

    this.clearRollTimer();

    // Wait for an in-flight rolling slice instead of racing it.
    const waitedStart = Date.now();
    while (this.isProcessingChunk && Date.now() - waitedStart < CHUNK_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, 60));
    }

    await this.transcribePendingSlice(true);

    if (reason === 'release' && !this.fullTranscript.trim()) {
      if (!this.hasWhisper && !this.recognition) {
        this.onErrorCallback?.(
          'The on-device transcription model is still loading. Give it a moment, then hold and speak again.'
        );
      } else {
        this.onErrorCallback?.(
          'No speech was detected in that recording. Hold and speak a little closer to the microphone.'
        );
      }
    }

    this.committedSampleCount = 0;
    pcmRecorder.resetTurn();
    this.startRollingTranscription();

    return this.fullTranscript.trim();
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
