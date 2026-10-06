export type VoiceMode = 'prompt' | 'call';

export type VoiceState =
  | 'IDLE'
  | 'CONNECTING'
  | 'LISTENING'
  | 'USER_SPEAKING'
  | 'TRANSCRIBING'
  | 'SUBMITTING'
  | 'THINKING'
  | 'SPEAKING'
  | 'INTERRUPTING'
  | 'FALLBACK'
  | 'ERROR'
  | 'STOPPING';

export interface VoiceConfig {
  enabled: boolean;
  defaultVoice: string;
  speechStartThreshold: number; // energy threshold (0-255 average)
  speechEndSilenceDurationMs: number; // silence that ends a turn (call default)
  promptSilenceDurationMs: number; // dictation review window
  callSilenceDurationMs: number; // conversational end-of-turn silence
  minimumSpeechDurationMs: number; // ignore tiny clicks / noises
  maximumTurnDurationMs: number; // session-safety cap on one utterance
  idleNoSpeechTimeoutMs: number; // stop listening when nothing was ever said
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  maxQueueLength: number;
  continuous: boolean;
  // Realtime (Gemini Live) — primary Call transport when available.
  liveEnabled: boolean;
  liveModels: string[];
  liveVoice: string;
  liveConnectTimeoutMs: number;
  // Provider constraints
  ttsMaxCharsPerRequest: number;
}

export interface STTEvent {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
  engine?: 'webspeech' | 'gemini';
}

export interface STTResult {
  text: string;
  error?: {
    code: 'NO_KEY' | 'NETWORK' | 'STT_REJECTED' | 'STT_EMPTY' | 'STT_FAILED' | 'NO_AUDIO';
    message: string;
  };
}

export interface AudioChunk {
  id: string;
  generationId: number;
  text: string;
  audioBlob?: Blob;
  audioUrl?: string;
}

export type TTSEngine = 'gemini-tts' | 'browser-synthesis';

export type VoiceStateListener = (
  state: VoiceState,
  data?: {
    transcript?: string;
    aiReply?: string;
    mode?: VoiceMode;
    error?: string;
    errorCode?: string;
    provider?: string;
  }
) => void;
