import { VoiceState, VoiceStateListener, VoiceMode } from './types';
import { micManager } from './microphoneManager';
import { vad } from './vad';
import { stt } from './sttProvider';
import { audioQueue } from './audioQueue';
import { ResponseTextChunker } from './textChunker';

const SILENCE_MS: Record<VoiceMode, number> = {
  // Prompt mode: the draft settles into the composer after a long pause; the user sends it.
  prompt: 10_000,
  // Call mode: Bob answers as soon as you stop talking.
  call: 3_000
};

export class VoiceController {
  private state: VoiceState = 'IDLE';
  private listeners: Set<VoiceStateListener> = new Set();
  private energyListeners: Set<(energy: number) => void> = new Set();
  private currentTranscript = '';
  private isVoiceModeActive = false;
  private mode: VoiceMode = 'prompt';
  private chunker: ResponseTextChunker;
  private onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  private onSubmitMessage?: (text: string) => Promise<void>;
  private isSubmitting = false;

  constructor() {
    this.chunker = new ResponseTextChunker((chunk) => {
      const genId = audioQueue.getGenerationId();
      audioQueue.enqueue(chunk, genId);
    });

    audioQueue.setPlaybackStateListener((isPlaying) => {
      if (this.isVoiceModeActive && this.mode === 'call') {
        if (isPlaying && this.state !== 'USER_SPEAKING' && this.state !== 'INTERRUPTING') {
          this.setState('SPEAKING');
        } else if (!isPlaying && this.state === 'SPEAKING') {
          this.setState('LISTENING');
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
    this.listeners.forEach((l) => l(newState, { transcript: this.currentTranscript, error }));
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
      // Restart VAD with the new silence window; recording itself continues in STT.
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
        onEnergyChange: (energy) => this.energyListeners.forEach((fn) => fn(energy))
      }
    );
  }

  public async startVoiceMode(targetMode?: VoiceMode): Promise<boolean> {
    if (targetMode) {
      this.mode = targetMode;
    }
    if (this.isVoiceModeActive) return true;

    try {
      const stream = await micManager.startCapture();
      this.isVoiceModeActive = true;
      this.currentTranscript = '';
      this.setState('LISTENING');

      this.startVad(stream);

      await stt.start(
        (event) => {
          this.currentTranscript = event.transcript;
          this.onTranscriptUpdate?.(event.transcript, event.isFinal);

          if (event.isFinal) {
            if (this.mode === 'call') {
              void this.handleFinalTranscript(event.transcript);
            } else {
              this.setState('LISTENING');
            }
            return;
          }

          if (this.state !== 'USER_SPEAKING' && this.state !== 'SUBMITTING' && this.state !== 'THINKING') {
            this.setState('USER_SPEAKING');
          }
        },
        (errMsg) => {
          this.setState('ERROR', errMsg);
        }
      );

      return true;
    } catch (err: any) {
      this.setState('ERROR', err?.message || 'Could not start voice mode');
      this.stopVoiceMode();
      return false;
    }
  }

  public stopVoiceMode(): void {
    this.isVoiceModeActive = false;
    this.setState('STOPPING');

    audioQueue.interrupt();
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

    if (this.state === 'SPEAKING' || audioQueue.isPlaying()) {
      this.interrupt();
    }

    if (this.state !== 'SUBMITTING' && this.state !== 'THINKING') {
      this.setState('USER_SPEAKING');
    }
  }

  private handleSpeechEnd(): void {
    if (!this.isVoiceModeActive) return;
    // Transcribe everything said in this turn now, instead of waiting for the
    // next 60-second chunk boundary.
    if (typeof (stt as any).flush === 'function') {
      void (stt as any).flush();
    }
  }

  private async handleFinalTranscript(transcript: string): Promise<void> {
    const cleanText = transcript.trim();
    if (!cleanText || this.isSubmitting) return;

    this.isSubmitting = true;
    this.setState('TRANSCRIBING');

    setTimeout(async () => {
      this.setState('SUBMITTING');
      try {
        if (this.onSubmitMessage) {
          this.setState('THINKING');
          this.currentTranscript = '';
          await this.onSubmitMessage(cleanText);
        }
      } catch (err) {
        console.warn('Voice submit message error:', err);
      } finally {
        this.isSubmitting = false;
        if (!audioQueue.isPlaying() && this.isVoiceModeActive) {
          this.setState('LISTENING');
        }
      }
    }, 200);
  }

  public feedAIStreamChunk(chunkText: string): void {
    if (!this.isVoiceModeActive || this.mode !== 'call') return;
    this.chunker.feed(chunkText);
  }

  public finalizeAIResponse(fullText?: string): void {
    if (!this.isVoiceModeActive || this.mode !== 'call') return;
    this.chunker.flush();
  }

  public interrupt(): void {
    this.setState('INTERRUPTING');
    audioQueue.interrupt();
    this.chunker.reset();
    setTimeout(() => {
      if (this.isVoiceModeActive) {
        this.setState('LISTENING');
      }
    }, 150);
  }
}

export const voiceController = new VoiceController();
