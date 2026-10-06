import { STTEvent } from './types';
import { micManager } from './microphoneManager';
import { bobAi } from '../aiEngine';

export interface STTProvider {
  start: (onTranscript: (event: STTEvent) => void, onError: (err: string) => void) => Promise<void>;
  stop: () => void;
  stopAndFlush?: () => Promise<string>;
  isListening: () => boolean;
}

export class DualEngineSTTProvider implements STTProvider {
  private recognition: any = null;
  private active = false;
  private lastFinalTranscript = '';
  private fullTranscript = '';
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private chunkIntervalId: any = null;
  private onTranscriptCallback?: (event: STTEvent) => void;
  private onErrorCallback?: (err: string) => void;
  private isProcessingChunk = false;
  private stopping = false;

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
          console.warn('SpeechRecognition initialization error:', e);
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
    this.stopping = false;
    this.lastFinalTranscript = '';
    this.fullTranscript = '';
    this.audioChunks = [];
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;

    let webSpeechStarted = false;

    // 1. Try browser SpeechRecognition if present
    if (this.recognition) {
      try {
        this.setupRecognitionListeners();
        this.recognition.start();
        webSpeechStarted = true;
      } catch (err: any) {
        console.warn('WebSpeech start failed, using audio recorder engine:', err?.message);
        webSpeechStarted = false;
      }
    }

    // 2. Start MediaRecorder for 1-minute chunking and fallback transcription
    this.startMediaRecorderChunking();
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
        if (!this.fullTranscript.endsWith(final.trim())) {
          this.fullTranscript += (this.fullTranscript ? ' ' : '') + final.trim();
        }
        this.onTranscriptCallback?.({ transcript: this.fullTranscript, isFinal: true });
      } else if (interim.trim()) {
        const live = this.fullTranscript ? `${this.fullTranscript} ${interim.trim()}` : interim.trim();
        this.onTranscriptCallback?.({ transcript: live, isFinal: false });
      }
    };

    this.recognition.onerror = (e: any) => {
      const error = e.error || '';
      if (error === 'no-speech' || error === 'aborted') {
        return; // Normal idle
      }

      console.warn('[bob] WebSpeech error encountered:', error);
      // In Electron or offline, WebSpeech throws 'network'. We keep MediaRecorder running!
      if (error === 'network' || error === 'not-allowed') {
        // Fall back gracefully to background audio chunk transcription
      } else {
        this.onErrorCallback?.(error);
      }
    };

    this.recognition.onend = () => {
      if (this.active && !this.stopping) {
        try {
          this.recognition.start();
        } catch {}
      }
    };
  }

  private startMediaRecorderChunking() {
    const stream = micManager.getStream();
    if (!stream) return;

    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(2000); // 2-second timeslices

      // As requested: every 1 minute (60s) or upon pause, detach chunk and transcribe in background
      this.chunkIntervalId = setInterval(() => {
        if (this.active && this.audioChunks.length > 0) {
          this.detachAndTranscribeChunk();
        }
      }, 55000); // ~1 minute chunk
    } catch (err) {
      console.warn('MediaRecorder chunking error:', err);
    }
  }

  private async detachAndTranscribeChunk() {
    if (this.isProcessingChunk || this.audioChunks.length === 0) return;
    this.isProcessingChunk = true;

    try {
      const currentBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
      this.audioChunks = []; // detach current minute for next instance

      const transcript = await this.transcribeAudioBlob(currentBlob);
      if (transcript && transcript.trim()) {
        const text = transcript.trim();
        if (!this.fullTranscript.includes(text)) {
          this.fullTranscript += (this.fullTranscript ? ' ' : '') + text;
          this.onTranscriptCallback?.({ transcript: this.fullTranscript, isFinal: true });
        }
      }
    } catch (e) {
      console.warn('Background chunk transcription failed:', e);
    } finally {
      this.isProcessingChunk = false;
    }
  }

  public async transcribeAudioBlob(blob: Blob): Promise<string> {
    const geminiKey = bobAi.getGeminiKey();
    if (!geminiKey || blob.size < 500) {
      return '';
    }

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = (reader.result as string || '').split(',')[1] || '';
          resolve(res);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Data = await base64Promise;

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-transcribe:generateContent?key=${geminiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: 'Transcribe this spoken audio exactly into plain text. Do not add commentary.' },
                {
                  inlineData: {
                    mimeType: blob.type || 'audio/webm',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return text;
      }
    } catch (e) {
      console.warn('Gemini audio transcription error:', e);
    }
    return '';
  }

  /**
   * Force-finalize everything captured so far. Called on speech end so a
   * result doesn't wait for the ~55s chunk boundary (or for WebSpeech, which
   * is often absent/offline in Electron) — this is what made both modes
   * appear to listen indefinitely and never produce a result.
   */
  public async flush(): Promise<void> {
    if (!this.active || this.audioChunks.length === 0) return;
    await this.detachAndTranscribeChunk();
  }

  public async stopAndFlush(): Promise<string> {
    if (!this.active) return this.fullTranscript;
    this.stopping = true;
    const recorder = this.mediaRecorder;
    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const previousStop = recorder.onstop;
        recorder.onstop = (event) => {
          previousStop?.call(recorder, event);
          resolve();
        };
        try { recorder.stop(); } catch { resolve(); }
      });
    }
    await this.detachAndTranscribeChunk();
    const transcript = this.fullTranscript;
    this.stop();
    return transcript;
  }

  public stop(): void {
    this.stopping = true;
    this.active = false;

    if (this.chunkIntervalId) {
      clearInterval(this.chunkIntervalId);
      this.chunkIntervalId = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
      this.mediaRecorder = null;
    }

    this.audioChunks = [];
    this.isProcessingChunk = false;
  }

  public isListening(): boolean {
    return this.active;
  }
}

export const stt = new DualEngineSTTProvider();
