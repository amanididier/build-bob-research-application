/**
 * Gemini Live realtime voice transport (primary Call Mode provider).
 *
 * microphone → PCM16/16k → WebSocket → Gemini Live → PCM audio out → playback
 * Server-side VAD decides turn boundaries, so barge-in is native.
 * Everything here is cancellable: stop() closes the socket, the capture graph
 * and all scheduled audio immediately.
 */
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_VOICE_CONFIG } from './voiceConfig';
import { voiceDiagnostics } from './diagnostics';

export interface LiveProviderCallbacks {
  onConnected: (model: string) => void;
  onUserSpeechStart: () => void;
  onUserSpeechEnd: () => void;
  onUserTranscript: (text: string, isFinal: boolean) => void;
  onModelText: (text: string, isFinal: boolean) => void;
  onModelAudioStart: () => void;
  onModelAudioEnd: () => void;
  onInterrupted: () => void;
  onError: (message: string) => void;
  onClosed: () => void;
}

const TARGET_INPUT_RATE = 16000;
const DEFAULT_OUTPUT_RATE = 24000;

function int16ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(binary);
}

function base64ToInt16(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
}

export class GeminiLiveProvider {
  private session: any = null;
  private model = '';
  private connected = false;
  private stopped = false;
  private callbacks: LiveProviderCallbacks | null = null;

  private captureCtx: AudioContext | null = null;
  private captureSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private mutedGain: GainNode | null = null;

  private playbackCtx: AudioContext | null = null;
  private nextPlayTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private audioStarted = false;
  private turnComplete = false;

  public static isSupported(): boolean {
    return typeof WebSocket !== 'undefined' && typeof AudioContext !== 'undefined';
  }

  public isConnected(): boolean {
    return this.connected && !this.stopped;
  }

  public getModel(): string {
    return this.model;
  }

  public isPlayingAudio(): boolean {
    return this.activeSources.size > 0;
  }

  /** Try each configured Live model once. No infinite retries. */
  public async connect(
    stream: MediaStream,
    apiKey: string,
    systemInstruction: string,
    callbacks: LiveProviderCallbacks
  ): Promise<boolean> {
    if (!GeminiLiveProvider.isSupported()) return false;
    if (!DEFAULT_VOICE_CONFIG.liveEnabled) return false;

    this.stopped = false;
    this.callbacks = callbacks;
    this.startCapture(stream);

    const models = DEFAULT_VOICE_CONFIG.liveModels.length
      ? DEFAULT_VOICE_CONFIG.liveModels
      : ['gemini-live-2.5-flash-preview'];

    for (const model of models) {
      if (this.stopped) return false;
      const ok = await this.tryConnect(model, apiKey, systemInstruction);
      if (ok) return true;
    }
    return false;
  }

