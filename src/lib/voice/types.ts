export type VoiceMode = 'prompt' | 'call';

export type VoiceState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'LOADING_MODEL'
  | 'CONNECTING_LOCAL_ENGINE'
  | 'LISTENING'
  | 'USER_SPEAKING'
  | 'TRANSCRIBING'
  | 'TRANSCRIPT_READY'
  | 'THINKING'
  | 'SPEAKING'
  | 'INTERRUPTING'
  | 'STOPPING'
  | 'ERROR'
  | 'FALLBACK';

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
  engine?: 'moonshine';
}

export interface STTResult {
  text: string;
  error?: {
    code:
      | 'MODEL_LOADING'
      | 'MODEL_LOAD_FAILED'
      | 'MICROPHONE_PERMISSION_DENIED'
      | 'MICROPHONE_NOT_FOUND'
      | 'NETWORK'
      | 'STT_EMPTY'
      | 'STT_FAILED'
      | 'NO_AUDIO';
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

export type TTSEngine = 'moonshine-tts' | 'browser-synthesis';

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
