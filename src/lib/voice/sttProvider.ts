import { STTEvent, STTResult } from './types';
import { micManager } from './microphoneManager';
import { bobAi } from '../aiEngine';
import { voiceDiagnostics } from './diagnostics';

export interface STTProvider {
  start: (onTranscript: (event: STTEvent) => void, onError: (err: string) => void) => Promise<void>;
  stop: () => void;
  isListening: () => boolean;
}

/** Transcription models, tried in order. Bounded — never an infinite retry loop. */
const STT_MODELS = ['gemini-3.5-transcribe', 'gemini-2.5-flash-transcribe'];
const MIN_BLOB_BYTES = 500;

export class DualEngineSTTProvider implements STTProvider {
  private recognition: any = null;
  private active = false;
  private fullTranscript = '';
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private chunkIntervalId: any = null;
  private onTranscriptCallback?: (event: STTEvent) => void;
  private onErrorCallback?: (err: string) => void;
  private isProcessingChunk = false;
  private abortController: AbortController | null = null;
  private webSpeechAlive = false;

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

  /** Browser SpeechRecognition is free (no Gemini usage) — prefer it when present. */
  public hasWebSpeech(): boolean {
    return Boolean(this.recognition);
  }

  public getEngine(): 'webspeech' | 'gemini' | 'none' {
    if (this.webSpeechAlive) return 'webspeech';
    return this.hasWebSpeech() || bobAi.hasGeminiKey() ? 'gemini' : 'none';
  }

