import { VoiceState, VoiceStateListener, VoiceMode } from './types';
import { micManager } from './microphoneManager';
import { vad } from './vad';
import { stt } from './sttProvider';
import { tts } from './ttsProvider';
import { audioQueue } from './audioQueue';
import { ResponseTextChunker } from './textChunker';
import { SILENCE_TIMEOUT_MS, MAX_CALL_IDLE_MS, DEFAULT_VOICE_CONFIG } from './voiceConfig';
import { liveProvider } from './liveProvider';
import { voiceDiagnostics } from './diagnostics';
import { resolveGeminiApiKey } from '../ai/keyManager';
import { mergeStreamingText } from './transcriptMerge';

const SILENCE_MS: Record<VoiceMode, number> = {
  // WhisperFlow dictation: finalize live words into composer after ~1.5s silence
  prompt: SILENCE_TIMEOUT_MS,
  // Call mode: handoff turn to Bob after ~1.5s natural pause
  call: SILENCE_TIMEOUT_MS,
};

/** Grace period after a release so the VAD tail cannot re-finalize the same turn. */
const PTT_COOLDOWN_MS = 900;

export class VoiceController {
  private state: VoiceState = 'IDLE';
  private listeners: Set<VoiceStateListener> = new Set();
  private energyListeners: Set<(energy: number) => void> = new Set();
  private currentTranscript = '';
  private bobReply = '';
  private liveInputTranscript = '';
  private liveOutputTranscript = '';
  private isUsingFallback = false;
  private isVoiceModeActive = false;
  private mode: VoiceMode = 'prompt';
  private chunker: ResponseTextChunker;
  private onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  private onSubmitMessage?: (text: string) => Promise<void>;
  private isSubmitting = false;
  private callIdleTimer: any = null;
  private transcriptReadyTimer: any = null;
  private pttActive = false;
  private pttHoldTimer: any = null;
  private pttCooldownUntil = 0;
  private lastReplyNotify = 0;

