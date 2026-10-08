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
    id: 'Alex',
    name: 'Alex',
    gender: 'male',
    personality: 'Warm male · Natural · Conversational',
    language: 'English (US)',
    previewText: "Hey there! I'm Alex. I'm ready to help you analyze research, brainstorm ideas, and organize your work."
  },
  {
    id: 'James',
    name: 'James',
    gender: 'male',
    personality: 'Calm male · Clear · Professional',
    language: 'English (US)',
    previewText: "Hello, I'm James. I focus on structured analysis, deep research queries, and synthesis."
  },
  {
    id: 'Maya',
    name: 'Maya',
    gender: 'female',
    personality: 'Warm female · Natural · Conversational',
    language: 'English (US)',
    previewText: "Hi! I'm Maya. Let's explore your ideas together and find the key insights in your research."
  },
  {
    id: 'Emma',
    name: 'Emma',
    gender: 'female',
    personality: 'Bright female · Friendly · Clear',
    language: 'English (US)',
    previewText: "Hi! I'm Emma. I'm excited to help you move quickly through your documents and tasks."
  }
];

export class LocalNeuralTTSProvider implements TTSProvider {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speaking = false;
  private currentAudioElement: HTMLAudioElement | null = null;
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

  private resolveSystemVoice(voiceId: string): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    if (this.cachedVoices.length === 0) {
      this.loadVoices();
    }
    const voices = this.cachedVoices;
    if (voices.length === 0) return null;

    // Preference cascades tailored to create distinctive personalities:
    const voiceMaps: Record<string, string[]> = {
      Alex: [
        'Microsoft Christopher Online (Natural)',
        'Microsoft Guy Online (Natural)',
        'Alex',
        'Daniel (Enhanced)',
        'Daniel',
        'Google US English'
      ],
      James: [
        'Microsoft Guy Online (Natural)',
        'Microsoft Ryan Online (Natural)',
        'Daniel',
        'Google UK English Male',
        'Microsoft George'
      ],
      Maya: [
        'Microsoft Jenny Online (Natural)',
        'Microsoft Aria Online (Natural)',
        'Samantha (Enhanced)',
        'Google US English',
        'Microsoft Zira'
      ],
      Emma: [
        'Microsoft Aria Online (Natural)',
        'Microsoft Jenny Online (Natural)',
        'Samantha',
        'Victoria',
        'Google UK English Female'
      ]
    };

    const targetList = voiceMaps[voiceId] || voiceMaps.Alex;

    for (const name of targetList) {
      const match = voices.find((v) => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) return match;
    }

    // Gender fallback
    const isFemale = voiceId === 'Maya' || voiceId === 'Emma';
    const fallback = voices.find((v) => {
      const lower = v.name.toLowerCase();
      const matchGender = isFemale ? (lower.includes('female') || lower.includes('jenny') || lower.includes('aria') || lower.includes('zira')) : (lower.includes('male') || lower.includes('guy') || lower.includes('david'));
      return v.lang.startsWith('en') && matchGender;
    });

    return fallback || voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
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

    // 1. Try local Kokoro microservice if running on localhost:5000
    try {
      const kokoroUrl = await this.synthesizeWithKokoro(cleanText);
      if (kokoroUrl) {
        return this.playAudioUrl(kokoroUrl, options);
      }
    } catch {}

    // 2. High-fidelity Local Neural Speech Synthesis
    if (!this.synth) {
      options.onEnd?.();
      return;
    }

    return new Promise((resolve) => {
      const targetVoiceId = options.voiceId || this.activeVoiceId;
      const matchedVoice = this.resolveSystemVoice(targetVoiceId);

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      // ChatGPT conversational tuning: 1.08x pace, natural cadence
      utterance.rate = 1.08;
      utterance.pitch = targetVoiceId === 'James' ? 0.96 : targetVoiceId === 'Emma' ? 1.04 : 1.01;
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

  private async synthesizeWithKokoro(text: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 400); // 400ms fast check
      const res = await fetch('http://localhost:5000/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'af_bella' }),
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
