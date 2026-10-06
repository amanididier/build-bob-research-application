import { VoiceConfig } from './types';

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled: true,
  defaultVoice: 'Kore',
  speechStartThreshold: 14, // sensitive audio energy threshold (0-255 average)
  speechEndSilenceDurationMs: 1500, // natural conversational pause
  promptSilenceDurationMs: 10000, // dictation: long pause before the draft settles
  callSilenceDurationMs: 1500, // call: Bob answers ~1.5s after you stop
  minimumSpeechDurationMs: 250, // ignore tiny clicks
  maximumTurnDurationMs: 60000, // session-safety cap, not a usage limit
  idleNoSpeechTimeoutMs: 20000, // never listen forever with no speech at all
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  maxQueueLength: 20,
  continuous: true,
  liveEnabled: true,
  liveModels: [
    'gemini-live-2.5-flash-preview',
    'gemini-live-2.5-flash',
    'gemini-2.0-flash-live-preview-04-09',
  ],
  liveVoice: 'Kore',
  liveConnectTimeoutMs: 12000,
  ttsMaxCharsPerRequest: 600,
};
