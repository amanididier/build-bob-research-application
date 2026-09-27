import { create } from 'zustand';

interface VoiceStoreState {
  isVoiceActive: boolean;
  isSpeaking: boolean;
  voiceSpeed: number;
  lastSpokenText: string | null;
  setVoiceActive: (active: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setVoiceSpeed: (speed: number) => void;
  speakText: (text: string) => void;
}

export const useVoiceStore = create<VoiceStoreState>((set, get) => ({
  isVoiceActive: false,
  isSpeaking: false,
  voiceSpeed: 1.0,
  lastSpokenText: null,

  setVoiceActive: (active) => set({ isVoiceActive: active }),
  setSpeaking: (speaking) => set({ isSpeaking: speaking }),
  setVoiceSpeed: (speed) => set({ voiceSpeed: speed }),

  speakText: (text) => {
    if (!text || typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = get().voiceSpeed;

    utterance.onstart = () => set({ isSpeaking: true, lastSpokenText: text });
    utterance.onend = () => set({ isSpeaking: false });
    utterance.onerror = () => set({ isSpeaking: false });

    synth.speak(utterance);
  },
}));
