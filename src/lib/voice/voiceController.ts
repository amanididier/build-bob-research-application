import { VoiceState, VoiceStateListener } from './types';
import { micManager } from './microphoneManager';
import { vad } from './vad';
import { stt } from './sttProvider';
import { audioQueue } from './audioQueue';
import { ResponseTextChunker } from './textChunker';

export class VoiceController {
  private state: VoiceState = 'IDLE';
  private listeners: Set<VoiceStateListener> = new Set();
  private currentTranscript = '';
  private isVoiceModeActive = false;
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
      if (this.isVoiceModeActive) {
        if (isPlaying && this.state !== 'USER_SPEAKING' && this.state !== 'INTERRUPTING') {
          this.setState('SPEAKING');
        } else if (!isPlaying && this.state === 'SPEAKING') {
          // Finished speaking -> Return to LISTENING for continuous conversation!
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

  private setState(newState: VoiceState, error?: string): void {
    this.state = newState;
    this.listeners.forEach((l) => l(newState, { transcript: this.currentTranscript, error }));
  }

  public getState(): VoiceState {
    return this.state;
  }

  public registerHandlers(handlers: {
    onTranscriptUpdate: (transcript: string, isFinal: boolean) => void;
    onSubmitMessage: (text: string) => Promise<void>;
  }): void {
    this.onTranscriptUpdate = handlers.onTranscriptUpdate;
    this.onSubmitMessage = handlers.onSubmitMessage;
  }

  public async startVoiceMode(): Promise<boolean> {
    if (this.isVoiceModeActive) return true;

    try {
      const stream = await micManager.startCapture();
      this.isVoiceModeActive = true;
      this.setState('LISTENING');

      // 1. Start VAD
      vad.start(stream, {
        onSpeechStart: () => this.handleSpeechStart(),
        onSpeechEnd: () => this.handleSpeechEnd(),
      });

      // 2. Start STT
      await stt.start(
        (event) => {
          this.currentTranscript = event.transcript;
          this.onTranscriptUpdate?.(event.transcript, event.isFinal);

          if (this.state !== 'USER_SPEAKING' && this.state !== 'SUBMITTING' && this.state !== 'THINKING') {
            this.setState('USER_SPEAKING');
          }

          if (event.isFinal) {
            this.handleFinalTranscript(event.transcript);
          }
        },
        (errMsg) => {
          console.warn('STT warning:', errMsg);
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

    // BARGE-IN INTERRUPTION: If Bob is speaking and user starts talking, interrupt immediately!
    if (this.state === 'SPEAKING' || audioQueue.isPlaying()) {
      this.interrupt();
    }

    if (this.state !== 'SUBMITTING' && this.state !== 'THINKING') {
      this.setState('USER_SPEAKING');
    }
  }

  private handleSpeechEnd(): void {
    if (!this.isVoiceModeActive) return;

    if (this.state === 'USER_SPEAKING' && this.currentTranscript.trim()) {
      this.handleFinalTranscript(this.currentTranscript);
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
        // If no speech is queued or playing, go back to listening
        if (!audioQueue.isPlaying() && this.isVoiceModeActive) {
          this.setState('LISTENING');
        }
      }
    }, 200);
  }

  public feedAIStreamChunk(chunkText: string): void {
    if (!this.isVoiceModeActive) return;
    this.chunker.feed(chunkText);
  }

  public finalizeAIResponse(fullText?: string): void {
    if (!this.isVoiceModeActive) return;
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
