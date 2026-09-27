export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'USER_SPEAKING'
  | 'TRANSCRIBING'
  | 'SUBMITTING'
  | 'THINKING'
  | 'SPEAKING'
  | 'INTERRUPTING'
  | 'ERROR'
  | 'STOPPING';

export interface VoiceConfig {
  enabled: boolean;
  defaultVoice: string;
  speechStartThreshold: number; // energy threshold (0-100)
  speechEndSilenceDurationMs: number; // duration of silence to declare end of turn (e.g. 1100ms)
  minimumSpeechDurationMs: number; // ignore tiny clicks / noises < 250ms
  maximumTurnDurationMs: number; // max speech turn before auto-finalizing (e.g. 30000ms)
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  maxQueueLength: number;
  continuous: boolean;
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

export type VoiceStateListener = (state: VoiceState, data?: { transcript?: string; error?: string }) => void;
