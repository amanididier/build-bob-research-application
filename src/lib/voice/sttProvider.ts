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
const STT_MODEL = 'gemini-2.5-flash';
const STT_INSTRUCTION =
  'Transcribe this audio exactly as spoken. Output only the transcribed words, with normal punctuation. No commentary.';

function pickMimeType(): string {
  const candidates = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
  if (typeof MediaRecorder === 'undefined') return '';
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
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
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${STT_MODEL}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: STT_INSTRUCTION },
                  { inline_data: { mime_type: blob.type || 'audio/webm', data } }
                ]
              }
            ],
            generationConfig: { temperature: 0 }
          })
        }
      );
      if (!res.ok) {
        if (res.status === 400 || res.status === 404) {
          this.failOnce('Gemini rejected this audio format. Dictation stopped.');
        } else if (res.status === 403 || res.status === 401) {
          this.failOnce('Your Gemini key refused dictation (403). Check the key in Settings.');
        } else if (res.status === 429) {
          this.failOnce('Gemini rate-limited dictation (429). Pause a moment and tap the mic again.');
        }
        return '';
      }
      const json = await res.json();
      const text = String(json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '').trim();
      return text;
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
