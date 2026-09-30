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
  engineName: () => string;
}

const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const TTS_VOICE = 'Aoede';
const TTS_STYLE = 'Say in a warm, friendly, conversational tone, like a helpful colleague talking, not reading:';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Neural speech via Gemini TTS (24 kHz PCM). Falls back to the OS speechSynthesis
 * voice — clearly labelled — when no Gemini key is present.
 */
class GeminiTTSProvider implements TTSProvider {
  private synth: SpeechSynthesis | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private speaking = false;
  private audioCtx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private usingNeural = false;

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
    if (!voices || voices.length) {
      this.preferredVoice =
        voices.find((v) => v.lang.startsWith('en') && v.localService) || voices[0] || null;
    }
  }

  public engineName(): string {
    return this.usingNeural ? 'Gemini neural voice' : 'System voice';
  }

  public async speak(
    text: string,
    options: { onStart?: () => void; onEnd?: () => void; onError?: (err: any) => void } = {}
  ): Promise<void> {
    const clean = text.trim();
    if (!clean) {
      options.onEnd?.();
      return;
    }
    if (bobAi.hasGeminiKey()) {
      const ok = await this.speakNeural(clean, options);
      if (ok) return;
    }
    this.usingNeural = false;
    return this.speakSystem(clean, options);
  }

  private async speakNeural(
    text: string,
    options: { onStart?: () => void; onEnd?: () => void; onError?: (err: any) => void }
  ): Promise<boolean> {
    try {
      const key = bobAi.getGeminiKey();
      if (!key) return false;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${TTS_STYLE} ${text}` }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { name: TTS_VOICE } } }
            }
          })
        }
      );
      if (!res.ok) return false;
      const json = await res.json();
      const part = json?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data);
      const inline = part?.inlineData || part?.inline_data;
      if (!inline?.data) return false;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx || this.audioCtx.state === 'closed') this.audioCtx = new AudioCtx();
      const pcm = base64ToArrayBuffer(inline.data);
      const samples = new Int16Array(pcm);
      const audioBuffer = this.audioCtx.createBuffer(1, samples.length, 24000);
      const channel = audioBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 32768;

      this.stop();
      this.source = this.audioCtx.createBufferSource();
      this.source.buffer = audioBuffer;
      this.source.connect(this.audioCtx.destination);
      this.usingNeural = true;
      this.speaking = true;
      options.onStart?.();
      await new Promise<void>((resolve) => {
        if (!this.source) return resolve();
        this.source.onended = () => {
          this.speaking = false;
          options.onEnd?.();
          resolve();
        };
        try {
          this.source.start();
        } catch {
          this.speaking = false;
          options.onEnd?.();
          resolve();
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  private speakSystem(
    text: string,
    options: { onStart?: () => void; onEnd?: () => void; onError?: (err: any) => void }
  ): Promise<void> {
    const synth = this.synth;
    if (!synth) {
      options.onEnd?.();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.stop();
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.preferredVoice) utterance.voice = this.preferredVoice;
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
      synth.speak(utterance);
    });
  }

  public stop(): void {
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
      } catch {}
      this.source = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
    this.speaking = false;
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }
}

export const tts = new GeminiTTSProvider();
