/**
 * GeminiLiveService
 * 
 * Manages raw WebSocket connection to the Gemini Multimodal Live API:
 * wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
 * 
 * Architecture:
 * 1. Audio-to-Audio Pipeline: Bidirectional 16kHz PCM audio streaming upstream and 24kHz PCM downstream.
 * 2. Instant Barge-In (Interruption): Web Audio API playback queue stops instantaneously the moment user speech is detected.
 * 3. Fallback Protocol & Safeguards: Automatically catches network issues, 429 rate limits, and quota exhaustion (1,500 req/day limit),
 *    triggering seamless failover to secondary voice agents when the Live connection is unavailable.
 */

import { voiceDiagnostics } from '../voice/diagnostics';
import { resolveGeminiApiKey } from './keyManager';
import { voiceUsageService } from '../voice/voiceUsageService';

export interface GeminiLiveCallbacks {
  onConnected?: (model: string) => void;
  onUserSpeechStart?: () => void;
  onUserSpeechEnd?: () => void;
  onUserTranscript?: (text: string, isFinal: boolean) => void;
  onModelText?: (text: string, isFinal: boolean) => void;
  onModelAudioStart?: () => void;
  onModelAudioEnd?: () => void;
  onInterrupted?: () => void;
  onError?: (error: string) => void;
  onClosed?: (reason?: string) => void;
}

export interface GeminiLiveOptions {
  model?: string;
  voiceName?: string;
  systemInstruction?: string;
  mode?: 'call' | 'dictation';
}

const LIVE_WS_ENDPOINT = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const DEFAULT_LIVE_MODEL = 'models/gemini-3.8-live';
const FALLBACK_MODELS = [
  'models/gemini-3.8-live',
  'models/gemini-3.1-flash-live-preview',
  'models/gemini-2.5-flash-native-audio-preview-12-2025'
];

const TARGET_INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return buffer;
  if (inputRate < outputRate) return buffer;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : buffer[offsetBuffer];
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)) as any);
  }
  return btoa(binary);
}

export class GeminiLiveService {
  private static instance: GeminiLiveService | null = null;

  private ws: WebSocket | null = null;
  private isConnecting = false;
  private isConnected = false;
  private isStopped = false;
  private setupAcknowledged = false;
  private setupResolver: ((ok: boolean) => void) | null = null;
  private setupTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentModel = DEFAULT_LIVE_MODEL;
  private activeApiKey = '';
  private callbacks: GeminiLiveCallbacks = {};

  // Audio Capture
  private captureAudioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mutedGainNode: GainNode | null = null;

  // Audio Playback
  private playbackAudioContext: AudioContext | null = null;
  private scheduledPlayTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private isPlaying = false;

  // Interruption / VAD
  private userSpeaking = false;
  private lastUserSpeechTimestamp = 0;

  public static getInstance(): GeminiLiveService {
    if (!GeminiLiveService.instance) {
      GeminiLiveService.instance = new GeminiLiveService();
    }
    return GeminiLiveService.instance;
  }

  public isLiveConnected(): boolean {
    return this.isConnected && !this.isStopped && this.ws?.readyState === WebSocket.OPEN;
  }

  public getModel(): string {
    return this.currentModel;
  }

