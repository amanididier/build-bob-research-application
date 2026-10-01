import { STTEvent } from './types';
import { bobAi } from '../aiEngine';

export interface STTProvider {
  start: (
    onTranscript: (event: STTEvent) => void,
    onError: (err: string) => void,
    stream: MediaStream
  ) => Promise<void>;
  stop: () => void;
  flush: () => Promise<void>;
  isListening: () => boolean;
}

const CHUNK_MS = 60_000;
const STT_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
const STT_INSTRUCTION =
  'Transcribe this audio exactly as spoken. Output only the transcribed words, with normal punctuation. No commentary.';

function pickMimeType(): string {
  // Gemini accepts audio/webm and audio/mp4. Prefer webm/opus (universally
  // supported by Chromium's MediaRecorder and by Gemini); mp4/aac only as a
  // fallback. Never record with a codecs-suffixed container we then reject.
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4'];
  if (typeof MediaRecorder === 'undefined') return '';
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

// Gemini wants a bare container MIME (audio/webm, audio/mp4), not the
// MediaRecorder's full "audio/webm;codecs=opus" string.
function geminiMime(recorderMime: string): string {
  const base = (recorderMime || '').split(';')[0].trim().toLowerCase();
  if (base === 'audio/webm' || base === 'audio/mp4' || base === 'audio/ogg' || base === 'audio/wav') return base;
  return 'audio/webm';
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Dictation by sending recorded audio chunks to Gemini. Web Speech API is unusable
 * inside packaged Electron (no Google service keys), which is why the old provider
 * showed "Listening" forever and never produced text.
 */
class GeminiChunkedSTTProvider implements STTProvider {
  private active = false;
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private segmentChunks: Blob[] = [];
  private segmentStartedAt = 0;
  private chunkTimer: any = null;
  private committed = '';
  private pending = 0;
  private failed = false;
  private onTranscript?: (event: STTEvent) => void;
  private onError?: (err: string) => void;

  public async start(
    onTranscript: (event: STTEvent) => void,
    onError: (err: string) => void,
    stream: MediaStream
  ): Promise<void> {
    if (!bobAi.hasGeminiKey()) {
      onError('Dictation needs your free Google Gemini key. Add it in Settings, then tap the mic again.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      onError('This environment cannot record audio.');
      return;
    }

    this.onTranscript = onTranscript;
    this.onError = onError;
    this.stream = stream;
    this.committed = '';
    this.failed = false;
    this.active = true;
    this.beginSegment();
  }

  private beginSegment(): void {
    if (!this.active || !this.stream) return;
    const mime = pickMimeType();
    try {
      this.recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    } catch {
      this.onError?.('Microphone recorder could not start.');
      this.active = false;
      return;
    }
    this.segmentChunks = [];
    this.segmentStartedAt = Date.now();
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.segmentChunks.push(e.data);
    };
    this.recorder.onstop = () => {
      const blob = new Blob(this.segmentChunks, { type: this.recorder?.mimeType || mime || 'audio/webm' });
      this.segmentChunks = [];
      if (this.active) this.beginSegment();
      if (blob.size > 1024) {
        void this.transcribeSegment(blob).then((text) => {
          if (!text) return;
          this.committed = this.committed ? `${this.committed} ${text}` : text;
          this.onTranscript?.({ transcript: this.committed, isFinal: false });
        });
      }
    };
    this.recorder.start(1000);
    this.chunkTimer = setTimeout(() => this.detachSegment(), CHUNK_MS);
  }

  private detachSegment(): void {
    if (this.recorder && this.recorder.state !== 'inactive') {
      try {
        this.recorder.stop();
      } catch {}
    }
  }

  private async transcribeSegment(blob: Blob): Promise<string> {
    this.pending += 1;
    try {
      const key = bobAi.getGeminiKey();
      if (!key) return '';
      const data = await blobToBase64(blob);
      const mimeType = geminiMime(blob.type);

      let lastError = '';
      for (const model of STT_MODELS) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: STT_INSTRUCTION },
                    { inlineData: { mimeType, data } }
                  ]
                }
              ],
              generationConfig: { temperature: 0 }
            })
          }
        );

        if (res.ok) {
          const json = await res.json();
          const text = String(json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '').trim();
          if (text) return text;
          lastError = 'empty-response';
          continue;
        }

        // Capture Gemini's own explanation so the pill shows the real reason.
        let detail = '';
        try {
          const errJson = await res.json();
          detail = String(errJson?.error?.message || '').split('\n')[0];
        } catch {}

        if (res.status === 404) {
          lastError = detail || 'model-unavailable';
          continue; // try the next model
        }
        if (res.status === 401 || res.status === 403) {
          this.failOnce(`Gemini key refused dictation (${res.status}). Check the key in Settings.`);
          return '';
        }
        if (res.status === 429) {
          this.failOnce('Gemini rate-limited dictation (429). Pause a moment and tap the mic again.');
          return '';
        }
        // 400 etc.: report Gemini's actual message (bad key, bad MIME, …).
        this.failOnce(detail ? `Dictation: ${detail}` : `Dictation failed (HTTP ${res.status}).`);
        return '';
      }
      if (lastError) this.failOnce(`Dictation: ${lastError}`);
      return '';
    } catch {
      return '';
    } finally {
      this.pending -= 1;
    }
  }

  private failOnce(message: string): void {
    if (this.failed) return;
    this.failed = true;
    this.onError?.(message);
  }

  /** Transcribe everything spoken since the last commit, right now. */
  public async flush(): Promise<void> {
    if (!this.active) return;
    this.detachSegment();
    const wait = async () => {
      for (let i = 0; i < 40 && this.pending > 0; i++) {
        await new Promise((r) => setTimeout(r, 150));
      }
    };
    await wait();
    this.onTranscript?.({ transcript: this.committed, isFinal: true });
  }

  public stop(): void {
    this.active = false;
    if (this.chunkTimer) clearTimeout(this.chunkTimer);
    this.chunkTimer = null;
    if (this.recorder && this.recorder.state !== 'inactive') {
      try {
        this.recorder.stop();
      } catch {}
    }
    this.recorder = null;
    this.stream = null;
    this.committed = '';
  }

  public isListening(): boolean {
    return this.active;
  }
}

export const stt = new GeminiChunkedSTTProvider();
