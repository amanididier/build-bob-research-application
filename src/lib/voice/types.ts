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
  | 'SUBMITTING'
  | 'THINKING'
  | 'SPEAKING'
  | 'INTERRUPTING'
  | 'ERROR'
  | 'STOPPING';

export interface VoiceProfile {
  id: string;
  name: string;
  gender: 'male' | 'female';
  personality: string;
  language: string;
  previewText: string;
  /** Gemini prebuilt studio voice used when the user has connected their own key. */
  geminiVoice?: string;
  /** Fallback tuning so on-device SAPI5 voices still sound distinct per character. */
  pitch?: number;
  rate?: number;
}

export interface VoiceConfig {
  enabled: boolean;
  defaultVoice: string;
  speechStartThreshold: number; // energy threshold (0-100)
  speechEndSilenceDurationMs: number; // duration of silence to declare end of turn
  promptSilenceDurationMs: number; // 1.5s for WhisperFlow dictation
  callSilenceDurationMs: number; // 1.5s for call auto-reply
  minimumSpeechDurationMs: number; // ignore tiny clicks / noises < 200ms
  maximumTurnDurationMs: number; // max speech turn before auto-finalizing
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  maxQueueLength: number;
  continuous: boolean;
  liveEnabled?: boolean;
  liveModels: string[];
  liveConnectTimeoutMs?: number;
  liveVoice?: string;
}

export interface STTEvent {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
}

export interface AudioChunk {
  id: string;
  generationId: number;
  text: string;
  audioBlob?: Blob;
  audioUrl?: string;
}

export type VoiceStateListener = (
  state: VoiceState,
  data?: { transcript?: string; aiReply?: string; mode?: VoiceMode; error?: string }
) => void;

