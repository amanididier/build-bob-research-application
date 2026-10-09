import { VoiceConfig } from './types';

export const SILENCE_TIMEOUT_MS = 1500;
export const MAX_CALL_IDLE_MS = 60000;
export const MODEL_LOAD_TIMEOUT_MS = 90000;
export const DEFAULT_VOICE_KEY = 'bob_voice_default';

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled: true,
  defaultVoice: 'Noah', // Warm conversational natural voice
  speechStartThreshold: 12, // High sensitivity audio energy threshold
  speechEndSilenceDurationMs: 1500, // 1.5s silence handoff (natural conversation)
  promptSilenceDurationMs: 1500, // 1.5s silence in WhisperFlow dictation before finalizing
  callSilenceDurationMs: 1500, // 1.5s silence in Call mode before Bob responds
  minimumSpeechDurationMs: 200, // Ignore tiny ambient clicks < 200ms
  maximumTurnDurationMs: 60000, // 1 minute per speech chunk
  ttsRate: 1.08, // Natural warm conversational pacing
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  maxQueueLength: 20,
  continuous: true,
  liveEnabled: false,
  liveModels: ['gemini-2.0-flash-exp'],
  liveConnectTimeoutMs: 8000,
  liveVoice: 'Puck',
};