  private async tryConnect(model: string, apiKey: string, systemInstruction: string): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_VOICE_CONFIG.liveConnectTimeoutMs);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const session: any = await ai.live.connect({
        model,
        callbacks: {
          onmessage: (msg: any) => this.handleMessage(msg),
          onerror: (e: any) => {
            if (this.stopped) return;
            const detail = e?.message || e?.error?.message || 'live connection error';
            voiceDiagnostics.set({ connection: 'failed' });
            this.callbacks?.onError(String(detail).slice(0, 200));
          },
          onclose: () => {
            if (this.stopped) return;
            this.connected = false;
            voiceDiagnostics.set({ connection: 'closed' });
            this.callbacks?.onClosed();
          },
        },
        config: {
          abortSignal: controller.signal,
          responseModalities: ['AUDIO'] as any,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: DEFAULT_VOICE_CONFIG.liveVoice } },
          } as any,
          systemInstruction: { parts: [{ text: systemInstruction }] } as any,
          inputAudioTranscription: {} as any,
          outputAudioTranscription: {} as any,
          realtimeInputConfig: {
            automaticActivityDetection: {
              startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH' as any,
              endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH' as any,
              silenceDurationMs: DEFAULT_VOICE_CONFIG.callSilenceDurationMs,
            },
          } as any,
        } as any,
      });

      clearTimeout(timer);
      if (this.stopped) {
        try { session?.close?.(); } catch {}
        return false;
      }

      this.session = session;
      this.model = model;
      this.connected = true;
      voiceDiagnostics.set({ provider: 'Gemini Live', model, connection: 'connected' });
      this.callbacks?.onConnected(model);
      return true;
    } catch (err: any) {
      clearTimeout(timer);
      const msg = String(err?.message || err || '');
      voiceDiagnostics.event(`Live connect failed (${model}): ${msg.slice(0, 140)}`);
      try { this.session?.close?.(); } catch {}
      this.session = null;
      return false;
    }
  }

  private startCapture(stream: MediaStream): void {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.captureCtx = new Ctx();
      this.captureSource = this.captureCtx.createMediaStreamSource(stream);
      this.processor = this.captureCtx.createScriptProcessor(4096, 1, 1);
      // Route through a zero-gain node so the processor runs without echoing mic→speaker.
      this.mutedGain = this.captureCtx.createGain();
      this.mutedGain.gain.value = 0;

      const inputRate = this.captureCtx.sampleRate;
      this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.connected || this.stopped || !this.session) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm = this.toPcm16(input, inputRate, TARGET_INPUT_RATE);
        if (!pcm.length) return;
        try {
          this.session.sendRealtimeInput({
            media: { mimeType: `audio/pcm;rate=${TARGET_INPUT_RATE}`, data: int16ToBase64(pcm) },
          } as any);
        } catch {
          // Socket went away mid-frame; onclose/onerror handles the session teardown.
        }
      };

      this.captureSource.connect(this.processor);
      this.processor.connect(this.mutedGain);
      this.mutedGain.connect(this.captureCtx.destination);
      voiceDiagnostics.set({ microphone: 'streaming to Live' });
    } catch (err: any) {
      voiceDiagnostics.event(`Live capture setup failed: ${String(err?.message || err).slice(0, 140)}`);
    }
  }

  private toPcm16(input: Float32Array, fromRate: number, toRate: number): Uint8Array {
    const ratio = fromRate / toRate;
    const outLength = Math.floor(input.length / ratio);
    if (outLength <= 0) return new Uint8Array(0);
    const out = new Int16Array(outLength);
    for (let i = 0; i < outLength; i++) {
      const sample = input[Math.floor(i * ratio)] || 0;
      const clamped = Math.max(-1, Math.min(1, sample));
      out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }
    return new Uint8Array(out.buffer);
  }

  private handleMessage(msg: any): void {
    if (this.stopped || !msg) return;

    if (msg.setupComplete) {
      voiceDiagnostics.set({ connection: 'connected' });
      voiceDiagnostics.event('Live voice connected');
      return;
    }

    const vadType = String(
      msg.voiceActivityDetectionSignal?.vadSignalType || msg.voiceActivity?.voiceActivityType || ''
    ).toUpperCase();
    if (vadType.includes('START')) this.callbacks?.onUserSpeechStart();
    else if (vadType.includes('END')) this.callbacks?.onUserSpeechEnd();

    const content = msg.serverContent;
    if (!content) return;

    if (content.interrupted) {
      this.clearScheduledAudio();
      this.callbacks?.onInterrupted();
    }

    const inputText = content.inputTranscription?.text || content.interimInputTranscription?.text;
    if (inputText) {
      this.callbacks?.onUserTranscript(inputText, Boolean(content.inputTranscription?.text));
    }

    const outText = content.outputTranscription?.text;
    const parts = content.modelTurn?.parts || [];
    let turnText = '';

    for (const part of parts) {
      const inline = part?.inlineData?.data || part?.inline_data?.data;
      if (inline) {
        const mime = String(part?.inlineData?.mimeType || part?.inline_data?.mimeType || '');
        this.playPcm(inline, mime);
        continue;
      }
      if (part?.text) turnText += part.text;
    }

    if (turnText) this.callbacks?.onModelText(turnText, false);
    if (outText) this.callbacks?.onModelText(outText, Boolean(content.turnComplete));

    if (content.turnComplete) {
      this.turnComplete = true;
      if (!this.isPlayingAudio()) this.finishTurn();
    }
  }

  private playPcm(base64: string, mimeType: string): void {
    if (this.stopped) return;
    try {
      const rateMatch = /rate=(\d+)/i.exec(mimeType);
      const rate = rateMatch ? parseInt(rateMatch[1], 10) : DEFAULT_OUTPUT_RATE;
      const pcm = base64ToInt16(base64);
      if (!pcm.length) return;

      if (!this.playbackCtx) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        this.playbackCtx = new Ctx();
        this.nextPlayTime = 0;
      }
      const ctx = this.playbackCtx;
      if (ctx.state === 'suspended') void ctx.resume();

      const float = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) float[i] = pcm[i] / 0x8000;

      const buffer = ctx.createBuffer(1, float.length, rate);
      buffer.copyToChannel(float, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const startAt = Math.max(ctx.currentTime, this.nextPlayTime);
      source.start(startAt);
      this.nextPlayTime = startAt + buffer.duration;

      this.activeSources.add(source);
      source.onended = () => {
        this.activeSources.delete(source);
        if (this.turnComplete && !this.isPlayingAudio()) this.finishTurn();
      };

      if (!this.audioStarted) {
        this.audioStarted = true;
        voiceDiagnostics.mark('firstAudio');
        voiceDiagnostics.set({ audio: 'playing (live)' });
        this.callbacks?.onModelAudioStart();
      }
    } catch (err: any) {
      voiceDiagnostics.event(`Live audio decode failed: ${String(err?.message || err).slice(0, 120)}`);
    }
  }

  private finishTurn(): void {
    if (!this.audioStarted && !this.turnComplete) return;
    this.audioStarted = false;
    this.turnComplete = false;
    voiceDiagnostics.set({ audio: 'idle' });
    this.callbacks?.onModelAudioEnd();
  }

  /** Local barge-in: drop everything queued/playing now. */
  public clearScheduledAudio(): void {
    this.activeSources.forEach((s) => {
      try { s.onended = null; s.stop(); } catch {}
    });
    this.activeSources.clear();
    this.nextPlayTime = 0;
    this.audioStarted = false;
    this.turnComplete = false;
    voiceDiagnostics.set({ audio: 'idle' });
  }

  public stop(): void {
    this.stopped = true;
    this.connected = false;
    this.clearScheduledAudio();

    if (this.processor) {
      try { this.processor.disconnect(); } catch {}
      this.processor.onaudioprocess = null;
      this.processor = null;
    }
    if (this.captureSource) {
      try { this.captureSource.disconnect(); } catch {}
      this.captureSource = null;
    }
    if (this.mutedGain) {
      try { this.mutedGain.disconnect(); } catch {}
      this.mutedGain = null;
    }
    if (this.captureCtx && this.captureCtx.state !== 'closed') {
      try { void this.captureCtx.close(); } catch {}
      this.captureCtx = null;
    }
    if (this.playbackCtx && this.playbackCtx.state !== 'closed') {
      try { void this.playbackCtx.close(); } catch {}
      this.playbackCtx = null;
    }
    if (this.session) {
      try { this.session.close(); } catch {}
      this.session = null;
    }
    this.callbacks = null;
    voiceDiagnostics.set({ connection: 'idle', audio: 'idle', microphone: 'inactive' });
  }
}

export const liveProvider = new GeminiLiveProvider();
