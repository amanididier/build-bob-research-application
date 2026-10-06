import { DEFAULT_VOICE_CONFIG } from './voiceConfig';
import { TTSEngine } from './types';
import { bobAi } from '../aiEngine';
import { voiceDiagnostics } from './diagnostics';

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: { message: string }) => void;
  onEngine?: (engine: TTSEngine) => void;
}

export interface TTSProvider {
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  stop: () => void;
  isSpeaking: () => boolean;
}

/** Natural-voice models, tried in order. Bounded — no retry loops. */
const TTS_MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-2.5-flash-preview-tts'];

const DEFAULT_TTS_SAMPLE_RATE = 24000;

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

function splitForProvider(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const pieces: string[] = [];
  let current = '';
  const sentences = text.match(/[^.!?;:\n]+[.!?;:]*\s*/g) || [text];
  for (const sentence of sentences) {
    if ((current + sentence).length > max && current.trim()) {
      pieces.push(current.trim());
      current = '';
    }
    current += sentence;
    while (current.length > max) {
      pieces.push(current.slice(0, max));
      current = current.slice(max);
    }
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces;
}

export class UltraHumanEdgeTTSProvider implements TTSProvider {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private speaking = false;
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private abortController: AbortController | null = null;
  private pendingResolve: (() => void) | null = null;
  private lastEngine: TTSEngine | 'none' = 'none';
  /** Bumped by stop(); any in-flight synthesis from an older epoch is discarded. */
  private epoch = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  public getEngine(): TTSEngine | 'none' {
    return this.lastEngine;
  }

  /** Which engine will be used for the next speak() call. */
  public getPlannedEngine(): TTSEngine {
    return bobAi.hasGeminiKey() ? 'gemini-tts' : 'browser-synthesis';
  }

  private initVoices(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

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
      .replace(/\[\^?\d+\]/g, '')
      .replace(/```[\s\S]*?```/g, 'Here is the relevant code block.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\|.*\|/g, '')
      .replace(/https?:\/\/\S+/g, 'source link')
      .replace(/[#*_~]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    const cleanText = this.cleanTextForSpeech(text);
    if (!cleanText) {
      options.onEnd?.();
      return;
    }

    this.stop();
    const myEpoch = this.epoch;

    const pieces = splitForProvider(cleanText, DEFAULT_VOICE_CONFIG.ttsMaxCharsPerRequest);
    const geminiKey = bobAi.getGeminiKey();

    // 1. Gemini natural voice (user's own BYOK key) — the production path.
    if (geminiKey) {
      let geminiFailed = '';
      for (const piece of pieces) {
        if (myEpoch !== this.epoch) return; // stopped while we were working
        try {
          const url = await this.synthesizeWithGemini(piece, geminiKey);
          if (url) {
            if (myEpoch !== this.epoch) {
              URL.revokeObjectURL(url);
              return;
            }
            if (this.lastEngine !== 'gemini-tts') {
              this.lastEngine = 'gemini-tts';
              voiceDiagnostics.set({ tts: `Gemini TTS (${DEFAULT_VOICE_CONFIG.defaultVoice})` });
              options.onEngine?.('gemini-tts');
            }
            await this.playAudioUrl(url, options, myEpoch);
            if (myEpoch !== this.epoch) return;
            continue;
          }
          geminiFailed = 'Gemini TTS returned no audio.';
        } catch (e: any) {
          geminiFailed = String(e?.message || e).slice(0, 160);
        }
        if (myEpoch !== this.epoch) return;
        if (geminiFailed) break;
      }

      if (myEpoch === this.epoch && !geminiFailed) return;

      // Preferred voice unavailable — tell the user instead of silently degrading.
      if (myEpoch === this.epoch) {
        voiceDiagnostics.event(`Natural voice unavailable (${geminiFailed}) — using backup voice`);
        options.onError?.({
          message: `Bob couldn't use the natural voice right now. Voice provider unavailable. Try again.`,
        });
      }
    } else {
      voiceDiagnostics.event('No Gemini key — backup browser voice active');
      options.onError?.({ message: 'Add your Gemini key in Settings to hear Bob in the natural voice.' });
    }

    if (myEpoch !== this.epoch) return;

    // 2. Emergency backup: local browser synthesis.
    if (!this.synth) {
      options.onEnd?.();
      return;
    }

    this.lastEngine = 'browser-synthesis';
    voiceDiagnostics.set({ tts: 'Backup browser voice' });
    options.onEngine?.('browser-synthesis');

    for (const piece of pieces) {
      if (myEpoch !== this.epoch) return;
      await this.speakWithSynth(piece, options, myEpoch);
    }
  }

  /**
   * Pre-synthesize one chunk (Gemini path only) so playback has no gap between
   * sentences. The caller owns staleness: discard the URL if the generation changed.
   */
  public async prepare(text: string): Promise<string | null> {
    const cleanText = this.cleanTextForSpeech(text);
    const apiKey = bobAi.getGeminiKey();
    if (!cleanText || !apiKey) return null;

    const pieces = splitForProvider(cleanText, DEFAULT_VOICE_CONFIG.ttsMaxCharsPerRequest);
    if (pieces.length !== 1) return null;

    try {
      return await this.synthesizeWithGemini(pieces[0], apiKey, new AbortController());
    } catch {
      return null;
    }
  }

  /** Play audio that was pre-synthesized by prepare(). */
  public async speakPrepared(url: string, options: SpeakOptions = {}): Promise<void> {
    this.stop();
    const myEpoch = this.epoch;
    this.lastEngine = 'gemini-tts';
    voiceDiagnostics.set({ tts: `Gemini TTS (${DEFAULT_VOICE_CONFIG.defaultVoice})` });
    options.onEngine?.('gemini-tts');
    await this.playAudioUrl(url, options, myEpoch);
  }

  private speakWithSynth(text: string, options: SpeakOptions, myEpoch: number): Promise<void> {
    return new Promise((resolve) => {
      const finish = () => {
        if (this.pendingResolve === resolve) this.pendingResolve = null;
        resolve();
      };
      this.pendingResolve = finish;

      this.initVoices();
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.preferredVoice) utterance.voice = this.preferredVoice;
      utterance.rate = DEFAULT_VOICE_CONFIG.ttsRate;
      utterance.pitch = DEFAULT_VOICE_CONFIG.ttsPitch;
      utterance.volume = DEFAULT_VOICE_CONFIG.ttsVolume;

      utterance.onstart = () => {
        this.speaking = true;
        voiceDiagnostics.mark('firstAudio');
        voiceDiagnostics.set({ audio: 'playing' });
        options.onStart?.();
      };
      utterance.onend = () => {
        this.speaking = false;
        this.currentUtterance = null;
        options.onEnd?.();
        finish();
      };
      utterance.onerror = () => {
        this.speaking = false;
        this.currentUtterance = null;
        options.onEnd?.();
        finish();
      };

      this.currentUtterance = utterance;
      if (myEpoch !== this.epoch) return finish();
      this.synth!.speak(utterance);
    });
  }

  private async synthesizeWithGemini(
    text: string,
    apiKey: string,
    external?: AbortController
  ): Promise<string | null> {
    let lastFailure = '';
    for (const model of TTS_MODELS) {
      const controller = external || new AbortController();
      if (!external) this.abortController = controller;
      const started = performance.now();
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
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: DEFAULT_VOICE_CONFIG.defaultVoice } },
                },
              },
            }),
          }
        );

        const data = await res.json().catch(() => null);
        if (res.ok) {
          const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          const base64Audio = inlineData?.data;
          if (base64Audio) {
            const mime = String(inlineData?.mimeType || '');
            const binary = atob(base64Audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const isRawPcm = /l16|pcm/i.test(mime) || !/wav|mp3|ogg|aac|flac|webm/i.test(mime);
            const blob = isRawPcm
              ? pcmToWavBlob(bytes, parseSampleRate(mime))
              : new Blob([bytes], { type: mime });
            voiceDiagnostics.event(
              `TTS ${model} responded in ${Math.round(performance.now() - started)}ms (${blob.size} bytes, ${isRawPcm ? `pcm→wav @${parseSampleRate(mime)}` : mime})`
            );
            if (!external) this.abortController = null;
            return URL.createObjectURL(blob);
          }
          lastFailure = 'Gemini TTS returned no audio data.';
        } else {
          lastFailure = String(data?.error?.message || `HTTP ${res.status}`).slice(0, 160);
          console.warn(`[bob] TTS ${model} failed: HTTP ${res.status} ${lastFailure}`);
          if (res.status !== 404 && res.status !== 400) break;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || controller.signal.aborted) {
          if (!external) this.abortController = null;
          return null;
        }
        lastFailure = 'network unreachable';
        console.warn(`[bob] TTS ${model} network error:`, String(err?.message || err).slice(0, 160));
        break;
      }
    }
    if (!external) this.abortController = null;
    voiceDiagnostics.set({ tts: `failed (${lastFailure.slice(0, 60)})` });
    throw new Error(lastFailure || 'Gemini TTS failed');
  }

  private playAudioUrl(url: string, options: SpeakOptions, myEpoch: number): Promise<void> {
    return new Promise((resolve) => {
      if (myEpoch !== this.epoch) {
        URL.revokeObjectURL(url);
        return resolve();
      }

      const audio = new Audio(url);
      this.currentAudioElement = audio;
      this.currentObjectUrl = url;

      const finish = () => {
        if (this.pendingResolve === resolve) this.pendingResolve = null;
        resolve();
      };
      this.pendingResolve = finish;

      audio.onplay = () => {
        this.speaking = true;
        voiceDiagnostics.mark('firstAudio');
        voiceDiagnostics.set({ audio: 'playing (natural voice)' });
        options.onStart?.();
      };
      audio.onended = () => {
        this.speaking = false;
        this.releaseAudioElement();
        options.onEnd?.();
        finish();
      };
      audio.onerror = () => {
        this.speaking = false;
        this.releaseAudioElement();
        options.onError?.({ message: 'Bob generated the answer but could not play the audio.' });
        options.onEnd?.();
        finish();
      };

      audio.play().catch((err) => {
        this.speaking = false;
        this.releaseAudioElement();
        options.onError?.({ message: `Audio playback blocked: ${String(err?.message || err).slice(0, 80)}` });
        finish();
      });
    });
  }

  private releaseAudioElement(): void {
    if (this.currentObjectUrl) {
      try { URL.revokeObjectURL(this.currentObjectUrl); } catch {}
      this.currentObjectUrl = null;
    }
    this.currentAudioElement = null;
  }

  public stop(): void {
    // Invalidate every in-flight request first so nothing can start playing later.
    this.epoch += 1;

    if (this.abortController) {
      try { this.abortController.abort(); } catch {}
      this.abortController = null;
    }

    if (this.synth) {
      try { this.synth.cancel(); } catch {}
    }

    if (this.currentAudioElement) {
      const el = this.currentAudioElement;
      try {
        el.onplay = null;
        el.onended = null;
        el.onerror = null;
        el.pause();
        el.currentTime = 0;
      } catch {}
      this.currentAudioElement = null;
    }
    this.releaseAudioElement();

    this.speaking = false;
    this.currentUtterance = null;
    voiceDiagnostics.set({ audio: 'idle' });

    const resolvePending = this.pendingResolve;
    this.pendingResolve = null;
    resolvePending?.();
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }
}

export const tts = new UltraHumanEdgeTTSProvider();
