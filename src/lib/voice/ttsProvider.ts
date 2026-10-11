import { VoiceProfile } from './types';
import { DEFAULT_VOICE_KEY } from './voiceConfig';

export interface TTSProvider {
  speak: (
    text: string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
      voiceId?: string;
    }
  ) => Promise<void>;
  stop: () => void;
  isSpeaking: () => boolean;
  getVoices: () => VoiceProfile[];
  getActiveVoiceId: () => string;
  setActiveVoiceId: (voiceId: string) => void;
  previewVoice: (voiceId: string) => Promise<void>;
}

export const CHATGPT_VOICES: VoiceProfile[] = [
  {
    id: 'Breeze',
    name: 'Breeze',
    gender: 'female',
    personality: 'Warm & Animated · Conversational · Friendly',
    language: 'English (US)',
    previewText: "Hi there! I'm Breeze. I love exploring new questions, summarizing articles, and making research feel effortless."
  },
  {
    id: 'Cove',
    name: 'Cove',
    gender: 'male',
    personality: 'Deep Baritone · Composed · Grounded',
    language: 'English (US)',
    previewText: "Hello. I'm Cove. I take a steady, methodical approach to analyzing complex topics and documents."
  },
  {
    id: 'Ember',
    name: 'Ember',
    gender: 'male',
    personality: 'Confident · Dynamic · Thoughtful',
    language: 'English (US)',
    previewText: "Hey! I'm Ember. Let's dig into your research data, discover patterns, and build strong insights."
  },
  {
    id: 'Juniper',
    name: 'Juniper',
    gender: 'female',
    personality: 'Bright · Expressive · Energetic',
    language: 'English (US)',
    previewText: "Hi! I'm Juniper. I bring energy and clarity to your ideas so we can brainstorm and iterate quickly."
  },
  {
    id: 'Sky',
    name: 'Sky',
    gender: 'female',
    personality: 'Calm · Soothing · Mindful',
    language: 'English (US)',
    previewText: "Hello. I'm Sky. Take your time, and together we can organize your thoughts and craft thoughtful summaries."
  },
  {
    id: 'Sol',
    name: 'Sol',
    gender: 'male',
    personality: 'Charismatic · Articulate · Punchy',
    language: 'English (US)',
    previewText: "Greetings! I'm Sol. I focus on actionable takeaways, sharp logic, and clear executive summaries."
  },
  {
    id: 'Alex',
    name: 'Alex',
    gender: 'male',
    personality: 'Natural · Balanced · Everyday companion',
    language: 'English (US)',
    previewText: "Hey! I'm Alex. I'm ready to help you analyze research, brainstorm ideas, and organize your work."
  },
  {
    id: 'Maya',
    name: 'Maya',
    gender: 'female',
    personality: 'Empathetic · Polished · Articulate',
    language: 'English (US)',
    previewText: "Hi! I'm Maya. Let's look over your findings and find the most important details."
  }
];

export const VOICE_PROFILES_ACOUSTICS: Record<string, { pitch: number; rate: number; gender: 'male' | 'female' }> = {
  Breeze: { pitch: 1.15, rate: 1.10, gender: 'female' },
  Cove: { pitch: 0.82, rate: 0.94, gender: 'male' },
  Ember: { pitch: 0.98, rate: 1.06, gender: 'male' },
  Juniper: { pitch: 1.28, rate: 1.12, gender: 'female' },
  Sky: { pitch: 1.06, rate: 0.98, gender: 'female' },
  Sol: { pitch: 0.92, rate: 1.08, gender: 'male' },
  Alex: { pitch: 1.02, rate: 1.05, gender: 'male' },
  Maya: { pitch: 1.20, rate: 1.04, gender: 'female' },
  James: { pitch: 0.84, rate: 0.95, gender: 'male' },
  Emma: { pitch: 1.30, rate: 1.12, gender: 'female' }
};

/**
 * v1.0.60: Kokoro is disabled. speak() uses browser SpeechSynthesis only.
 * Re-enable Kokoro by restoring the previous initKokoro / synthesizeWithKokoro paths.
 */