  constructor() {
    this.chunker = new ResponseTextChunker((chunk) => {
      const genId = audioQueue.getGenerationId();
      audioQueue.enqueue(chunk, genId);
    });

    audioQueue.setPlaybackStateListener((isPlaying) => {
      if (this.isVoiceModeActive && this.mode === 'call') {
        if (isPlaying && this.state !== 'USER_SPEAKING' && this.state !== 'INTERRUPTING') {
          this.setState('SPEAKING');
          this.clearCallIdleTimer();
        } else if (!isPlaying && this.state === 'SPEAKING') {
          this.setState('LISTENING');
          this.armCallIdleTimer();
        }
      }
    });
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state, { transcript: this.currentTranscript });
    return () => this.listeners.delete(listener);
  }

  public addEnergyListener(listener: (energy: number) => void): () => void {
    this.energyListeners.add(listener);
    return () => this.energyListeners.delete(listener);
  }

  private setState(newState: VoiceState, error?: string): void {
    this.state = newState;
    this.listeners.forEach((l) =>
      l(newState, {
        transcript: this.currentTranscript,
        aiReply: this.bobReply,
        mode: this.mode,
        error
      })
    );
  }

  public getState(): VoiceState {
    return this.state;
  }

  public getMode(): VoiceMode {
    return this.mode;
  }

  public setMode(mode: VoiceMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (this.isVoiceModeActive) {
      vad.stop();
      const stream = micManager.getStream();
      if (stream) this.startVad(stream);
    }
  }

  public registerHandlers(handlers: {
    onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
    onSubmitMessage?: (text: string) => Promise<void>;
  }): void {
    if (handlers.onTranscriptUpdate) this.onTranscriptUpdate = handlers.onTranscriptUpdate;
    if (handlers.onSubmitMessage) this.onSubmitMessage = handlers.onSubmitMessage;
  }

  private startVad(stream: MediaStream): void {
    vad.start(
      stream,
      {
        onSpeechStart: () => this.handleSpeechStart(),
        onSpeechEnd: () => this.handleSpeechEnd(),
        onEnergyChange: (energy) => this.energyListeners.forEach((fn) => fn(energy)),
      },
      SILENCE_MS[this.mode]
    );
  }

  private armCallIdleTimer(): void {
    this.clearCallIdleTimer();
    this.callIdleTimer = setTimeout(() => {
      if (this.isVoiceModeActive && this.mode === 'call' && this.state === 'LISTENING') {
        // Subtle reassurance or keep listening smoothly
      }
    }, MAX_CALL_IDLE_MS);
  }

  private clearCallIdleTimer(): void {
    if (this.callIdleTimer) {
      clearTimeout(this.callIdleTimer);
      this.callIdleTimer = null;
    }
  }

  private isUsingLive = false;

  private async failoverToLegacyCall(stream: MediaStream): Promise<void> {
    // Live providers can emit both onerror and onclose for one failure. Start
    // the fallback STT/VAD stack only once for this call session.
    if (!this.isVoiceModeActive || this.mode !== 'call' || this.isUsingFallback) return;
    this.isUsingFallback = true;
    this.liveOutputTranscript = '';
    this.bobReply = '';
    liveProvider.stop();
    this.isUsingLive = false;
    voiceDiagnostics.set({ provider: 'Fallback Secondary Agent', connection: 'active' });
    this.startVad(stream);
    this.armCallIdleTimer();
    await this.startLegacySTT();
    if (!this.isVoiceModeActive) stt.stop();
  }

  private async startLegacySTT(): Promise<void> {
    await stt.start(
      (event) => {
        this.currentTranscript = event.transcript;

        if (this.mode === 'prompt') {
          this.onTranscriptUpdate?.(event.transcript, event.isFinal);
          if (event.isFinal) {
            this.setState('TRANSCRIPT_READY');
            if (this.transcriptReadyTimer) clearTimeout(this.transcriptReadyTimer);
            this.transcriptReadyTimer = setTimeout(() => {
              if (this.isVoiceModeActive && this.mode === 'prompt') {
                this.setState('LISTENING');
              }
            }, 1200);
          } else if (this.state !== 'USER_SPEAKING') {
            this.setState('USER_SPEAKING');
          }
          return;
        }

        // Call mode
        if (event.isFinal) {
          void this.handleFinalTranscript(event.transcript);
          return;
        }

        if (this.state !== 'USER_SPEAKING' && this.state !== 'SUBMITTING' && this.state !== 'THINKING') {
          this.setState('USER_SPEAKING');
          this.clearCallIdleTimer();
        }
      },
      (errMsg) => {
        this.setState('ERROR', errMsg);
      }
    );
    if (!this.isVoiceModeActive) stt.stop();
  }

  public isLiveModeActive(): boolean {
    return this.isUsingLive;
  }

  public getActiveCallAgent(): {
    name: string;
    engine: 'gemini-live' | 'kokoro' | 'webspeech';
    badge: string;
    description: string;
    isPrimary: boolean;
  } {
    if (this.isUsingLive) {
      return {
        name: 'Gemini Multimodal Live',
        engine: 'gemini-live',
        badge: 'Gemini Live API',
        description: 'Primary agent · Full-duplex WebSocket, server VAD & native barge-in.',
        isPrimary: true,
      };
    }

    return {
      name: 'Gemini Fast Voice',
      engine: 'webspeech',
      badge: 'Gemini Fast Voice',
      description: 'Secondary agent · Gemini STT & Flash reasoning with instant audio synthesis.',
      isPrimary: false,
    };
  }

  public async startVoiceMode(targetMode?: VoiceMode): Promise<boolean> {
    if (targetMode) {
      this.mode = targetMode;
    }
    if (this.isVoiceModeActive) return true;

    this.isUsingLive = false;
    this.isUsingFallback = false;
    this.liveInputTranscript = '';
    this.liveOutputTranscript = '';
    this.currentTranscript = '';
    this.bobReply = '';
    this.setState('REQUESTING_PERMISSION');

    try {
      const stream = await micManager.startCapture();
      this.isVoiceModeActive = true;
      this.currentTranscript = '';
      this.setState('LISTENING');

      if (this.mode === 'call') {
        this.armCallIdleTimer();
        const apiKey = resolveGeminiApiKey() || '';

        if (apiKey && DEFAULT_VOICE_CONFIG.liveEnabled) {
          try {
            const systemInstruction =
              "You are Bob, a helpful, witty, and proactive AI companion. Assist the user with research, productivity, and thought partner conversations in a friendly, conversational tone. Keep voice responses brief, vivid, and articulate.";
            const connected = await liveProvider.connect(stream, apiKey, systemInstruction, {
              onConnected: (model) => {
                this.isUsingLive = true;
                voiceDiagnostics.set({ provider: 'Gemini Multimodal Live', model, connection: 'connected' });
                voiceDiagnostics.event('Primary Gemini Live connected successfully');
              },
              onUserSpeechStart: () => {
                this.liveInputTranscript = '';
                this.liveOutputTranscript = '';
                this.currentTranscript = '';
                this.bobReply = '';
                this.setState('USER_SPEAKING');
                this.clearCallIdleTimer();
              },
              onUserSpeechEnd: () => {
                if (this.state === 'USER_SPEAKING') {
                  this.setState('THINKING');
                }
              },
              onUserTranscript: (text, _isFinal) => {
                this.liveInputTranscript = mergeStreamingText(this.liveInputTranscript, text);
                this.currentTranscript = this.liveInputTranscript;
                this.notifyListeners();
              },
              onModelText: (text, _isFinal) => {
                if (text) {
                  this.liveOutputTranscript = mergeStreamingText(this.liveOutputTranscript, text);
                  this.bobReply = this.liveOutputTranscript;
                }
                // Some providers send an empty final marker; preserve the accumulated reply.
                this.notifyListeners();
              },
              onModelAudioStart: () => {
                this.setState('SPEAKING');
                this.clearCallIdleTimer();
              },
              onModelAudioEnd: () => {
                this.setState('LISTENING');
                this.armCallIdleTimer();
              },
              onInterrupted: () => {
                this.setState('LISTENING');
              },
              onError: (err) => {
                voiceDiagnostics.event(`Gemini Live error; switching to fallback agent mode: ${String(err || 'unknown error').slice(0, 160)}`);
                void this.failoverToLegacyCall(stream);
              },
              onClosed: () => {
                if (this.isVoiceModeActive && this.isUsingLive) {
                  voiceDiagnostics.event('Gemini Live connection closed; switching to fallback agent mode.');
                  void this.failoverToLegacyCall(stream);
                }
              },
            });

            if (connected) {
              if (!this.isVoiceModeActive) {
                liveProvider.stop();
                return false;
              }
              if (this.isUsingFallback) return true;
              this.isUsingLive = true;
              return true;
            }
          } catch {
            voiceDiagnostics.event('Gemini Live connection attempt failed; checking fallback availability.');
          }
        } else {
          voiceDiagnostics.event('Gemini Live is unavailable or no API key is configured; checking fallback availability.');
        }

        if (!this.isVoiceModeActive) return false;
        if (this.isUsingFallback) return true;

        // Secondary legacy fallback
        await this.failoverToLegacyCall(stream);
        return this.isVoiceModeActive;
      }

      // Prompt / Dictation mode: default live transcription pipeline with Gemini STT fallback
      const apiKey = resolveGeminiApiKey();
      const hasSpeechRec = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
      if (!apiKey && !hasSpeechRec) {
        this.setState('ERROR', 'Gemini API key required for dictation. Add your key in Settings.');
        return false;
      }

      this.startVad(stream);
      await this.startLegacySTT();

      return true;
    } catch (err: any) {
      this.setState('ERROR', err?.message || 'Could not start microphone');
      this.stopVoiceMode();
      return false;
    }
  }

  /**
   * Push-to-talk: hold to record. Starts voice mode on demand so the space bar
   * works from a completely idle app. Noise in the room no longer matters —
   * the turn ends the moment the user lets go.
   */
  public async beginPushToTalk(targetMode?: VoiceMode): Promise<boolean> {
    if (targetMode) this.setMode(targetMode);
    if (this.pttActive) return true;

    if (!this.isVoiceModeActive) {
      const ok = await this.startVoiceMode(this.mode);
      if (!ok) return false;
    }

    // Cut Bob off mid-sentence without the INTERRUPTING→LISTENING state dance,
    // which would otherwise overwrite the recording state 120ms later.
    audioQueue.interrupt();
    tts.stop();
    this.chunker.reset();
    this.pttActive = true;
    this.pttCooldownUntil = 0;
    this.currentTranscript = '';
    this.setState('USER_SPEAKING');

    // Never "forever": auto-release at the configured maximum turn length.
    this.clearPttHoldTimer();
    this.pttHoldTimer = setTimeout(() => {
      if (this.pttActive) void this.endPushToTalk();
    }, DEFAULT_VOICE_CONFIG.maximumTurnDurationMs);

    return true;
  }

  /** Release: transcribe what was held, then hand it to the composer or to Bob. */
  public async endPushToTalk(): Promise<string> {
    if (!this.pttActive) return '';
    this.pttActive = false;
    this.clearPttHoldTimer();
    this.pttCooldownUntil = Date.now() + PTT_COOLDOWN_MS;

    this.setState('TRANSCRIBING');
    let text = '';
    try {
      text = (await stt.flush('release')).trim();
    } catch (err) {
      console.warn('[VoiceController] Push-to-talk flush error:', err);
    }

    if (!this.isVoiceModeActive) return text;

    if (this.mode === 'prompt') {
      if (!text) {
        this.setState('LISTENING');
        return text;
      }
      this.currentTranscript = text;
      this.onTranscriptUpdate?.(text, true);
      this.setState('TRANSCRIPT_READY');
      if (this.transcriptReadyTimer) clearTimeout(this.transcriptReadyTimer);
      this.transcriptReadyTimer = setTimeout(() => {
        if (this.isVoiceModeActive && this.mode === 'prompt') this.setState('LISTENING');
      }, 1200);
    } else if (text) {
      void this.handleFinalTranscript(text);
    } else {
      this.setState('LISTENING');
      this.armCallIdleTimer();
    }

    return text;
  }

  public isPushToTalkActive(): boolean {
    return this.pttActive;
  }

  public async startPushToTalk(mode: VoiceMode = 'prompt'): Promise<boolean> {
    return this.beginPushToTalk(mode);
  }

  public async stopPushToTalk(): Promise<string> {
    return this.endPushToTalk();
  }

  public async finishTurnImmediately(): Promise<void> {
    await this.endPushToTalk();
  }

  private clearPttHoldTimer(): void {
    if (this.pttHoldTimer) {
      clearTimeout(this.pttHoldTimer);
      this.pttHoldTimer = null;
    }
  }

  public stopVoiceMode(): void {
    this.isVoiceModeActive = false;
    this.setState('STOPPING');

    this.pttActive = false;
    this.clearPttHoldTimer();
    this.clearCallIdleTimer();
    if (this.transcriptReadyTimer) {
      clearTimeout(this.transcriptReadyTimer);
      this.transcriptReadyTimer = null;
    }

    if (this.isUsingLive) {
      liveProvider.stop();
      this.isUsingLive = false;
    }

    audioQueue.interrupt();
    tts.stop();
    vad.stop();
    stt.stop();
    micManager.stopCapture();
    this.chunker.reset();
    this.currentTranscript = '';
    this.liveInputTranscript = '';
    this.liveOutputTranscript = '';
    this.bobReply = '';
    this.isUsingFallback = false;
    this.isSubmitting = false;

    this.setState('IDLE');
  }

  private handleSpeechStart(): void {
    if (!this.isVoiceModeActive) return;

    // Instant interruption (Barge-in): stop Bob speaking immediately when the
    // user speaks. While holding to talk, beginPushToTalk already cut Bob off —
    // interrupting again would schedule a LISTENING state 120ms later that
    // overwrites the recording indicator mid-turn.
    if (!this.pttActive && (this.state === 'SPEAKING' || audioQueue.isPlaying() || tts.isSpeaking())) {
      this.interrupt();
    }

    if (this.state !== 'SUBMITTING' && this.state !== 'THINKING') {
      this.setState('USER_SPEAKING');
      this.clearCallIdleTimer();
    }
  }

  private async handleSpeechEnd(): Promise<void> {
    if (!this.isVoiceModeActive) return;
    // While holding to talk (or just after a release) the user owns turn
    // boundaries; the silence VAD must not finalize behind them.
    if (this.pttActive || Date.now() < this.pttCooldownUntil) return;

    // 1.5s silence reached: finalize this speech turn rapidly
    if (typeof (stt as any).flush === 'function') {
      const flushedText = await (stt as any).flush('vad');
      if (this.mode === 'prompt') {
        if (flushedText && flushedText.trim()) {
          this.onTranscriptUpdate?.(flushedText.trim(), true);
          this.setState('TRANSCRIPT_READY');
          if (this.transcriptReadyTimer) clearTimeout(this.transcriptReadyTimer);
          this.transcriptReadyTimer = setTimeout(() => {
            if (this.isVoiceModeActive && this.mode === 'prompt') {
              this.setState('LISTENING');
            }
          }, 1200);
        }
      } else if (this.mode === 'call') {
        if (flushedText && flushedText.trim()) {
          void this.handleFinalTranscript(flushedText.trim());
        } else if (!audioQueue.isPlaying()) {
          this.setState('LISTENING');
          this.armCallIdleTimer();
        }
      }
    }
  }

  private async handleFinalTranscript(transcript: string): Promise<void> {
    const cleanText = transcript.trim();
    if (!cleanText || this.isSubmitting) return;

    this.isSubmitting = true;
    this.bobReply = '';
    this.setState('SUBMITTING');
    try {
      if (this.onSubmitMessage) {
        this.setState('THINKING');
        this.currentTranscript = '';
        await this.onSubmitMessage(cleanText);
      }
    } catch (err) {
      console.warn('[VoiceController] Submit message error:', err);
    } finally {
      this.isSubmitting = false;
      if (!audioQueue.isPlaying() && this.isVoiceModeActive) {
        this.setState('LISTENING');
        this.armCallIdleTimer();
      }
    }
  }

  public feedAIStreamChunk(chunkText: string): void {
    if (!this.isVoiceModeActive || this.mode !== 'call') return;
    this.bobReply += chunkText;
    // Throttled so the call overlay can show Bob's words live without a
    // re-render per token.
    const now = Date.now();
    if (now - this.lastReplyNotify > 240) {
      this.lastReplyNotify = now;
      this.notifyListeners();
    }
    this.chunker.feed(chunkText);
  }

  public finalizeAIResponse(fullText?: string): void {
    if (!this.isVoiceModeActive || this.mode !== 'call') return;
    if (fullText && !this.bobReply) this.bobReply = fullText;
    this.notifyListeners();
    this.chunker.flush();
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) =>
      l(this.state, {
        transcript: this.currentTranscript,
        aiReply: this.bobReply,
        mode: this.mode
      })
    );
  }

  public interrupt(): void {
    this.setState('INTERRUPTING');
    if (this.isUsingLive) {
      liveProvider.clearScheduledAudio();
    }
    audioQueue.interrupt();
    tts.stop();
    this.chunker.reset();
    setTimeout(() => {
      if (this.isVoiceModeActive) {
        this.setState('LISTENING');
        if (this.mode === 'call') {
          this.armCallIdleTimer();
        }
      }
    }, 120);
  }

  public async speakText(text: string, voiceId?: string): Promise<void> {
    audioQueue.interrupt();
    await tts.speak(text, { voiceId });
  }

  public stopSpeaking(): void {
    audioQueue.interrupt();
    tts.stop();
  }

  public isSpeaking(): boolean {
    return tts.isSpeaking() || audioQueue.isPlaying() || this.state === 'SPEAKING';
  }
}

export const voiceController = new VoiceController();
