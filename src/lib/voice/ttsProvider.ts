import { VoiceProfile } from './types';
import { DEFAULT_VOICE_KEY } from './voiceConfig';
import { bobAi } from '../aiEngine';

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

/** Natural-voice models, tried in order. Bounded — no retry loops. */
const TTS_MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'];
const TTS_TIMEOUT_MS = 12000;
const DEFAULT_TTS_SAMPLE_RATE = 24000;

/**
 * Eight genuinely distinct characters. Each one maps to a different Gemini
 * prebuilt studio voice, and to its own pitch/rate pair so the on-device
 * fallback still sounds like a different person rather than one robotic voice.
 */
export const CHATGPT_VOICES: VoiceProfile[] = [
  {
    id: 'Alex',
    name: 'Alex',
    gender: 'male',
    personality: 'Warm male · Natural · Conversational',
    language: 'English (US)',
    geminiVoice: 'Puck',
    pitch: 1.0,
    rate: 1.08,
    previewText: "Hey there! I'm Alex. I'm ready to help you analyze research, brainstorm ideas, and organize your work."
  },
  {
    id: 'James',
    name: 'James',
    gender: 'male',
    personality: 'Calm male · Clear · Professional',
    language: 'English (US)',
    geminiVoice: 'Charon',
    pitch: 0.86,
    rate: 0.98,
    previewText: "Hello, I'm James. I focus on structured analysis, deep research queries, and synthesis."
  },
  {
    id: 'Maya',
    name: 'Maya',
    gender: 'female',
    personality: 'Warm female · Natural · Conversational',
    language: 'English (US)',
    geminiVoice: 'Kore',
    pitch: 1.06,
    rate: 1.04,
    previewText: "Hi! I'm Maya. Let's explore your ideas together and find the key insights in your research."
  },
  {
    id: 'Emma',
    name: 'Emma',
    gender: 'female',
    personality: 'Bright female · Friendly · Clear',
    language: 'English (US)',
    geminiVoice: 'Zephyr',
    pitch: 1.18,
    rate: 1.12,
    previewText: "Hi! I'm Emma. I'm excited to help you move quickly through your documents and tasks."
  },
  {
    id: 'Noah',
    name: 'Noah',
    gender: 'male',
    personality: 'Upbeat male · Energetic · Quick',
    language: 'English (US)',
    geminiVoice: 'Fenrir',
    pitch: 1.1,
    rate: 1.18,
    previewText: "Noah here! Fast answers, sharp summaries, and zero wasted words. Let's get moving."
  },
  {
    id: 'Aria',
    name: 'Aria',
    gender: 'female',
    personality: 'Smooth female · Expressive · Storyteller',
    language: 'English (US)',
    geminiVoice: 'Aoede',
    pitch: 1.0,
    rate: 0.96,
    previewText: "I'm Aria. I like to walk you through findings as a story, so the insight lands clearly."
  },
  {
    id: 'Leo',
    name: 'Leo',
    gender: 'male',
    personality: 'Deep male · Narrator · Documentary',
    language: 'English (US)',
    geminiVoice: 'Orus',
    pitch: 0.78,
    rate: 0.94,
    previewText: "This is Leo. Measured, precise narration for long research briefings and deep dives."
  },
  {
    id: 'Nova',
    name: 'Nova',
    gender: 'female',
    personality: 'Soft female · Curious · Gentle',
    language: 'English (US)',
    geminiVoice: 'Leda',
    pitch: 1.24,
    rate: 1.0,
    previewText: "Hi, I'm Nova. A gentle voice for late-night reading and long study sessions."
  }
];

function parseSampleRate(mimeType: string | undefined): number {
  const match = /rate=(\d+)/i.exec(mimeType || '');
  return match ? Number(match[1]) : DEFAULT_TTS_SAMPLE_RATE;
}

/**
 * Gemini TTS returns headerless 16-bit PCM (audio/L16;rate=24000). An <audio>
 * element cannot decode raw PCM, so wrap it in a WAV container before playback.
 */
function pcmToWavBlob(pcm: Uint8Array<ArrayBuffer>, sampleRate: number): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeText(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  return new Blob([header, pcm], { type: 'audio/wav' });
}

export class LocalNeuralTTSProvider implements TTSProvider {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speaking = false;
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private abortController: AbortController | null = null;
  private activeVoiceId = 'Alex';
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private lastEngine: 'gemini-tts' | 'browser-synthesis' | 'none' = 'none';
  /** Bumped by stop(); in-flight synthesis from an older epoch is discarded. */
  private epoch = 0;

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

  /** Which engine produced the most recent audio, for honest UI reporting. */
  public getEngine(): 'gemini-tts' | 'browser-synthesis' | 'none' {
    return this.lastEngine;
  }

  public setActiveVoiceId(voiceId: string): void {
    if (CHATGPT_VOICES.some((v) => v.id === voiceId)) {
      this.activeVoiceId = voiceId;
      if (typeof window !== 'undefined') {
        localStorage.setItem(DEFAULT_VOICE_KEY, voiceId);
      }
    }
  }

  private resolveSystemVoice(profile: VoiceProfile): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    if (this.cachedVoices.length === 0) {
      this.loadVoices();
    }
    const voices = this.cachedVoices;
    if (voices.length === 0) return null;

