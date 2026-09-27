import { create } from 'zustand';
import { VoiceState } from '../lib/voice/types';
import { voiceController } from '../lib/voice/voiceController';

interface VoiceStoreState {
  voiceState: VoiceState;
  currentTranscript: string;
  errorMessage: string | null;
  startVoiceMode: () => Promise<boolean>;
  stopVoiceMode: () => void;
  interrupt: () => void;
  feedAIChunk: (chunk: string) => void;
  finalizeAIResponse: (fullText?: string) => void;
}

export const useVoiceStore = create<VoiceStoreState>((set) => {
  // Subscribe to controller state changes
  voiceController.subscribe((state, data) => {
    set({
      voiceState: state,
      currentTranscript: data?.transcript || '',
      errorMessage: data?.error || null,
    });
  });

  return {
    voiceState: 'IDLE',
    currentTranscript: '',
    errorMessage: null,

    startVoiceMode: async () => {
      return voiceController.startVoiceMode();
    },

    stopVoiceMode: () => {
      voiceController.stopVoiceMode();
    },

    interrupt: () => {
      voiceController.interrupt();
    },

    feedAIChunk: (chunk: string) => {
      voiceController.feedAIStreamChunk(chunk);
    },

    finalizeAIResponse: (fullText?: string) => {
      voiceController.finalizeAIResponse(fullText);
    },
  };
});