  /**
   * Connects to the Gemini Multimodal Live API via raw WebSocket
   */
  public async connect(
    stream: MediaStream,
    apiKey?: string,
    options: GeminiLiveOptions = {},
    callbacks: GeminiLiveCallbacks = {}
  ): Promise<boolean> {
    const resolvedKey = (apiKey || resolveGeminiApiKey() || '').trim();
    if (!resolvedKey) {
      voiceDiagnostics.event('Gemini Live connection unavailable; the controller will use its fallback path.');
      callbacks.onError?.('Missing Gemini API key');
      return false;
    }

    this.activeApiKey = resolvedKey;
    this.callbacks = callbacks;
    this.isStopped = false;

    // Stop any existing socket or capture
    this.cleanup();

    // Start Audio Capture Graph
    const captureOk = this.startAudioCapture(stream);
    if (!captureOk) {
      this.cleanup();
      voiceDiagnostics.event('Primary Gemini Live connection unavailable; trying the SDK fallback.');
      return false;
    }

    // Try primary models
    const configuredModels = options.mode === 'dictation'
      ? [options.model || 'gemini-3.5-transcribe-live']
      : options.model ? [options.model, ...FALLBACK_MODELS] : FALLBACK_MODELS;
    const modelsToTry = [...new Set(configuredModels.map((model) => model.replace(/^models\//, '')))];

    for (const model of modelsToTry) {
      if (this.isStopped) return false;
      const success = await this.tryConnectSocket(model, resolvedKey, options);
      if (success) {
        this.currentModel = model;
        return true;
      }
    }

    // All raw WebSocket candidates failed. Release their audio graph before
    // liveProvider attempts the SDK fallback, and do not signal a fatal error yet.
    voiceDiagnostics.event('Raw Gemini Live WebSocket candidates failed; the SDK fallback will be tried next.');
    this.cleanup();
    return false;
  }

  private tryConnectSocket(model: string, apiKey: string, options: GeminiLiveOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.isConnecting = true;
      this.setupAcknowledged = false;
      this.setupResolver = resolve;
      const url = `${LIVE_WS_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;

      let ws: WebSocket;

      try {
        ws = new WebSocket(url);
        this.ws = ws;
      } catch (err: any) {
        this.isConnecting = false;
        this.setupResolver = null;
        return resolve(false);
      }

      // The connection is only considered established once the server acknowledges
      // the session setup (setupComplete). Opening the socket alone is NOT success.
      const timeoutTimer = setTimeout(() => {
        if (!this.setupAcknowledged) {
          this.setupTimeout = null;
          try { ws.close(); } catch {}
          this.isConnecting = false;
          this.isConnected = false;
          this.setupResolver = null;
          resolve(false);
        }
      }, 9000);
      this.setupTimeout = timeoutTimer;

      ws.onopen = () => {
        // Socket opened: send the setup handshake and WAIT for the server's
        // setupComplete acknowledgement before declaring the session connected.
        const setupPayload = {
          setup: {
            model: model.startsWith('models/') ? model : `models/${model}`,
            responseModalities: options.mode === 'dictation' ? ['TEXT'] : ['AUDIO'],
            ...(options.mode === 'dictation' ? {} : {
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: options.voiceName || 'Puck'
                  }
                }
              }
            }),
            inputAudioTranscription: {},
            ...(options.mode === 'dictation' ? {} : { outputAudioTranscription: {} }),
            systemInstruction: {
              parts: [
                {
                  text: options.systemInstruction ||
                    'You are Bob, a helpful, proactive, and witty research companion. Respond naturally, clearly, and concisely in spoken conversation.'
                }
              ]
            }
          }
        };

        try {
          ws.send(JSON.stringify(setupPayload));
          this.currentModel = model;
        } catch {
          clearTimeout(timeoutTimer);
          this.setupTimeout = null;
          this.isConnecting = false;
          this.setupResolver = null;
          resolve(false);
        }
      };

      ws.onmessage = async (event: MessageEvent) => {
        if (this.isStopped) return;
        try {
          let dataText = '';
          if (typeof event.data === 'string') {
            dataText = event.data;
          } else if (event.data instanceof Blob) {
            dataText = await event.data.text();
          } else if (event.data instanceof ArrayBuffer) {
            dataText = new TextDecoder().decode(event.data);
          }

          if (!dataText) return;
          const msg = JSON.parse(dataText);
          this.handleServerMessage(msg);
        } catch (e) {
          console.warn('[GeminiLiveService] Failed to parse message:', e);
        }
      };

      ws.onerror = (_e: Event) => {
        clearTimeout(timeoutTimer);
        this.setupTimeout = null;
        this.isConnecting = false;
        voiceUsageService.recordError('Gemini Live WebSocket connection error');
        if (!this.setupAcknowledged) {
          const r = this.setupResolver;
          this.setupResolver = null;
          r?.(false);
        } else {
          voiceDiagnostics.event('Gemini Live connection unavailable; the controller will use its fallback path.');
          this.callbacks.onError?.('Gemini Live WebSocket error');
        }
      };

      ws.onclose = (event: CloseEvent) => {
        clearTimeout(timeoutTimer);
        this.setupTimeout = null;
        this.isConnected = false;
        this.isConnecting = false;
        voiceUsageService.recordLiveCallEnd();
        if (!this.setupAcknowledged) {
          const r = this.setupResolver;
          this.setupResolver = null;
          r?.(false);
        } else {
          // Check for quota exhaustion / rate limits (e.g. 1008 policy violation, 429 code)
          const reason = event.reason || `Close code: ${event.code}`;
          voiceDiagnostics.event('Primary Gemini Live quota reached / network interruption. Switched to fallback agent mode.');
          this.callbacks.onClosed?.(reason);
        }
      };
    });
  }

  /**
   * Called once the server acknowledges the session setup. This is the ONLY point
   * at which we treat the Live session as genuinely connected.
   */
  private markSetupComplete(model: string): void {
    if (this.setupAcknowledged) return;
    this.setupAcknowledged = true;
    this.isConnected = true;
    this.isConnecting = false;
    this.currentModel = model;

    if (this.setupTimeout) {
      clearTimeout(this.setupTimeout);
      this.setupTimeout = null;
    }

    this.callbacks.onConnected?.(model);
    voiceDiagnostics.set({
      provider: 'Gemini Multimodal Live',
      model,
      connection: 'connected'
    });
    voiceDiagnostics.event(`Gemini Live connected (${model})`);
    voiceUsageService.setProvider('Gemini Multimodal Live', model, true);
    voiceUsageService.recordLiveCallStart();

    const r = this.setupResolver;
    this.setupResolver = null;
    r?.(true);
  }

  /**
   * Handles incoming Gemini Live Bidi messages
   */
  private handleServerMessage(msg: any): void {
    if (!msg || typeof msg !== 'object') return;

    // Session setup acknowledgement: the ONLY genuine "connected" signal.
    if (msg.setupComplete) {
      const ackedModel = msg.setupComplete?.model || this.currentModel;
      this.markSetupComplete(ackedModel);
      return;
    }

    // Setup was rejected by the server (bad model, quota, malformed config).
    if (msg.setupError || msg.error) {
      const errText = msg.setupError?.message || msg.error?.message || 'Gemini Live setup rejected';
      if (!this.setupAcknowledged) {
        if (this.setupTimeout) {
          clearTimeout(this.setupTimeout);
          this.setupTimeout = null;
        }
        this.isConnecting = false;
        this.isConnected = false;
        voiceUsageService.recordError(errText);
        const r = this.setupResolver;
        this.setupResolver = null;
        r?.(false);
        return;
      }
    }

    const serverContent = msg.serverContent;

    // Live API transcriptions are separate serverContent fields, not modelTurn parts.
    const inputText = serverContent?.inputTranscription?.text || serverContent?.interimInputTranscription?.text;
    if (inputText) {
      this.callbacks.onUserTranscript?.(inputText, Boolean(serverContent?.inputTranscription?.text));
    }
    const outputText = serverContent?.outputTranscription?.text;
    if (outputText) {
      this.callbacks.onModelText?.(outputText, false);
    }

    // Interruption signal: user spoke while model was speaking
    if (serverContent?.interrupted) {
      this.interruptPlayback();
      this.callbacks.onInterrupted?.();
      return;
    }

    // Model turn parts (text or audio PCM)
    const parts = serverContent?.modelTurn?.parts;
    if (Array.isArray(parts)) {
      for (const part of parts) {
        // Model Text Chunk
        if (part.text && !outputText) {
          this.callbacks.onModelText?.(part.text, false);
        }

        // Model Audio PCM Chunk
        if (part.inlineData && part.inlineData.data) {
          const base64Data = part.inlineData.data;
          this.enqueueAudioChunk(base64Data);
        }
      }
    }

    // Turn Complete
    if (msg.serverContent?.turnComplete) {
      this.callbacks.onModelText?.('', true);
      // Wait for playback to finish
      if (!this.isPlaying) {
        this.callbacks.onModelAudioEnd?.();
      }
    }
  }

  /**
   * Audio Capture Graph: Captures mic audio, resamples to 16kHz PCM, base64 encodes and streams upstream.
   */
  private startAudioCapture(stream: MediaStream): boolean {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.captureAudioContext = new AudioContextClass();

      const inputRate = this.captureAudioContext.sampleRate;
      this.mediaStreamSource = this.captureAudioContext.createMediaStreamSource(stream);

      // ScriptProcessor node for real-time PCM extraction
      this.scriptProcessor = this.captureAudioContext.createScriptProcessor(4096, 1, 1);

      // Muted gain node to prevent echo into speaker
      this.mutedGainNode = this.captureAudioContext.createGain();
      this.mutedGainNode.gain.value = 0;

      this.scriptProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isConnected || this.isStopped || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);

        // Native VAD / Energy detection for instant local interruption
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const isSpeaking = rms > 0.02;

        if (isSpeaking) {
          this.lastUserSpeechTimestamp = Date.now();
          if (!this.userSpeaking) {
            this.userSpeaking = true;
            this.callbacks.onUserSpeechStart?.();
            // INSTANT BARGE-IN: stop local audio playback immediately when user starts speaking!
            if (this.isPlaying) {
              this.interruptPlayback();
              this.callbacks.onInterrupted?.();
            }
          }
        } else if (this.userSpeaking && Date.now() - this.lastUserSpeechTimestamp > 600) {
          this.userSpeaking = false;
          this.callbacks.onUserSpeechEnd?.();
        }

        // Resample to 16kHz mono PCM
        const downsampled = downsampleBuffer(inputData, inputRate, TARGET_INPUT_SAMPLE_RATE);
        const pcm16 = floatTo16BitPCM(downsampled);
        const base64Audio = arrayBufferToBase64(pcm16.buffer);

        // The Live API expects one audio payload per realtimeInput message.
        const realtimeInputPayload = {
          realtimeInput: {
            audio: {
              mimeType: `audio/pcm;rate=${TARGET_INPUT_SAMPLE_RATE}`,
              data: base64Audio
            }
          }
        };

        try {
          this.ws.send(JSON.stringify(realtimeInputPayload));
        } catch {
          // Socket write failed
        }
      };

      this.mediaStreamSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.mutedGainNode);
      this.mutedGainNode.connect(this.captureAudioContext.destination);

      return true;
    } catch (err: any) {
      console.warn('[GeminiLiveService] Audio capture init error:', err);
      return false;
    }
  }

  /**
   * Web Audio API Playback Queue
   */
  private enqueueAudioChunk(base64Data: string): void {
    try {
      if (!this.playbackAudioContext) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.playbackAudioContext = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });
      }

      if (this.playbackAudioContext.state === 'suspended') {
        void this.playbackAudioContext.resume();
      }

      const pcmBuffer = base64ToArrayBuffer(base64Data);
      const int16Array = new Int16Array(pcmBuffer);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.playbackAudioContext.createBuffer(1, float32Array.length, OUTPUT_SAMPLE_RATE);
      audioBuffer.getChannelData(0).set(float32Array);

      const sourceNode = this.playbackAudioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.playbackAudioContext.destination);

      const now = this.playbackAudioContext.currentTime;
      const startTime = Math.max(now, this.scheduledPlayTime);
      sourceNode.start(startTime);
      this.scheduledPlayTime = startTime + audioBuffer.duration;

      this.activeSources.add(sourceNode);

      if (!this.isPlaying) {
        this.isPlaying = true;
        this.callbacks.onModelAudioStart?.();
      }

      sourceNode.onended = () => {
        this.activeSources.delete(sourceNode);
        if (this.activeSources.size === 0) {
          this.isPlaying = false;
          this.callbacks.onModelAudioEnd?.();
        }
      };
    } catch (e) {
      console.warn('[GeminiLiveService] Audio playback chunk error:', e);
    }
  }

  /**
   * Instantly stops playback and cancels scheduled chunks (barge-in)
   */
  public interruptPlayback(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.activeSources.clear();
    this.isPlaying = false;
    if (this.playbackAudioContext) {
      this.scheduledPlayTime = this.playbackAudioContext.currentTime;
    }
  }

  /**
   * Send text turn explicitly
   */
  public sendText(text: string): void {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const clientPayload = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }]
          }
        ],
        turnComplete: true
      }
    };
    try {
      this.ws.send(JSON.stringify(clientPayload));
    } catch (e) {
      console.warn('[GeminiLiveService] Failed to send text:', e);
    }
  }

  /**
   * Full teardown of sockets and audio contexts
   */
  public cleanup(): void {
    this.interruptPlayback();

    // Close WebSocket
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    // Stop Capture Nodes
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }
    if (this.mediaStreamSource) {
      try {
        this.mediaStreamSource.disconnect();
      } catch {}
      this.mediaStreamSource = null;
    }
    if (this.mutedGainNode) {
      try {
        this.mutedGainNode.disconnect();
      } catch {}
      this.mutedGainNode = null;
    }
    if (this.captureAudioContext) {
      try {
        void this.captureAudioContext.close();
      } catch {}
      this.captureAudioContext = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.setupAcknowledged = false;
    this.userSpeaking = false;
    this.lastUserSpeechTimestamp = 0;
    this.scheduledPlayTime = this.playbackAudioContext?.currentTime || 0;
    if (this.setupTimeout) {
      clearTimeout(this.setupTimeout);
      this.setupTimeout = null;
    }
    this.setupResolver = null;
  }

  public stop(): void {
    this.isStopped = true;
    this.cleanup();
    this.callbacks = {};
  }
}

export const geminiLiveService = GeminiLiveService.getInstance();
