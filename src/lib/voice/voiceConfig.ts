import { VoiceConfig } from './types';

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled: true,
  defaultVoice: 'Microsoft Christopher Online (Natural)',
  speechStartThreshold: 14, // Sensitive audio energy threshold
  speechEndSilenceDurationMs: 1000,
  promptSilenceDurationMs: 0,
  callSilenceDurationMs: 1000,
  minimumSpeechDurationMs: 250, // Ignore tiny clicks
  maximumTurnDurationMs: 60000, // 1 minute per speech chunk (as requested)
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  maxQueueLength: 20,
  continuous: true,
};
