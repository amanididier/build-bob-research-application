import { VoiceConfig } from './types';

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled: true,
  defaultVoice: 'Microsoft Christopher Online (Natural)',
  speechStartThreshold: 14, // Sensitive audio energy threshold
  speechEndSilenceDurationMs: 3000, // Default 3s
  promptSilenceDurationMs: 10000, // 10s silence in dictation mode before auto-completing
  callSilenceDurationMs: 3000, // 3s silence in conversational call mode before Bob answers
  minimumSpeechDurationMs: 250, // Ignore tiny clicks
  maximumTurnDurationMs: 60000, // 1 minute per speech chunk (as requested)
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  maxQueueLength: 20,
  continuous: true,
};
