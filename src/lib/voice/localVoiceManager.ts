// Bob Local Voice Model Manager
// v1.0.60: Whisper downloads are DISABLED so ordinary dictation/call use Gemini only.
// The downloadModel / ensureReady paths are no-ops. Re-enable by restoring the
// previous pipeline implementation when you want local STT again.

export interface ModelDownloadProgress {
  status: 'idle' | 'downloading' | 'ready' | 'error';
  progress: number;
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
  private selectedModel: 'whisper-tiny' | 'moonshine-tiny' = 'whisper-tiny';

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

  public isReady(): boolean {
    return false; // disabled in v1.0.60
  }

  public getSelectedModel(): 'whisper-tiny' | 'moonshine-tiny' {
    return this.selectedModel;
  }

  public setSelectedModel(model: 'whisper-tiny' | 'moonshine-tiny'): void {
    this.selectedModel = model;
  }

  public isModelInstalled(_model?: string): boolean {
    return false; // disabled in v1.0.60
  }

  public async ensureReady(): Promise<boolean> {
    return false;
  }

  /**
   * No-op in v1.0.60 — Whisper is not downloaded.
   */
  public async downloadModel(_silent = false): Promise<boolean> {
    this.emit({
      status: 'idle',
      progress: 0,
      fileName: 'Local Whisper disabled for Gemini-only release (v1.0.60)'
    });
    return false;
  }

  public async transcribeSamples(_samples: Float32Array): Promise<string> {
    return '';
  }

  public async transcribe(_blob: Blob): Promise<string> {
    return '';
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
