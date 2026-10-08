import { create } from 'zustand';
import { VoiceMode, VoiceState, VoiceProfile } from '../lib/voice/types';
import { voiceController } from '../lib/voice/voiceController';
import { localVoiceManager, ModelDownloadProgress } from '../lib/voice/localVoiceManager';
import { tts, CHATGPT_VOICES } from '../lib/voice/ttsProvider';

interface VoiceStoreState {
  voiceState: VoiceState;
  voiceMode: VoiceMode;
  currentTranscript: string;
  lastUserSpeech: string;
  lastBobReply: string;
  errorMessage: string | null;
  activeVoiceId: string;
  voices: VoiceProfile[];
  
  // Model install card state
  isInstallCardOpen: boolean;
  installCardType: 'stt' | 'tts' | null;
  modelProgress: ModelDownloadProgress;
  isWhisperInstalled: boolean;
  isPushToTalk: boolean;

  setVoiceMode: (mode: VoiceMode) => void;
  startVoiceMode: (mode?: VoiceMode) => Promise<boolean>;
  stopVoiceMode: () => void;
  interrupt: () => void;
  beginPushToTalk: (mode?: VoiceMode) => Promise<boolean>;
  endPushToTalk: () => Promise<string>;
  setActiveVoiceId: (voiceId: string) => void;
  previewVoice: (voiceId: string) => Promise<void>;
  openInstallCard: (type: 'stt' | 'tts') => void;
  closeInstallCard: () => void;
  downloadWhisperModel: () => Promise<boolean>;
}

/** Chrome exposes SpeechRecognition; Electron does not, so it needs the local model. */
function hasBrowserSpeechRecognition(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export const useVoiceStore = create<VoiceStoreState>((set, get) => {
  // Subscribe to controller state changes
  voiceController.subscribe((state, data) => {
    set({
      voiceState: state,
      voiceMode: data?.mode || voiceController.getMode(),
      currentTranscript: data?.transcript || '',
      lastBobReply: data?.aiReply || '',
      errorMessage: data?.error || null,
    });
  });

  // Subscribe to local voice manager download progress
  localVoiceManager.subscribe((progress) => {
    set({
      modelProgress: progress,
      isWhisperInstalled: localVoiceManager.isModelInstalled(),
    });
  });

  return {
    voiceState: 'IDLE',
    voiceMode: 'prompt',
    currentTranscript: '',
    lastUserSpeech: '',
    lastBobReply: '',
    errorMessage: null,
    activeVoiceId: tts.getActiveVoiceId(),
    voices: CHATGPT_VOICES,

    isInstallCardOpen: false,
    installCardType: null,
    modelProgress: localVoiceManager.getStatus(),
    isWhisperInstalled: localVoiceManager.isModelInstalled(),
    isPushToTalk: false,

    setVoiceMode: (mode: VoiceMode) => {
      voiceController.setMode(mode);
      set({ voiceMode: mode });
    },

    startVoiceMode: async (mode?: VoiceMode) => {
      const targetMode = mode || voiceController.getMode();
      set({ voiceMode: targetMode });

      // If no speech engine exists on this device, prompt with the clean white card.
      if (!localVoiceManager.isModelInstalled() && !hasBrowserSpeechRecognition()) {
        set({ isInstallCardOpen: true, installCardType: 'stt' });
        return false;
      }

      return voiceController.startVoiceMode(targetMode);
    },

    stopVoiceMode: () => {
      voiceController.stopVoiceMode();
      set({ isPushToTalk: false });
    },

    interrupt: () => {
      voiceController.interrupt();
    },

    beginPushToTalk: async (mode?: VoiceMode) => {
      const targetMode = mode || voiceController.getMode();
      if (!localVoiceManager.isModelInstalled() && !hasBrowserSpeechRecognition()) {
        set({ voiceMode: targetMode, isInstallCardOpen: true, installCardType: 'stt' });
        return false;
      }
      set({ voiceMode: targetMode });
      const ok = await voiceController.beginPushToTalk(targetMode);
      set({ isPushToTalk: ok });
      return ok;
    },

    endPushToTalk: async () => {
      set({ isPushToTalk: false });
      return voiceController.endPushToTalk();
    },

    setActiveVoiceId: (voiceId: string) => {
      tts.setActiveVoiceId(voiceId);
      set({ activeVoiceId: voiceId });
    },

    previewVoice: async (voiceId: string) => {
      await tts.previewVoice(voiceId);
    },

    openInstallCard: (type: 'stt' | 'tts') => {
      set({ isInstallCardOpen: true, installCardType: type });
    },

    closeInstallCard: () => {
      set({ isInstallCardOpen: false, installCardType: null });
    },

    downloadWhisperModel: async () => {
      const ok = await localVoiceManager.downloadModel(false);
      set({ isWhisperInstalled: localVoiceManager.isModelInstalled() });
      if (ok) {
        // If download succeeded and card was open, close it and auto-start if in flow
        const currentMode = get().voiceMode;
        set({ isInstallCardOpen: false, installCardType: null });
        await voiceController.startVoiceMode(currentMode);
      }
      return ok;
    },
  };
});
