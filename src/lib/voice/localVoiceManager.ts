// Bob Local Voice Model Manager
// Provides 100% free, on-device, offline-capable Speech-to-Text via @huggingface/transformers
// Features: direct 16kHz PCM Float32 execution (zero audio decoding overhead),
// real-time download progress tracking, and crash-proof fallback.

export interface ModelDownloadProgress {
  status: 'idle' | 'downloading' | 'ready' | 'error';
  progress: number; // 0 to 100
  bytesLoaded: number;
  bytesTotal: number;
  fileName: string;
  error?: string;
}

type ProgressListener = (status: ModelDownloadProgress) => void;

class LocalVoiceManager {
  private transcriber: any = null;
  private isDownloading = false;
  private listeners: Set<ProgressListener> = new Set();
  private currentProgress: ModelDownloadProgress = {
    status: 'idle',
    progress: 0,
    bytesLoaded: 0,
    bytesTotal: 0,
    fileName: ''
  };

  constructor() {
    this.checkIfAlreadyInstalled();
  }

  private checkIfAlreadyInstalled() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bob_local_whisper_ready');
      if (saved === 'true') {
        // Model was previously downloaded into cache; trigger background warmup
        this.warmupIfCached();
      }
    }
  }

  private async warmupIfCached() {
    if (this.transcriber || this.isDownloading) return;
    try {
      // Quiet background load from browser cache
      await this.downloadModel(true);
    } catch {
      // Keep silent on warmup; fallback tiers will handle speech
    }
  }

  public subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    listener(this.currentProgress);
    return () => this.listeners.delete(listener);
  }

  private emit(progress: Partial<ModelDownloadProgress>) {
    this.currentProgress = { ...this.currentProgress, ...progress };
    this.listeners.forEach((fn) => fn(this.currentProgress));
  }

  public getStatus(): ModelDownloadProgress {
    return this.currentProgress;
  }

  /**
   * Only returns true if the model pipeline is actually compiled and ready in memory.
   */
  public isReady(): boolean {
    return Boolean(this.transcriber);
  }

  /**
   * Downloads and initializes the lightweight local voice model (~39 MB quantized Whisper-tiny)
   * Tracks download bytes, files, and percentage in real-time.
   */
  public async downloadModel(silent = false): Promise<boolean> {
    if (this.transcriber) {
      this.emit({ status: 'ready', progress: 100 });
      return true;
    }
    if (this.isDownloading) return false;

    this.isDownloading = true;
    if (!silent) {
      this.emit({
        status: 'downloading',
        progress: 0,
        bytesLoaded: 0,
        bytesTotal: 0,
        fileName: 'Initializing model files…'
      });
    }

    try {
      // Dynamic import to prevent bundler failure when building offline packages
      const { pipeline, env } = await import('@huggingface/transformers');
      if (typeof window !== 'undefined') {
        env.allowLocalModels = false;
        env.useBrowserCache = true;
      }

      const fileProgressMap = new Map<string, { loaded: number; total: number }>();

      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny.en',
        {
          dtype: 'q8',
          device: typeof navigator !== 'undefined' && (navigator as any).gpu ? 'webgpu' : 'wasm',
          progress_callback: (item: any) => {
            if (silent) return;

            if (item.status === 'progress' && item.file) {
              fileProgressMap.set(item.file, {
                loaded: item.loaded || 0,
                total: item.total || 0
              });

              let totalLoaded = 0;
              let totalBytes = 0;
              fileProgressMap.forEach((val) => {
                totalLoaded += val.loaded;
                totalBytes += val.total;
              });

              const percent = totalBytes > 0 ? Math.min(99, Math.round((totalLoaded / totalBytes) * 100)) : (item.progress || 0);

              this.emit({
                status: 'downloading',
                progress: percent,
                bytesLoaded: totalLoaded,
                bytesTotal: totalBytes,
                fileName: item.file.split('/').pop() || item.file
              });
            } else if (item.status === 'done' && !silent) {
              this.emit({
                fileName: `Loaded ${item.file.split('/').pop() || ''}`
              });
            }
          }
        }
      );

      this.isDownloading = false;
      this.emit({
        status: 'ready',
        progress: 100,
        fileName: 'Local Whisper Ready (100% Offline Active)'
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('bob_local_whisper_ready', 'true');
      }
      return true;
    } catch (err: any) {
      this.isDownloading = false;
      console.warn('[LocalVoiceManager] Model download error:', err);
      if (!silent) {
        this.emit({
          status: 'error',
          error: err?.message || 'Could not download model. Check network.'
        });
      }
      return false;
    }
  }

  /**
   * Directly transcribes a 16kHz Float32Array PCM buffer.
   * Completely bypasses browser AudioContext decoding errors.
   */
  public async transcribeSamples(samples: Float32Array): Promise<string> {
    if (!this.transcriber) {
      return '';
    }

    try {
      // Must have at least 0.25 seconds of audio (~4000 samples at 16kHz)
      if (samples.length < 4000) return '';

      const output = await this.transcriber(samples);
      const text = output?.text ? output.text.trim() : '';
      // Filter hallucinated whisper tokens like [BLANK_AUDIO] or (music)
      if (/^(\[|\().*(\]|\))$/.test(text)) {
        return '';
      }
      return text;
    } catch (e: any) {
      console.warn('[LocalVoiceManager] Sample transcription error:', e);
      return '';
    }
  }

  /**
   * Transcribes an audio blob using client-side Whisper
   */
  public async transcribe(blob: Blob): Promise<string> {
    if (!this.transcriber) {
      return '';
    }

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const rawAudio = audioBuffer.getChannelData(0);

      // Resample to 16kHz if needed
      let targetSamples = rawAudio;
      if (audioBuffer.sampleRate !== 16000) {
        const ratio = audioBuffer.sampleRate / 16000;
        const newLen = Math.round(rawAudio.length / ratio);
        const resampled = new Float32Array(newLen);
        for (let i = 0; i < newLen; i++) {
          resampled[i] = rawAudio[Math.floor(i * ratio)] || 0;
        }
        targetSamples = resampled;
      }

      await ctx.close();
      return await this.transcribeSamples(targetSamples);
    } catch (e: any) {
      console.warn('[LocalVoiceManager] Blob transcription error:', e);
      return '';
    }
  }

  public clearModel(): void {
    this.transcriber = null;
    this.currentProgress = {
      status: 'idle',
      progress: 0,
      bytesLoaded: 0,
      bytesTotal: 0,
      fileName: ''
    };
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bob_local_whisper_ready');
    }
    this.emit(this.currentProgress);
  }
}

export const localVoiceManager = new LocalVoiceManager();
