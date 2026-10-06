/**
 * Voice diagnostics + latency telemetry.
 * Development-visible truth about which voice path is running and what failed.
 * Nothing here stores audio or transcripts beyond the current in-memory turn.
 */

export type VoiceStage =
  | 'idle'
  | 'mic'
  | 'vad'
  | 'speech-end'
  | 'stt'
  | 'transcript'
  | 'gemini'
  | 'first-token'
  | 'tts'
  | 'first-audio'
  | 'playback'
  | 'error';

export type VoiceErrorCode =
  | 'MIC_DENIED'
  | 'MIC_UNAVAILABLE'
  | 'NO_KEY'
  | 'NETWORK'
  | 'STT_FAILED'
  | 'STT_EMPTY'
  | 'STT_REJECTED'
  | 'TTS_FAILED'
  | 'LIVE_FAILED'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface VoiceError {
  code: VoiceErrorCode;
  message: string;
  at: number;
}

export interface VoiceDiagnosticsSnapshot {
  mode: string;
  provider: string;
  model: string;
  connection: string;
  microphone: string;
  vad: string;
  stt: string;
  tts: string;
  audio: string;
  stage: VoiceStage;
  lastEvent: string;
  lastError: VoiceError | null;
  marks: Record<string, number>;
  latency: Record<string, number>;
}

type Listener = (snapshot: VoiceDiagnosticsSnapshot) => void;

const MARK_PAIRS: Array<[string, string, string]> = [
  ['speechEnd', 'sttEnd', 'speechToTranscript'],
  ['sttEnd', 'firstToken', 'transcriptToResponse'],
  ['firstToken', 'firstAudio', 'responseToAudio'],
  ['speechEnd', 'firstAudio', 'perceivedLatency'],
  ['readAloudClick', 'firstAudio', 'readAloudToAudio'],
];

class VoiceDiagnostics {
  private snapshot: VoiceDiagnosticsSnapshot = {
    mode: 'none',
    provider: 'none',
    model: '-',
    connection: 'idle',
    microphone: 'inactive',
    vad: 'idle',
    stt: 'idle',
    tts: 'idle',
    audio: 'idle',
    stage: 'idle',
    lastEvent: 'Idle',
    lastError: null,
    marks: {},
    latency: {},
  };
  private listeners: Set<Listener> = new Set();

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener({ ...this.snapshot });
    return () => this.listeners.delete(listener);
  }

  public get(): VoiceDiagnosticsSnapshot {
    return { ...this.snapshot };
  }

  public set(patch: Partial<VoiceDiagnosticsSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  public stage(stage: VoiceStage, event?: string): void {
    this.snapshot = { ...this.snapshot, stage, lastEvent: event || stage };
    this.emit();
  }

  public event(text: string): void {
    this.snapshot = { ...this.snapshot, lastEvent: text };
    this.emit();
  }

  public mark(name: string): void {
    const marks = { ...this.snapshot.marks, [name]: Math.round(performance.now()) };
    const latency: Record<string, number> = {};
    for (const [from, to, label] of MARK_PAIRS) {
      if (marks[from] && marks[to]) latency[label] = marks[to] - marks[from];
    }
    this.snapshot = { ...this.snapshot, marks, latency };
    this.emit();
  }

  public error(code: VoiceErrorCode, message: string): void {
    this.snapshot = {
      ...this.snapshot,
      stage: 'error',
      lastError: { code, message, at: Date.now() },
      lastEvent: message,
    };
    this.emit();
  }

  public clearError(): void {
    if (!this.snapshot.lastError) return;
    this.snapshot = { ...this.snapshot, lastError: null };
    this.emit();
  }

  public resetTurn(): void {
    this.snapshot = { ...this.snapshot, marks: {}, latency: {} };
    this.emit();
  }

  public reset(): void {
    this.snapshot = {
      ...this.snapshot,
      provider: 'none',
      model: '-',
      connection: 'idle',
      microphone: 'inactive',
      vad: 'idle',
      stt: 'idle',
      tts: 'idle',
      audio: 'idle',
      stage: 'idle',
      lastEvent: 'Idle',
      marks: {},
      latency: {},
    };
    this.emit();
  }

  private emit(): void {
    const copy = { ...this.snapshot };
    this.listeners.forEach((l) => l(copy));
  }
}

export const voiceDiagnostics = new VoiceDiagnostics();

/** Classify a thrown error into a user-facing message + code without leaking keys. */
export function classifyError(err: any): VoiceError {
  const raw = String(err?.message || err?.name || err || '').toLowerCase();
  const at = Date.now();

  if (raw.includes('not-allowed') || raw.includes('permission') || raw.includes('denied')) {
    return {
      code: 'MIC_DENIED',
      message: "Bob can't access your microphone. Allow microphone access in your system settings and try again.",
      at,
    };
  }
  if (raw.includes('notfound') || raw.includes('not supported') || raw.includes('overconstrained')) {
    return { code: 'MIC_UNAVAILABLE', message: 'No microphone was found. Connect one and try again.', at };
  }
  if (raw.includes('failed to fetch') || raw.includes('networkerror') || raw.includes('net::') || raw.includes('websocket')) {
    return { code: 'NETWORK', message: 'Voice connection lost. Check your network and try again.', at };
  }
  if (raw.includes('api key') || raw.includes('401') || raw.includes('403') || raw.includes('permission_denied')) {
    return { code: 'NO_KEY', message: 'Gemini API key required for voice. Add your key in Settings.', at };
  }
  if (raw.includes('timeout') || raw.includes('aborted')) {
    return { code: 'TIMEOUT', message: 'Voice request timed out. Try again.', at };
  }
  return { code: 'UNKNOWN', message: 'Voice failed unexpectedly. Try again.', at };
}
