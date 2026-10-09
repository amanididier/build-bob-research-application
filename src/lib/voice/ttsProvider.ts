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

export const KOKORO_VOICES: Record<string, string> = {
  Breeze: 'af_bella',
  Cove: 'am_adam',
  Ember: 'am_michael',
  Juniper: 'af_heart',
  Sky: 'af_sarah',
  Sol: 'bm_george',
  Alex: 'am_michael',
  Maya: 'bf_emma',
  James: 'am_adam',
  Emma: 'bf_emma',
};

export class LocalNeuralTTSProvider implements TTSProvider {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speaking = false;
  private currentAudioElement: HTMLAudioElement | null = null;
  private activeVoiceId = 'Alex';
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private kokoro: any = null;
  private isKokoroLoading = false;
  private isKokoroReady = false;

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
    if (this.cachedVoices.length === 0) {
      this.loadVoices();
    }
    return this.cachedVoices.map((v) => ({ name: v.name, lang: v.lang }));
  }

  private resolveSystemVoice(voiceId: string): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    if (this.cachedVoices.length === 0) {
      this.loadVoices();
    }
    const voices = this.cachedVoices;
    if (voices.length === 0) return null;

    // Check if voiceId directly matches a system voice name
    const exactSystemMatch = voices.find((v) => v.name === voiceId);
    if (exactSystemMatch) return exactSystemMatch;

    const profile = VOICE_PROFILES_ACOUSTICS[voiceId] || VOICE_PROFILES_ACOUSTICS.Alex;
    const isFemale = profile.gender === 'female';

    // 1. Explicit keyword targeting per character
    const nameTargets: Record<string, string[]> = {
      Breeze: ['jenny', 'aria', 'samantha', 'victoria', 'karen', 'female'],
      Cove: ['ryan', 'george', 'richard', 'guy', 'david', 'male'],
      Ember: ['christopher', 'guy', 'daniel', 'mark', 'male'],
      Juniper: ['zira', 'aria', 'jenny', 'hazel', 'susan', 'female'],
      Sky: ['samantha', 'victoria', 'karen', 'eva', 'female'],
      Sol: ['david', 'alex', 'george', 'daniel', 'male'],
      Alex: ['christopher', 'guy', 'daniel', 'alex', 'david', 'male'],
      Maya: ['jenny', 'aria', 'samantha', 'zira', 'eva', 'female'],
      James: ['ryan', 'george', 'richard', 'daniel', 'mark', 'david'],
      Emma: ['aria', 'victoria', 'karen', 'hazel', 'susan', 'female']
    };

    const targetList = nameTargets[voiceId] || [];
    for (const kw of targetList) {
      const match = voices.find((v) => v.name.toLowerCase().includes(kw));
      if (match) return match;
    }

    // 2. Separate male and female voice pools if multiple voices exist
    const femaleVoices = voices.filter((v) => {
      const lower = v.name.toLowerCase();
      return lower.includes('female') || lower.includes('woman') || lower.includes('zira') || lower.includes('eva') || lower.includes('jenny') || lower.includes('aria') || lower.includes('samantha') || lower.includes('victoria');
    });

    const maleVoices = voices.filter((v) => {
      const lower = v.name.toLowerCase();
      return lower.includes('male') || lower.includes('man') || lower.includes('david') || lower.includes('guy') || lower.includes('christopher') || lower.includes('george') || lower.includes('mark');
    });

    if (isFemale && femaleVoices.length > 0) {
      // Pick distinct index per character
      const charIndex = Math.abs(voiceId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % femaleVoices.length;
      return femaleVoices[charIndex];
    }

    if (!isFemale && maleVoices.length > 0) {
      const charIndex = Math.abs(voiceId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % maleVoices.length;
      return maleVoices[charIndex];
    }

    // 3. Fallback: distribute across all installed voices to avoid everyone sounding identical
    if (voices.length > 1) {
      const charIndex = Math.abs(voiceId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % voices.length;
      return voices[charIndex];
    }

    return voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
  }

  private cleanTextForSpeech(text: string): string {
    return text
      .replace(/\[\^?\d+\]/g, '') // remove citations [1]
      .replace(/```[\s\S]*?```/g, 'Here is the code block.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\|.*\|/g, '') // tables
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

    this.stop(); // Stop any active playback immediately for seamless barge-in

    const targetVoiceId = options.voiceId || this.activeVoiceId;

    // 1. Try local Kokoro 82M ONNX model via kokoro-js
    try {
      const kokoroUrl = await this.synthesizeWithKokoro(cleanText, targetVoiceId);
      if (kokoroUrl) {
        return this.playAudioUrl(kokoroUrl, options);
      }
    } catch (err) {
      console.warn('[LocalTTS] Kokoro fallback notice:', err);
    }

    // 2. High-fidelity Local Neural Speech Synthesis with distinct acoustics fallback
    if (!this.synth) {
      options.onEnd?.();
      return;
    }

    return new Promise((resolve) => {
      const matchedVoice = this.resolveSystemVoice(targetVoiceId);
      const acoustics = VOICE_PROFILES_ACOUSTICS[targetVoiceId] || VOICE_PROFILES_ACOUSTICS.Alex;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      // ChatGPT conversational acoustic tuning
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
      if (this.synth) {
        this.synth.speak(utterance);
      } else {
        resolve();
      }
    });
  }

  public async previewVoice(voiceId: string): Promise<void> {
    const profile = CHATGPT_VOICES.find((v) => v.id === voiceId);
    if (!profile) return;
    await this.speak(profile.previewText, { voiceId });
  }

  private kokoroListeners: Array<(progress: { status: 'idle' | 'downloading' | 'ready' | 'error'; progress: number; file?: string; error?: string }) => void> = [];
  private kokoroProgress = { status: 'idle' as const, progress: 0, file: '' };

  public subscribeKokoro(listener: (progress: any) => void) {
    this.kokoroListeners.push(listener);
    listener(this.kokoroProgress);
    return () => {
      this.kokoroListeners = this.kokoroListeners.filter((l) => l !== listener);
    };
  }

  private notifyKokoro(data: any) {
    this.kokoroProgress = { ...this.kokoroProgress, ...data };
    for (const l of this.kokoroListeners) {
      try {
        l(this.kokoroProgress);
      } catch {}
    }
  }

  public getKokoroStatus() {
    return this.kokoroProgress;
  }

  public async initKokoro(): Promise<boolean> {
    if (this.isKokoroReady && this.kokoro) {
      this.notifyKokoro({ status: 'ready', progress: 100, file: 'Kokoro 82M Ready' });
      return true;
    }
    if (this.isKokoroLoading) return false;
    this.isKokoroLoading = true;
    this.notifyKokoro({ status: 'downloading', progress: 10, file: 'Connecting to Kokoro weights…' });

    try {
      const { KokoroTTS } = await import('kokoro-js');
      const device =
        typeof navigator !== 'undefined' && (navigator as any).gpu ? 'webgpu' : 'wasm';
      this.kokoro = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: 'q8',
        device,
        progress_callback: (info: any) => {
          if (info && typeof info.progress === 'number') {
            const p = Math.round(info.progress);
            this.notifyKokoro({
              status: 'downloading',
              progress: Math.max(10, p),
              file: info.file || 'Downloading Kokoro 82M weights…',
            });
          }
        },
      });
      this.isKokoroReady = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('bob_local_kokoro_ready', 'true');
      }
      this.notifyKokoro({ status: 'ready', progress: 100, file: 'Kokoro 82M Ready' });
      return true;
    } catch (err: any) {
      console.warn('[KokoroTTS] Init notice:', err);
      this.notifyKokoro({ status: 'error', progress: 0, error: err?.message || 'Download failed' });
      return false;
    } finally {
      this.isKokoroLoading = false;
    }
  }

  public clearKokoro(): void {
    this.kokoro = null;
    this.isKokoroReady = false;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bob_local_kokoro_ready');
    }
    this.notifyKokoro({ status: 'idle', progress: 0, file: '' });
  }

  public isKokoroInstalled(): boolean {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bob_local_kokoro_ready') === 'true' || this.isKokoroReady;
    }
    return this.isKokoroReady;
  }

  private async synthesizeWithKokoro(text: string, voiceId?: string): Promise<string | null> {
    const targetVoice = voiceId || this.activeVoiceId;

    if (!this.kokoro && this.isKokoroInstalled()) {
      await this.initKokoro();
    }

    if (this.kokoro) {
      try {
        const kokoroVoice = KOKORO_VOICES[targetVoice] || 'af_heart';
        const audio = await this.kokoro.generate(text, {
          voice: kokoroVoice,
        });
        if (audio && typeof audio.toBlob === 'function') {
          const blob = audio.toBlob();
          return URL.createObjectURL(blob);
        }
      } catch (err) {
        console.warn('[KokoroTTS] Synthesis error:', err);
      }
    }

    // Secondary fallback: local sidecar service if running on port 5000
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 350);
      const res = await fetch('http://localhost:5000/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: KOKORO_VOICES[targetVoice] || 'af_heart' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
    } catch {}

    return null;
  }

  private playAudioUrl(
    url: string,
    options: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): Promise<void> {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(url);
        this.currentAudioElement = audio;

        audio.onplay = () => {
          this.speaking = true;
          options.onStart?.();
        };

        audio.onended = () => {
          this.speaking = false;
          this.currentAudioElement = null;
          options.onEnd?.();
          resolve();
        };

        audio.onerror = (e) => {
          this.speaking = false;
          this.currentAudioElement = null;
          options.onError?.(e);
          resolve();
        };

        audio.play().catch((err) => {
          this.speaking = false;
          this.currentAudioElement = null;
          options.onError?.(err);
          resolve();
        });
      } catch (err) {
        options.onError?.(err);
        resolve();
      }
    });
  }

  public stop(): void {
    this.speaking = false;

    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {}
      this.currentAudioElement = null;
    }

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
