import { STTEvent } from './types';
import { micManager } from './microphoneManager';
import { bobAi } from '../aiEngine';
import { localVoiceManager } from './localVoiceManager';
import { pcmRecorder } from './pcmRecorder';

export interface STTProvider {
  start: (onTranscript: (event: STTEvent) => void, onError: (err: string) => void) => Promise<void>;
  stop: () => void;
  isListening: () => boolean;
  flush: () => Promise<string>;
}

export class DualEngineSTTProvider implements STTProvider {
  private recognition: any = null;
  private active = false;
  private fullTranscript = '';
  private onTranscriptCallback?: (event: STTEvent) => void;
  private onErrorCallback?: (err: string) => void;
  private isProcessingChunk = false;
  private lastTranscribedTurn = '';

  constructor() {
    this.initWebSpeech();
  }

  private initWebSpeech() {
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
          console.warn('[DualEngineSTT] SpeechRecognition initialization warning:', e);
        }
      }
    }
  }

  public async start(
    onTranscript: (event: STTEvent) => void,
    onError: (err: string) => void
  ): Promise<void> {
    if (this.active) return;

    this.active = true;
    this.fullTranscript = '';
    this.lastTranscribedTurn = '';
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;

    const stream = micManager.getStream();
    if (stream) {
      // Start pristine 16kHz PCM audio recording buffer
      pcmRecorder.start(stream);
    }

    // 1. Try browser WebSpeech first for real-time zero-latency streaming
    if (this.recognition) {
      try {
        this.setupRecognitionListeners();
        this.recognition.start();
      } catch (err: any) {
        console.warn('[DualEngineSTT] WebSpeech start warning:', err?.message);
      }
    }
  }

  private setupRecognitionListeners() {
    if (!this.recognition) return;

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

      if (final.trim()) {
        const trimmed = final.trim();
        if (!this.fullTranscript.endsWith(trimmed)) {
          this.fullTranscript += (this.fullTranscript ? ' ' : '') + trimmed;
        }
        this.lastTranscribedTurn = this.fullTranscript;
        this.onTranscriptCallback?.({ transcript: this.fullTranscript, isFinal: true });
        // Reset PCM turn since speech recognition captured it accurately
        pcmRecorder.resetTurn();
      } else if (interim.trim()) {
        const live = this.fullTranscript ? `${this.fullTranscript} ${interim.trim()}` : interim.trim();
        this.onTranscriptCallback?.({ transcript: live, isFinal: false });
      }
    };

    this.recognition.onerror = (e: any) => {
      const error = e.error || '';
      if (error === 'no-speech' || error === 'aborted') {
        return; // Standard pauses between words
      }

      console.warn('[DualEngineSTT] WebSpeech error:', error);
      if (error === 'not-allowed') {
        this.onErrorCallback?.('Microphone access was denied. Please allow microphone permissions.');
      }
      // On 'network' or other WebSpeech browser errors, we do NOT crash.
      // The PCM recorder + Gemini / Local Whisper fallback takes over seamlessly!
    };

    this.recognition.onend = () => {
      // If still active, attempt polite restart with backoff
      if (this.active) {
        setTimeout(() => {
          if (this.active && this.recognition) {
            try {
              this.recognition.start();
            } catch {}
          }
        }, 150);
      }
    };
  }

  /**
   * Called by VAD on speech pause to finalize this turn immediately.
   * If WebSpeech already captured the text, returns it instantly.
   * If WebSpeech was silent or missed the phrase, dispatches to Gemini or Local Whisper.
   */
  public async flush(): Promise<string> {
    if (!this.active || this.isProcessingChunk) {
      return this.fullTranscript;
    }

    // If WebSpeech already yielded transcript for this turn, return it directly
    if (this.fullTranscript.trim() && this.fullTranscript === this.lastTranscribedTurn) {
      pcmRecorder.resetTurn();
      return this.fullTranscript;
    }

    const recorded = pcmRecorder.getRecordedAudio();
    if (!recorded || recorded.durationMs < 350 || recorded.samples.length < 4000) {
      return this.fullTranscript;
    }

    this.isProcessingChunk = true;
    try {
      const fallbackText = await this.transcribeAudioFallback(recorded.blob, recorded.samples);
      if (fallbackText && fallbackText.trim()) {
        const clean = fallbackText.trim();
        if (!this.fullTranscript.includes(clean)) {
          this.fullTranscript += (this.fullTranscript ? ' ' : '') + clean;
          this.lastTranscribedTurn = this.fullTranscript;
          this.onTranscriptCallback?.({ transcript: this.fullTranscript, isFinal: true });
        }
      }
    } catch (e: any) {
      console.warn('[DualEngineSTT] Fallback transcription warning:', e);
    } finally {
      this.isProcessingChunk = false;
      pcmRecorder.resetTurn();
    }

    return this.fullTranscript;
  }

  /**
   * Safe Multi-Tier Fallback Engine:
   * Tier 1: Real-time WebSpeech (zero latency, zero RAM)
   * Tier 2: Cloud Gemini ('gemini-3.5-transcribe' or 'gemini-flash-latest') via 16kHz WAV
   * Tier 3: Local Whisper-tiny on-device execution (direct 16kHz PCM Float32Array)
   * Tier 4: Graceful degradation (never throw or block user conversation)
   */
  public async transcribeAudioFallback(wavBlob: Blob, samples: Float32Array): Promise<string> {
    // 1. Try Local Whisper if model is already active in memory for instant offline results
    if (localVoiceManager.isReady()) {
      try {
        const localText = await localVoiceManager.transcribeSamples(samples);
        if (localText) return localText;
      } catch (err) {
        console.warn('[DualEngineSTT] Local model fallback to cloud:', err);
      }
    }

    // 2. Try Google Gemini Multimodal Audio API
    const geminiKey = bobAi.getGeminiKey();
    if (geminiKey) {
      try {
        const base64Wav = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = (reader.result as string || '').split(',')[1] || '';
            resolve(res);
          };
          reader.onerror = reject;
          reader.readAsDataURL(wavBlob);
        });

        // Use official Gemini transcription models
        const candidateModels = ['gemini-3.5-transcribe', 'gemini-flash-latest', 'gemini-3.8-flash'];
        for (const model of candidateModels) {
          try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: 'Transcribe this spoken audio verbatim into plain text. Return ONLY the transcribed words with no commentary.' },
                      {
                        inlineData: {
                          mimeType: 'audio/wav',
                          data: base64Wav,
                        },
                      },
                    ],
                  },
                ],
              }),
            });

            if (res.ok) {
              const data = await res.json();
              const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (candidateText.trim()) {
                return candidateText.trim();
              }
            } else if (res.status === 429) {
              console.warn('[DualEngineSTT] Gemini quota hit (429). Falling back to local offline model.');
              break;
            }
          } catch (modelErr) {
            console.warn(`[DualEngineSTT] Model ${model} request error:`, modelErr);
          }
        }
      } catch (cloudErr: any) {
        console.warn('[DualEngineSTT] Gemini cloud audio transcription failed:', cloudErr);
      }
    }

    // 3. Fallback to Local Whisper if ready or can transcribe
    if (localVoiceManager.isReady()) {
      try {
        return await localVoiceManager.transcribeSamples(samples);
      } catch {}
    }

    return '';
  }

  public stop(): void {
    this.active = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }

    pcmRecorder.stop();
    this.isProcessingChunk = false;
  }

  public isListening(): boolean {
    return this.active;
  }
}

export const stt = new DualEngineSTTProvider();
