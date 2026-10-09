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
  selectedModel: 'moonshine-tiny' | 'whisper-tiny';
  isPushToTalk: boolean;

  // Kokoro TTS model state
  isKokoroInstalled: boolean;
  kokoroProgress: { status: 'idle' | 'downloading' | 'ready' | 'error'; progress: number; file?: string; error?: string };
  downloadKokoroModel: () => Promise<boolean>;
  deleteKokoroModel: () => void;

  setVoiceMode: (mode: VoiceMode) => void;
  startVoiceMode: (mode?: VoiceMode) => Promise<boolean>;
  stopVoiceMode: () => void;
  interrupt: () => void;
  setActiveVoiceId: (voiceId: string) => void;
  previewVoice: (voiceId: string) => Promise<void>;
  openInstallCard: (type: 'stt' | 'tts') => void;
  closeInstallCard: () => void;
  downloadWhisperModel: () => Promise<boolean>;
  finishTurnImmediately: () => Promise<void>;
  startPushToTalk: (mode?: VoiceMode) => Promise<boolean>;
  stopPushToTalk: () => Promise<void>;
  setSelectedModel: (model: 'moonshine-tiny' | 'whisper-tiny') => void;
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

  // Subscribe to Kokoro TTS download progress
  tts.subscribeKokoro((progress) => {
    set({
      kokoroProgress: progress,
      isKokoroInstalled: tts.isKokoroInstalled(),
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
    selectedModel: localVoiceManager.getSelectedModel(),
    isPushToTalk: false,

    isKokoroInstalled: tts.isKokoroInstalled(),
    kokoroProgress: tts.getKokoroStatus(),

    setVoiceMode: (mode: VoiceMode) => {
      voiceController.setMode(mode);
      set({ voiceMode: mode });
    },

    startVoiceMode: async (mode?: VoiceMode) => {
      const targetMode = mode || voiceController.getMode();
      set({ voiceMode: targetMode });

      // If local model is not installed, prompt with the clean white card!
      if (!localVoiceManager.isModelInstalled()) {
        set({ isInstallCardOpen: true, installCardType: 'stt' });
        return false;
      }

      return voiceController.startVoiceMode(targetMode);
    },

    stopVoiceMode: () => {
      voiceController.stopVoiceMode();
      set({ isPushToTalk: false });
    },

    finishTurnImmediately: async () => {
      await voiceController.finishTurnImmediately();
      set({ isPushToTalk: false });
    },

    startPushToTalk: async (mode?: VoiceMode) => {
      const targetMode = mode || get().voiceMode;
      set({ isPushToTalk: true, voiceMode: targetMode });

      if (!localVoiceManager.isModelInstalled()) {
        set({ isInstallCardOpen: true, installCardType: 'stt', isPushToTalk: false });
        return false;
      }

      return voiceController.startPushToTalk(targetMode);
    },

    stopPushToTalk: async () => {
      set({ isPushToTalk: false });
      await voiceController.stopPushToTalk();
    },

    setSelectedModel: (model: 'moonshine-tiny' | 'whisper-tiny') => {
      localVoiceManager.setSelectedModel(model);
      set({
        selectedModel: model,
        isWhisperInstalled: localVoiceManager.isModelInstalled(model),
        modelProgress: localVoiceManager.getStatus(),
      });
    },

    interrupt: () => {
      voiceController.interrupt();
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

    downloadKokoroModel: async () => {
      const ok = await tts.initKokoro();
      set({ isKokoroInstalled: tts.isKokoroInstalled() });
      if (ok) {
        set({ isInstallCardOpen: false, installCardType: null });
      }
      return ok;
    },

    deleteKokoroModel: () => {
      tts.clearKokoro();
      set({ isKokoroInstalled: false });
    },
  };
});
