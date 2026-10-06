export class MicrophoneManager {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isCapturing = false;

  public async requestPermission(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release test stream immediately
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err);
      return false;
    }
  }

  public async startCapture(): Promise<MediaStream> {
    if (this.isCapturing && this.mediaStream) {
      return this.mediaStream;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Audio media devices not supported in this environment');
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 256;
          this.analyser.smoothingTimeConstant = 0.5;
          this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
          this.sourceNode.connect(this.analyser);
        }
      } catch (audioErr) {
        console.warn('AudioContext setup error:', audioErr);
      }

      this.isCapturing = true;
      return this.mediaStream;
    } catch (err: any) {
      this.isCapturing = false;
      throw new Error(err?.message || 'Failed to access microphone');
    }
  }

  public getStream(): MediaStream | null {
    return this.mediaStream;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public stopCapture(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
    this.analyser = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.isCapturing = false;
  }

  public isActive(): boolean {
    return this.isCapturing;
  }

  /** Real mute: disables the captured audio tracks (no fake UI-only state). */
  public setMuted(muted: boolean): void {
    if (!this.mediaStream) return;
    this.mediaStream.getAudioTracks().forEach((track) => {
      try {
        track.enabled = !muted;
      } catch {}
    });
  }
}

export const micManager = new MicrophoneManager();
