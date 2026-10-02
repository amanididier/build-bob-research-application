import { DEFAULT_VOICE_CONFIG } from './voiceConfig';
import { bobAi } from '../aiEngine';

export interface TTSProvider {
  speak: (
    text: string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ) => Promise<void>;
  stop: () => void;
  isSpeaking: () => boolean;
}

export class UltraHumanEdgeTTSProvider implements TTSProvider {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private speaking = false;
  private currentAudioElement: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

    // Prioritize natural Edge online neural voices & modern natural voices
    const priorityNames = [
      'Microsoft Christopher Online (Natural)',
      'Microsoft Guy Online (Natural)',
      'Microsoft Jenny Online (Natural)',
      'Microsoft Aria Online (Natural)',
      'Google US English',
      'Samantha (Enhanced)',
      'Samantha',
      'Daniel (Enhanced)',
      'Daniel',
      'Alex',
    ];

    for (const name of priorityNames) {
      const found = voices.find((v) => v.name.toLowerCase().includes(name.toLowerCase()));
      if (found) {
        this.preferredVoice = found;
        break;
      }
    }

    if (!this.preferredVoice) {
      this.preferredVoice =
        voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Online'))) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
    }
  }

  private cleanTextForSpeech(text: string): string {
    return text
      .replace(/\[\^?\d+\]/g, '') // remove citations [1]
      .replace(/```[\s\S]*?```/g, 'Here is the relevant code block.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\|.*\|/g, '') // tables
      .replace(/https?:\/\/\S+/g, 'source link')
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
    } = {}
  ): Promise<void> {
    const cleanText = this.cleanTextForSpeech(text);
    if (!cleanText) {
      options.onEnd?.();
      return;
    }

    this.stop(); // Stop any active playback

    // 1. Try Gemini Cloud Ultra-Human Voice if available
    const geminiKey = bobAi.getGeminiKey();
    if (geminiKey && cleanText.length < 600) {
      try {
        const audioUrl = await this.synthesizeWithGemini(cleanText, geminiKey);
        if (audioUrl) {
          return this.playAudioUrl(audioUrl, options);
        }
      } catch (e) {
        console.warn('Gemini TTS fallback to Edge Speech:', e);
      }
    }

    // 2. Online Edge Neural Speech Synthesis
    if (!this.synth) {
      options.onEnd?.();
      return;
    }

    return new Promise((resolve) => {
      this.initVoices();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }

      // Conversational tuning: warm, humanized prosody
      utterance.rate = DEFAULT_VOICE_CONFIG.ttsRate;
      utterance.pitch = DEFAULT_VOICE_CONFIG.ttsPitch;
      utterance.volume = DEFAULT_VOICE_CONFIG.ttsVolume;

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

  private async synthesizeWithGemini(text: string, apiKey: string): Promise<string | null> {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const base64Audio = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          const binary = atob(base64Audio);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'audio/wav' });
          return URL.createObjectURL(blob);
        }
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
      const audio = new Audio(url);
      this.currentAudioElement = audio;

      audio.onplay = () => {
        this.speaking = true;
        options.onStart?.();
      };

      audio.onended = () => {
        this.speaking = false;
        this.currentAudioElement = null;
        URL.revokeObjectURL(url);
        options.onEnd?.();
        resolve();
      };

      audio.onerror = (e) => {
        this.speaking = false;
        this.currentAudioElement = null;
        URL.revokeObjectURL(url);
        options.onError?.(e);
        resolve();
      };

      audio.play().catch((err) => {
        this.speaking = false;
        this.currentAudioElement = null;
        options.onError?.(err);
        resolve();
      });
    });
  }

  public stop(): void {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }

    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {}
      this.currentAudioElement = null;
    }

    this.speaking = false;
    this.currentUtterance = null;
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }
}

export const tts = new UltraHumanEdgeTTSProvider();
