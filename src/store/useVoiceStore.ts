import { create } from 'zustand';
import { VoiceMode, VoiceState } from '../lib/voice/types';
import { voiceController } from '../lib/voice/voiceController';
import { voiceDiagnostics, VoiceDiagnosticsSnapshot } from '../lib/voice/diagnostics';

interface VoiceStoreState {
  voiceState: VoiceState;
  voiceMode: VoiceMode;
  currentTranscript: string;
  lastUserSpeech: string;
  lastBobReply: string;
  errorMessage: string | null;
  provider: string;
  notice: string | null;
  isSpeaking: boolean;
  speakingSource: 'call' | 'read-aloud' | null;
  diagnostics: VoiceDiagnosticsSnapshot;
  setVoiceMode: (mode: VoiceMode) => void;
  startVoiceMode: (mode?: VoiceMode) => Promise<boolean>;
  stopVoiceMode: () => void;
  endDictation: () => Promise<string>;
  interrupt: () => void;
  speakText: (text: string) => number;
  stopSpeaking: () => void;
  clearNotice: () => void;
}

export const useVoiceStore = create<VoiceStoreState>((set) => {
  voiceController.subscribe((state, data) => {
    set({
      voiceState: state,
      voiceMode: data?.mode || voiceController.getMode(),
      currentTranscript: data?.transcript || '',
      lastBobReply: data?.aiReply || '',
      errorMessage: data?.error || null,
      provider: data?.provider || '',
    });
  });

  voiceController.addSpeakingListener((info) => {
    set({ isSpeaking: info.speaking, speakingSource: info.source });
  });

  voiceController.addNoticeListener((message) => {
    set({ notice: message });
  });

  voiceDiagnostics.subscribe((snapshot) => {
    set({ diagnostics: snapshot });
  });

  return {
    voiceState: 'IDLE',
    voiceMode: 'prompt',
    currentTranscript: '',
    lastUserSpeech: '',
    lastBobReply: '',
    errorMessage: null,
    provider: '',
    notice: null,
    isSpeaking: false,
    speakingSource: null,
    diagnostics: voiceDiagnostics.get(),

    setVoiceMode: (mode: VoiceMode) => {
      voiceController.setMode(mode);
      set({ voiceMode: mode });
    },

    startVoiceMode: async (mode?: VoiceMode) => {
      const targetMode = mode || voiceController.getMode();
      set({ voiceMode: targetMode });
      return voiceController.startVoiceMode(targetMode);
    },

    stopVoiceMode: () => {
      voiceController.stopVoiceMode();
    },

    endDictation: () => voiceController.endDictation(),

    interrupt: () => {
      voiceController.interrupt();
    },

    speakText: (text: string) => voiceController.speakText(text, 'read-aloud'),

    stopSpeaking: () => {
      voiceController.stopSpeaking();
    },

    clearNotice: () => set({ notice: null }),
  };
});