export class LocalNeuralTTSProvider implements TTSProvider {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speaking = false;
  private activeVoiceId = 'Alex';
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(DEFAULT_VOICE_KEY);
      if (saved && CHATGPT_VOICES.some((v) => v.id === saved)) {
        this.activeVoiceId = saved;
      }

      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }
      }
    }
  }

  private loadVoices(): void {
    if (!this.synth) return;
    this.cachedVoices = this.synth.getVoices() || [];
  }

  public getVoices(): VoiceProfile[] {
    return CHATGPT_VOICES;
  }

  public getActiveVoiceId(): string {
    return this.activeVoiceId;
  }

  public setActiveVoiceId(voiceId: string): void {
    if (CHATGPT_VOICES.some((v) => v.id === voiceId)) {
      this.activeVoiceId = voiceId;
      if (typeof window !== 'undefined') {
        localStorage.setItem(DEFAULT_VOICE_KEY, voiceId);
      }
    }
  }

  public getSystemVoices(): { name: string; lang: string }[] {
    if (this.cachedVoices.length === 0) this.loadVoices();
    return this.cachedVoices.map((v) => ({ name: v.name, lang: v.lang }));
  }

  private resolveSystemVoice(voiceId: string): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    if (this.cachedVoices.length === 0) this.loadVoices();
    const voices = this.cachedVoices;
    if (voices.length === 0) return null;

    const exact = voices.find((v) => v.name === voiceId);
    if (exact) return exact;

    const profile = VOICE_PROFILES_ACOUSTICS[voiceId] || VOICE_PROFILES_ACOUSTICS.Alex;
    const isFemale = profile.gender === 'female';

    const femaleVoices = voices.filter((v) => {
      const lower = v.name.toLowerCase();
      return lower.includes('female') || lower.includes('zira') || lower.includes('jenny') || lower.includes('aria') || lower.includes('samantha');
    });
    const maleVoices = voices.filter((v) => {
      const lower = v.name.toLowerCase();
      return lower.includes('male') || lower.includes('david') || lower.includes('guy') || lower.includes('daniel');
    });

    if (isFemale && femaleVoices.length > 0) {
      const idx = Math.abs(voiceId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % femaleVoices.length;
      return femaleVoices[idx];
    }
    if (!isFemale && maleVoices.length > 0) {
      const idx = Math.abs(voiceId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % maleVoices.length;
      return maleVoices[idx];
    }
    if (voices.length > 1) {
      const idx = Math.abs(voiceId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % voices.length;
      return voices[idx];
    }
    return voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
  }

  private cleanTextForSpeech(text: string): string {
    return text
      .replace(/\[\^?\d+\]/g, '')
      .replace(/```[\s\S]*?```/g, 'Here is the code block.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\|.*\|/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/[#*_~]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public async speak(
    text: string,
    options: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
      voiceId?: string;
    } = {}
  ): Promise<void> {
    const cleanText = this.cleanTextForSpeech(text);
    if (!cleanText) {
      options.onEnd?.();
      return;
    }

    this.stop();

    if (!this.synth) {
      options.onEnd?.();
      return;
    }

    const targetVoiceId = options.voiceId || this.activeVoiceId;

    return new Promise((resolve) => {
      const matchedVoice = this.resolveSystemVoice(targetVoiceId);
      const acoustics = VOICE_PROFILES_ACOUSTICS[targetVoiceId] || VOICE_PROFILES_ACOUSTICS.Alex;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (matchedVoice) utterance.voice = matchedVoice;
      utterance.pitch = acoustics.pitch;
      utterance.rate = acoustics.rate;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        this.speaking = true;
        options.onStart?.();
      };
      utterance.onend = () => {
        this.speaking = false;
        this.currentUtterance = null;
        options.onEnd?.();
        resolve();
      };
      utterance.onerror = (e) => {
        this.speaking = false;
        this.currentUtterance = null;
        options.onError?.(e);
        resolve();
      };

      this.currentUtterance = utterance;
      this.synth!.speak(utterance);
    });
  }

  public async previewVoice(voiceId: string): Promise<void> {
    const profile = CHATGPT_VOICES.find((v) => v.id === voiceId);
    if (!profile) return;
    await this.speak(profile.previewText, { voiceId });
  }

  // --- Kokoro disabled in v1.0.60 ---
  public subscribeKokoro(_listener: (progress: any) => void) {
    return () => {};
  }
  public getKokoroStatus() {
    return { status: 'idle' as const, progress: 0, file: 'Kokoro disabled (Gemini-only release)' };
  }
  public async initKokoro(): Promise<boolean> {
    return false;
  }
  public clearKokoro(): void {}
  public isKokoroInstalled(): boolean {
    return false;
  }

  public stop(): void {
    this.speaking = false;
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
      this.currentUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    return this.speaking || (this.synth?.speaking ?? false);
  }
}

export const tts = new LocalNeuralTTSProvider();
