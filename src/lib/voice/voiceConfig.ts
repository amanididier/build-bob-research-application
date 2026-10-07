import { VoiceConfig } from './types';

export const MODEL_LOAD_TIMEOUT_MS = 90000;
export const MAX_CALL_IDLE_MS = 60000;
export const SILENCE_TIMEOUT_MS = 1500;
export const MIC_START_TIMEOUT_MS = 8000;
export const STT_FINALIZE_TIMEOUT_MS = 10000;
export const TTS_GENERATE_TIMEOUT_MS = 15000;
export const FIRST_AUDIO_TIMEOUT_MS = 10000;

export const DEFAULT_VOICE_KEY = 'bob_voice_default_v1';

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled: true,
  defaultVoice: 'Kore',
  speechStartThreshold: 14,
  speechEndSilenceDurationMs: 1500,
  promptSilenceDurationMs: 1500,
  callSilenceDurationMs: 1500,
  minimumSpeechDurationMs: 250,
  maximumTurnDurationMs: 60000,
  idleNoSpeechTimeoutMs: 20000,
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  maxQueueLength: 20,
  continuous: true,
  liveEnabled: false,
  liveModels: [],
  liveVoice: 'Kore',
  liveConnectTimeoutMs: 12000,
  ttsMaxCharsPerRequest: 600,
};
