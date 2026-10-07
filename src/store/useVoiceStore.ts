import { create } from 'zustand';
import { VoiceMode, VoiceState } from '../lib/voice/types';
import { voiceController } from '../lib/voice/voiceController';
import { voiceDiagnostics, VoiceDiagnosticsSnapshot } from '../lib/voice/diagnostics';
import { stt, STTModelStatus } from '../lib/voice/sttProvider';
import { tts, TTSModelStatus } from '../lib/voice/ttsProvider';
import { DEFAULT_VOICE_KEY } from '../lib/voice/voiceConfig';

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
  sttModelStatus: STTModelStatus;
  ttsModelStatus: TTSModelStatus;
  setVoiceMode: (mode: VoiceMode) => void;
  startVoiceMode: (mode?: VoiceMode) => Promise<boolean>;
  stopVoiceMode: () => void;
  endDictation: () => Promise<string>;
  interrupt: () => void;
  speakText: (text: string) => number;
  stopSpeaking: () => void;
  clearNotice: () => void;
  preloadSttModel: () => Promise<void>;
  preloadTtsModel: () => Promise<void>;
  deleteSttModel: () => Promise<void>;
  deleteTtsModel: () => Promise<void>;
  previewTtsVoice: (voiceId: string) => Promise<void>;
  setDefaultVoice: (voiceId: string) => void;
  getDefaultVoice: () => string;
  unloadVoiceModels: () => void;
  testMicrophone: () => Promise<{ ok: boolean; message: string }>;
}

async function clearMoonshineCache(): Promise<void> {
  try {
    if (typeof window === 'undefined' || !window.caches) return;
    const keys = await window.caches.keys();
    for (const key of keys) {
      const lower = key.toLowerCase();
      if (lower.includes('moonshine') || lower.includes('wasm') || lower.includes('cache')) {
        try {
          await window.caches.delete(key);
        } catch {}
      }
    }
  } catch {}
}

export const useVoiceStore = create<VoiceStoreState>((set, get) => {
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

  stt.subscribe((status) => {
    set({ sttModelStatus: status });
  });

  tts.subscribe((status) => {
    set({ ttsModelStatus: status });
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
    sttModelStatus: stt.getStatus(),
    ttsModelStatus: tts.getStatus(),

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

    preloadSttModel: async () => {
      try {
        await stt.start(() => {}, () => {});
        stt.stop();
      } catch (err: any) {
        const msg = String(err?.message || err || 'Could not download speech model.');
        set({ errorMessage: msg });
        throw new Error(msg);
      }
    },

    preloadTtsModel: async () => {
      try {
        await tts.speak(' ', {});
        tts.stop();
      } catch (err: any) {
        const msg = String(err?.message || err || 'Could not download TTS model.');
        set({ errorMessage: msg });
        throw new Error(msg);
      }
    },

    deleteSttModel: async () => {
      stt.stop();
      try {
        // Best-effort: force a new instance-like state on STT via cache clear.
        (stt as any).loaded = false;
        (stt as any).mic = null;
      } catch {}
      await clearMoonshineCache();
      stt.subscribe(() => {}); // trigger listeners refresh
      set({ sttModelStatus: { state: 'idle', progress: 0, message: 'Moonshine Tiny is not loaded yet.' } });
    },

    deleteTtsModel: async () => {
      tts.stop();
      try {
        (tts as any).loaded = false;
        (tts as any).engine = null;
      } catch {}
      await clearMoonshineCache();
      set({ ttsModelStatus: { state: 'idle', progress: 0, message: 'Local voice model is not loaded yet.' } });
    },

    previewTtsVoice: async (voiceId: string) => {
      try {
        tts.stop();
        const current = get().getDefaultVoice();
        try {
          // Temporary voice apply: write default, speak sample, restore
          get().setDefaultVoice(voiceId);
          await tts.speak("Hello! I'm Bob, your research companion.", {});
        } finally {
          get().setDefaultVoice(current);
        }
      } catch (err: any) {
        const msg = String(err?.message || err || 'Voice preview failed.');
        set({ errorMessage: msg });
      }
    },

    setDefaultVoice: (voiceId: string) => {
      try {
        window.localStorage.setItem(DEFAULT_VOICE_KEY, voiceId);
      } catch {}
    },

    getDefaultVoice: () => {
      try {
        return window.localStorage.getItem(DEFAULT_VOICE_KEY) || 'Kore';
      } catch {
        return 'Kore';
      }
    },

    unloadVoiceModels: () => {
      try {
        stt.stop();
        (stt as any).loaded = false;
        (stt as any).mic = null;
      } catch {}
      try {
        tts.stop();
        (tts as any).loaded = false;
        (tts as any).engine = null;
      } catch {}
      set({
        sttModelStatus: { state: 'idle', progress: 0, message: 'Moonshine Tiny is not loaded yet.' },
        ttsModelStatus: { state: 'idle', progress: 0, message: 'Local voice model is not loaded yet.' },
        notice: 'Voice models unloaded from memory.',
      });
    },

    testMicrophone: async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tracks = stream.getAudioTracks();
        tracks.forEach((t) => t.stop());
        return { ok: true, message: 'Microphone working.' };
      } catch (err: any) {
        const msg = err?.name === 'NotAllowedError'
          ? 'Microphone permission denied.'
          : String(err?.message || err || 'Microphone is unavailable.');
        return { ok: false, message: msg };
      }
    },
  };
});
