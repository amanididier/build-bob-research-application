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

    // Prioritize natural neural voices with ChatGPT-like warm conversational cadence
    const priorityNames = [
      'Microsoft Christopher Online (Natural)',
      'Microsoft Jenny Online (Natural)',
      'Microsoft Guy Online (Natural)',
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
    } = {}
  ): Promise<void> {
    const cleanText = this.cleanTextForSpeech(text);
    if (!cleanText) {
      options.onEnd?.();
      return;
    }

    this.stop(); // Stop any active playback

    // 1. Try local Kokoro-82M service if running locally (localhost:5000)
    try {
      const kokoroUrl = await this.synthesizeWithKokoro(cleanText);
      if (kokoroUrl) {
        return this.playAudioUrl(kokoroUrl, options);
      }
    } catch {}

    // 2. Try Gemini Cloud Ultra-Human Voice if API key is provided
    const geminiKey = bobAi.getGeminiKey();
    if (geminiKey && cleanText.length < 800) {
      try {
        const audioUrl = await this.synthesizeWithGemini(cleanText, geminiKey);
        if (audioUrl) {
          return this.playAudioUrl(audioUrl, options);
        }
      } catch (e) {
        console.warn('[TTS] Gemini TTS fallback to Neural Edge speech:', e);
      }
    }

    // 3. Fallback to Natural Neural Speech Synthesis (0 latency, 0 downloads, free)
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

      // ChatGPT conversational tuning: 1.08x pace, warm prosody
      utterance.rate = 1.08;
      utterance.pitch = 1.01;
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

  /**
   * Pluggable Kokoro-82M local endpoint check.
   * If user or environment has a local Kokoro microservice running on port 5000,
   * synthesizes with deep humanistic 82M Kokoro model.
   */
  private async synthesizeWithKokoro(text: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 600); // 600ms fast check
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
    } catch {
      // Kokoro sidecar not active; seamlessly proceed to next tier
    }
    return null;
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
                prebuiltVoiceConfig: { voiceName: 'Puck' },
              },
            },
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const base64Audio = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          const mimeType = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav';
          return `data:${mimeType};base64,${base64Audio}`;
        }
      }
    } catch (e) {
      console.warn('[TTS] Gemini synthesis warning:', e);
    }
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

export const tts = new UltraHumanEdgeTTSProvider();
