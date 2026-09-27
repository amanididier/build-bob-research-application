import { VoiceConfig } from './types';

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled: true,
  defaultVoice: 'Microsoft Jenny Online (Natural)',
  speechStartThreshold: 18, // Audio energy threshold
  speechEndSilenceDurationMs: 1200, // Natural pause allowance (1.2s of silence ends the turn)
  minimumSpeechDurationMs: 300, // Ignore brief noises/clicks
  maximumTurnDurationMs: 30000, // Max 30 seconds per continuous speech utterance
  ttsRate: 1.02,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  maxQueueLength: 20,
  continuous: true,
};