  public async start(
    onTranscript: (event: STTEvent) => void,
    onError: (err: string) => void
  ): Promise<void> {
    if (this.active) return;

    this.active = true;
    this.webSpeechAlive = false;
    this.fullTranscript = '';
    this.audioChunks = [];
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;

    if (this.recognition) {
      try {
        this.setupRecognitionListeners();
        this.recognition.start();
        this.webSpeechAlive = true;
      } catch (err: any) {
        console.warn('WebSpeech start failed, using audio recorder engine:', err?.message);
        this.webSpeechAlive = false;
      }
    }

    voiceDiagnostics.set({
      stt: this.webSpeechAlive ? 'browser (WebSpeech)' : 'Gemini transcription',
    });

    // Recorder runs alongside WebSpeech: it is the only engine in Electron,
    // and the safety net if WebSpeech dies mid-session.
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
        voiceDiagnostics.mark('sttEnd');
        this.onTranscriptCallback?.({
          transcript: this.fullTranscript,
          isFinal: true,
          engine: 'webspeech',
        });
      } else if (interim.trim()) {
        const live = this.fullTranscript ? `${this.fullTranscript} ${interim.trim()}` : interim.trim();
        this.onTranscriptCallback?.({ transcript: live, isFinal: false, engine: 'webspeech' });
      }
    };

    this.recognition.onerror = (e: any) => {
      const error = e.error || '';
      if (error === 'no-speech' || error === 'aborted') return;

      console.warn('[bob] WebSpeech error:', error);
      if (error === 'network' || error === 'not-allowed' || error === 'service-not-allowed') {
        // WebSpeech is unavailable here — Gemini transcription takes over.
        this.webSpeechAlive = false;
        voiceDiagnostics.set({ stt: 'Gemini transcription (WebSpeech unavailable)' });
        if (!bobAi.hasGeminiKey()) {
          this.onErrorCallback?.('Gemini API key required for voice transcription.');
        }
        return;
      }
      this.onErrorCallback?.(error);
    };

    this.recognition.onend = () => {
      if (this.active && this.recognition) {
        try {
          this.recognition.start();
        } catch {
          this.webSpeechAlive = false;
        }
      }
    };
  }

  private startMediaRecorderChunking() {
    const stream = micManager.getStream();
    if (!stream) {
      voiceDiagnostics.set({ stt: 'no microphone stream' });
      return;
    }

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

      // Long sessions: detach and transcribe roughly once a minute.
      this.chunkIntervalId = setInterval(() => {
        if (this.active && this.audioChunks.length > 0 && !this.webSpeechAlive) {
          void this.detachAndTranscribeChunk();
        }
      }, 55000);
    } catch (err) {
      console.warn('MediaRecorder chunking error:', err);
      voiceDiagnostics.set({ stt: 'recorder unavailable' });
    }
  }

  private async detachAndTranscribeChunk(): Promise<STTResult> {
    if (this.isProcessingChunk || this.audioChunks.length === 0) {
      return { text: '' };
    }
    this.isProcessingChunk = true;

    try {
      const currentBlob = new Blob(this.audioChunks, {
        type: this.mediaRecorder?.mimeType || 'audio/webm',
      });
      this.audioChunks = [];

      const result = await this.transcribeDetailed(currentBlob);
      if (!this.active) return result; // session ended while the request was in flight

      const text = result.text.trim();
      if (text && !this.fullTranscript.includes(text)) {
        this.fullTranscript += (this.fullTranscript ? ' ' : '') + text;
        voiceDiagnostics.mark('sttEnd');
        this.onTranscriptCallback?.({
          transcript: this.fullTranscript,
          isFinal: true,
          engine: 'gemini',
        });
      } else if (!text && result.error && !this.webSpeechAlive) {
        // Sole engine failed — never fail silently.
        this.onErrorCallback?.(result.error.message);
      }
      return result;
    } catch (e) {
      console.warn('Background chunk transcription failed:', e);
      return { text: '', error: { code: 'STT_FAILED', message: 'Voice transcription failed. Try again.' } };
    } finally {
      this.isProcessingChunk = false;
    }
  }

  /**
   * Force-finalize everything captured so far. Called on speech end so a result
   * doesn't wait for the ~55s chunk boundary (WebSpeech is absent in Electron,
   * which is what made both modes appear to listen forever).
   */
  public async flush(): Promise<void> {
    if (!this.active || this.audioChunks.length === 0) return;
    if (this.webSpeechAlive) return; // browser engine is already transcribing for free
    await this.detachAndTranscribeChunk();
  }

  /**
   * End-of-session finalization (Prompt mode "End"): stop the recorder, grab the
   * tail, and transcribe whatever the free browser engine did not already give us.
   */
  public async finalize(): Promise<STTResult> {
    const already = this.fullTranscript.trim();
    const tail = await this.collectRemainingAudio();
    const blobs = [...this.audioChunks, ...(tail ? [tail] : [])];
    this.audioChunks = [];

    if (already) {
      return { text: already };
    }
    if (blobs.length === 0) {
      return { text: '', error: { code: 'NO_AUDIO', message: 'No audio was captured.' } };
    }

    const blob = new Blob(blobs, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
    if (blob.size < MIN_BLOB_BYTES) {
      return { text: '', error: { code: 'NO_AUDIO', message: 'No speech was captured.' } };
    }
    return this.transcribeDetailed(blob);
  }

  private collectRemainingAudio(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const recorder = this.mediaRecorder;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }
      const chunks: Blob[] = [];
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve(
          chunks.length
            ? new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
            : null
        );
      };
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => setTimeout(finish, 0);
      try {
        recorder.stop();
      } catch {
        finish();
        return;
      }
      setTimeout(finish, 1500);
    });
  }

  public async transcribeDetailed(blob: Blob): Promise<STTResult> {
    const geminiKey = bobAi.getGeminiKey();
    if (!geminiKey) {
      return {
        text: '',
        error: { code: 'NO_KEY', message: 'Gemini API key required for voice transcription.' },
      };
    }
    if (blob.size < MIN_BLOB_BYTES) {
      return { text: '', error: { code: 'NO_AUDIO', message: 'No audio was captured.' } };
    }

    voiceDiagnostics.stage('stt', 'Sending audio to STT');
    voiceDiagnostics.set({ stt: 'request sent' });

    let base64Data = '';
    try {
      base64Data = await this.toBase64(blob);
    } catch {
      return { text: '', error: { code: 'STT_FAILED', message: 'Could not read the recorded audio.' } };
    }

    let lastError: STTResult['error'];
    for (const model of STT_MODELS) {
      this.abortController = new AbortController();
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
            signal: this.abortController.signal,
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: 'Transcribe this spoken audio exactly into plain text. Do not add commentary.' },
                    { inlineData: { mimeType: blob.type || 'audio/webm', data: base64Data } },
                  ],
                },
              ],
            }),
          }
        );

        const data = await res.json().catch(() => null);

        if (res.ok) {
          const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          voiceDiagnostics.set({ stt: text ? 'transcript received' : 'empty transcript' });
          voiceDiagnostics.mark('sttEnd');
          if (!text.trim()) {
            return {
              text: '',
              error: { code: 'STT_EMPTY', message: 'Bob heard audio but got an empty transcript.' },
            };
          }
          return { text };
        }

        const apiMessage: string = data?.error?.message || `Gemini rejected the request (HTTP ${res.status}).`;
        // Never log or surface the key — only the API message.
        console.warn(`[bob] STT ${model} failed: HTTP ${res.status} ${apiMessage.slice(0, 160)}`);
        lastError = {
          code: res.status === 404 || res.status === 400 ? 'STT_REJECTED' : 'STT_FAILED',
          message: `Gemini transcription failed: ${apiMessage.slice(0, 160)}`,
        };
        // Only try the next model when this one is unknown/unsupported.
        if (res.status !== 404 && res.status !== 400) break;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return { text: '', error: { code: 'NETWORK', message: 'Voice transcription cancelled.' } };
        }
        console.warn(`[bob] STT ${model} network error:`, String(err?.message || err).slice(0, 160));
        lastError = {
          code: 'NETWORK',
          message: 'Voice transcription failed: network unreachable.',
        };
        break;
      }
    }

    this.abortController = null;
    voiceDiagnostics.set({ stt: 'failed' });
    return { text: '', error: lastError || { code: 'STT_FAILED', message: 'Voice transcription failed. Try again.' } };
  }

  /** Kept for compatibility with earlier callers. */
  public async transcribeAudioBlob(blob: Blob): Promise<string> {
    const result = await this.transcribeDetailed(blob);
    return result.text;
  }

  private toBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
  }

  public stop(): void {
    this.active = false;
    this.webSpeechAlive = false;

    if (this.chunkIntervalId) {
      clearInterval(this.chunkIntervalId);
      this.chunkIntervalId = null;
    }

    if (this.abortController) {
      try { this.abortController.abort(); } catch {}
      this.abortController = null;
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
    voiceDiagnostics.set({ stt: 'idle' });
  }

  public isListening(): boolean {
    return this.active;
  }
}

export const stt = new DualEngineSTTProvider();
