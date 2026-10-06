import { DEFAULT_VOICE_CONFIG } from './voiceConfig';
import type { VoiceMode } from './types';

export interface VADCallbacks {
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onEnergyChange?: (energy: number) => void;
}

export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private rafId: number | null = null;
  private isSpeaking = false;
  private speechStartTime = 0;
  private lastSpeechTime = 0;
  private silenceTimer: any = null;
  private isRunning = false;

  public start(stream: MediaStream, callbacks: VADCallbacks, mode: VoiceMode = 'call'): void {
    if (this.isRunning) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.2;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);

      this.isRunning = true;
      const buffer = new Uint8Array(this.analyser.frequencyBinCount);

      const loop = () => {
        if (!this.isRunning || !this.analyser) return;

        this.analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const energy = sum / buffer.length; // 0 to 255
        callbacks.onEnergyChange?.(energy);

        const now = Date.now();
        const threshold = DEFAULT_VOICE_CONFIG.speechStartThreshold;

        if (energy > threshold) {
          if (!this.isSpeaking) {
            this.isSpeaking = true;
            this.speechStartTime = now;
            callbacks.onSpeechStart();
          }
          this.lastSpeechTime = now;
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
        } else if (this.isSpeaking) {
          // In silence window
          const speechDuration = now - this.speechStartTime;
          if (!this.silenceTimer && speechDuration >= DEFAULT_VOICE_CONFIG.minimumSpeechDurationMs) {
            this.silenceTimer = setTimeout(() => {
              if (this.isSpeaking) {
                this.isSpeaking = false;
                callbacks.onSpeechEnd();
              }
              this.silenceTimer = null;
            }, mode === 'prompt' ? DEFAULT_VOICE_CONFIG.promptSilenceDurationMs : DEFAULT_VOICE_CONFIG.callSilenceDurationMs);
          }
        }

        this.rafId = requestAnimationFrame(loop);
      };

      this.rafId = requestAnimationFrame(loop);
    } catch (err) {
      console.warn('VAD initialization failed:', err);
    }
  }

  public stop(): void {
    this.isRunning = false;
    this.isSpeaking = false;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {}
      this.analyser = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
  }
}

export const vad = new VoiceActivityDetector();
