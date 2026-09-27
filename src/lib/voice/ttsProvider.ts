import { DEFAULT_VOICE_CONFIG } from './voiceConfig';

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

export class EdgeSpeechTTSProvider implements TTSProvider {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private speaking = false;

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

    // Prioritize natural sounding Edge & modern system voices
    const priorityNames = [
      'Microsoft Jenny Online (Natural)',
      'Microsoft Guy Online (Natural)',
      'Microsoft Aria Online (Natural)',
      'Google US English',
      'Samantha',
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
        voices.find((v) => v.lang.startsWith('en') && v.localService) || voices[0];
    }
  }

  public async speak(
    text: string,
    options: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ): Promise<void> {
    if (!this.synth || !text.trim()) {
      options.onEnd?.();
      return;
    }

    return new Promise((resolve) => {
      this.stop(); // Stop any overlapping utterance

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }
      utterance.rate = DEFAULT_VOICE_CONFIG.ttsRate;
      utterance.pitch = DEFAULT_VOICE_CONFIG.ttsPitch;
      utterance.volume = DEFAULT_VOICE_CONFIG.ttsVolume;

      utterance.onstart = () => {
        this.speaking = true;
        options.onStart?.();
      };

      utterance.onend = () => {
        this.speaking = false;
        options.onEnd?.();
        resolve();
      };

      utterance.onerror = (e) => {
        this.speaking = false;
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

  public stop(): void {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
    this.speaking = false;
    this.currentUtterance = null;
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }
}

export const tts = new EdgeSpeechTTSProvider();
