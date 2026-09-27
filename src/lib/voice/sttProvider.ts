import { STTEvent } from './types';

export interface STTProvider {
  start: (onTranscript: (event: STTEvent) => void, onError: (err: string) => void) => Promise<void>;
  stop: () => void;
  isListening: () => boolean;
}

export class WebSpeechSTTProvider implements STTProvider {
  private recognition: any = null;
  private active = false;
  private lastFinalTranscript = '';

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.maxAlternatives = 1;
          this.recognition.lang = navigator.language || 'en-US';
        } catch (e) {
          console.warn('SpeechRecognition initialization error:', e);
        }
      }
    }
  }

  public async start(
    onTranscript: (event: STTEvent) => void,
    onError: (err: string) => void
  ): Promise<void> {
    if (!this.recognition) {
      onError('Speech recognition is not supported in this browser.');
      return;
    }

    if (this.active) return;

    this.lastFinalTranscript = '';

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      if (final.trim() && final.trim() !== this.lastFinalTranscript) {
        this.lastFinalTranscript = final.trim();
        onTranscript({ transcript: final.trim(), isFinal: true });
      } else if (interim.trim()) {
        onTranscript({ transcript: interim.trim(), isFinal: false });
      }
    };

    this.recognition.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') {
        return; // Normal idle
      }
      onError(e.error || 'Speech recognition error');
    };

    this.recognition.onend = () => {
      // If still marked active (e.g. continuous listening mode), restart smoothly
      if (this.active) {
        try {
          this.recognition.start();
        } catch {}
      }
    };

    try {
      this.recognition.start();
      this.active = true;
    } catch (err: any) {
      this.active = false;
      onError(err?.message || 'Failed to start speech recognition');
    }
  }

  public stop(): void {
    this.active = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
  }

  public isListening(): boolean {
    return this.active;
  }
}

export const stt = new WebSpeechSTTProvider();
