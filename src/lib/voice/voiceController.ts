import { VoiceState, VoiceStateListener, VoiceMode } from './types';
import { micManager } from './microphoneManager';
import { vad } from './vad';
import { stt } from './sttProvider';
import { tts } from './ttsProvider';
import { audioQueue } from './audioQueue';
import { ResponseTextChunker } from './textChunker';
import { SILENCE_TIMEOUT_MS, MAX_CALL_IDLE_MS, DEFAULT_VOICE_CONFIG } from './voiceConfig';

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
    onTranscriptUpdate: (transcript: string, isFinal: boolean) => void;
    onSubmitMessage: (text: string) => Promise<void>;
  }): void {
    this.onTranscriptUpdate = handlers.onTranscriptUpdate;
    this.onSubmitMessage = handlers.onSubmitMessage;
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

  public async startVoiceMode(targetMode?: VoiceMode): Promise<boolean> {
    if (targetMode) {
      this.mode = targetMode;
    }
    if (this.isVoiceModeActive) return true;

    this.setState('REQUESTING_PERMISSION');

    try {
      const stream = await micManager.startCapture();
      this.isVoiceModeActive = true;
      this.currentTranscript = '';
      this.setState('LISTENING');

      this.startVad(stream);
      if (this.mode === 'call') {
        this.armCallIdleTimer();
      }

      await stt.start(
        (event) => {
          this.currentTranscript = event.transcript;

          if (this.mode === 'prompt') {
            // Live WhisperFlow-style streaming transcription
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

    audioQueue.interrupt();
    tts.stop();
    vad.stop();
    stt.stop();
    micManager.stopCapture();
    this.chunker.reset();
    this.currentTranscript = '';
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
    audioQueue.interrupt();
    tts.stop();
    this.chunker.reset();
    setTimeout(() => {
      if (this.isVoiceModeActive) {
        this.setState('LISTENING');
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
