export type VoiceMode = 'prompt' | 'call';

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
  speechEndSilenceDurationMs: number; // duration of silence to declare end of turn
  promptSilenceDurationMs: number; // 10s for dictation review
  callSilenceDurationMs: number; // 3s for call auto-reply
  minimumSpeechDurationMs: number; // ignore tiny clicks / noises < 250ms
  maximumTurnDurationMs: number; // max speech turn before auto-finalizing
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

export type VoiceStateListener = (
  state: VoiceState,
  data?: { transcript?: string; aiReply?: string; mode?: VoiceMode; error?: string }
) => void;