    const english = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('en'));
    const pool = english.length > 0 ? english : voices;

    // Spread the characters across whatever distinct local voices actually exist
    // on this machine, instead of chasing Edge-only "Online (Natural)" names that
    // Electron never exposes (which collapsed everyone onto one robotic voice).
    const isFemale = profile.gender === 'female';
    const femaleHints = ['zira', 'aria', 'jenny', 'samantha', 'victoria', 'female', 'michelle', 'eva'];
    const maleHints = ['david', 'guy', 'christopher', 'daniel', 'male', 'george', 'ryan'];
    const hints = isFemale ? femaleHints : maleHints;
    const opposite = isFemale ? maleHints : femaleHints;

    const hinted = pool.filter((v) => {
      const lower = v.name.toLowerCase();
      return hints.some((h) => lower.includes(h)) && !opposite.some((h) => lower.includes(h));
    });

    const candidates = hinted.length > 0 ? hinted : pool;
    const ordinal = CHATGPT_VOICES.findIndex((v) => v.id === profile.id);
    return candidates[Math.max(0, ordinal) % candidates.length] || candidates[0] || null;
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
    const myEpoch = this.epoch;
    const profile =
      CHATGPT_VOICES.find((v) => v.id === (options.voiceId || this.activeVoiceId)) || CHATGPT_VOICES[0];

    // Tier 1: Gemini natural studio voices, using the user's own connected key.
    const apiKey = bobAi.getGeminiKey();
    if (apiKey) {
      const url = await this.synthesizeWithGemini(cleanText, profile, apiKey);
      if (myEpoch !== this.epoch) {
        options.onEnd?.();
        return;
      }
      if (url) {
        return this.playAudioUrl(url, options, myEpoch);
      }
    }

    // Tier 2: fully on-device browser synthesis, tuned per character.
    return this.speakWithBrowserSynthesis(cleanText, profile, options, myEpoch);
  }

  public async previewVoice(voiceId: string): Promise<void> {
    const profile = CHATGPT_VOICES.find((v) => v.id === voiceId);
    if (!profile) return;
    await this.speak(profile.previewText, { voiceId });
  }

  private async synthesizeWithGemini(
    text: string,
    profile: VoiceProfile,
    apiKey: string
  ): Promise<string | null> {
    const controller = new AbortController();
    this.abortController = controller;
    const timeout = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

    try {
      for (const model of TTS_MODELS) {
        if (controller.signal.aborted) break;
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
              signal: controller.signal,
              body: JSON.stringify({
                contents: [{ parts: [{ text }] }],
                generationConfig: {
                  responseModalities: ['AUDIO'],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: profile.geminiVoice || 'Puck' }
                    }
                  }
                }
              })
            }
          );

          const data = await res.json().catch(() => null);
          if (!res.ok) continue;

          const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          const base64Audio = inlineData?.data;
          if (!base64Audio) continue;

          const mime = String(inlineData?.mimeType || '');
          const binary = atob(base64Audio);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

          const isRawPcm = /l16|pcm/i.test(mime) || !/wav|mp3|ogg|aac|flac|webm/i.test(mime);
          const blob = isRawPcm
            ? pcmToWavBlob(bytes, parseSampleRate(mime))
            : new Blob([bytes], { type: mime });

          this.lastEngine = 'gemini-tts';
          return URL.createObjectURL(blob);
        } catch (err: any) {
          if (err?.name === 'AbortError') break;
        }
      }
    } finally {
      clearTimeout(timeout);
      if (this.abortController === controller) this.abortController = null;
    }

    return null;
  }

  private speakWithBrowserSynthesis(
    cleanText: string,
    profile: VoiceProfile,
    options: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    },
    myEpoch: number
  ): Promise<void> {
    if (!this.synth) {
      options.onError?.(new Error('No speech engine available on this device'));
      options.onEnd?.();
      return Promise.resolve();
    }
    const synth = this.synth;

    return new Promise((resolve) => {
      const matchedVoice = this.resolveSystemVoice(profile);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.rate = profile.rate ?? 1.08;
      utterance.pitch = profile.pitch ?? 1.0;
      utterance.volume = 1.0;

      const finish = () => {
        this.speaking = false;
        this.currentUtterance = null;
        options.onEnd?.();
        resolve();
      };

      utterance.onstart = () => {
        this.lastEngine = 'browser-synthesis';
        this.speaking = true;
        options.onStart?.();
      };
      utterance.onend = finish;
      utterance.onerror = (e) => {
        options.onError?.(e);
        finish();
      };

      this.currentUtterance = utterance;
      if (myEpoch !== this.epoch) return finish();
      synth.speak(utterance);
    });
  }

  private playAudioUrl(
    url: string,
    options: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    },
    myEpoch: number
  ): Promise<void> {
    return new Promise((resolve) => {
      if (myEpoch !== this.epoch) {
        this.revokeObjectUrl(url);
        options.onEnd?.();
        return resolve();
      }

      try {
        const audio = new Audio(url);
        this.currentAudioElement = audio;
        this.currentObjectUrl = url;

        audio.onplay = () => {
          this.speaking = true;
          options.onStart?.();
        };

        audio.onended = () => {
          this.speaking = false;
          this.currentAudioElement = null;
          this.revokeObjectUrl(url);
          options.onEnd?.();
          resolve();
        };

        audio.onerror = (e) => {
          this.speaking = false;
          this.currentAudioElement = null;
          this.revokeObjectUrl(url);
          options.onError?.(e);
          resolve();
        };

        audio.play().catch((err) => {
          this.speaking = false;
          this.currentAudioElement = null;
          this.revokeObjectUrl(url);
          options.onError?.(err);
          resolve();
        });
      } catch (err) {
        options.onError?.(err);
        resolve();
      }
    });
  }

  private revokeObjectUrl(url: string): void {
    if (this.currentObjectUrl === url) this.currentObjectUrl = null;
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }

  public stop(): void {
    this.epoch += 1;
    this.speaking = false;

    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {}
      this.abortController = null;
    }

    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {}
      this.currentAudioElement = null;
    }

    if (this.currentObjectUrl) {
      this.revokeObjectUrl(this.currentObjectUrl);
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
