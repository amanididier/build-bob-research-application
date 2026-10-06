import { AudioChunk } from './types';
import { tts } from './ttsProvider';
import { voiceDiagnostics } from './diagnostics';

export class AudioQueue {
  private queue: AudioChunk[] = [];
  private isProcessing = false;
  private currentGenerationId = 1;
  private playbackListeners: Set<(isPlaying: boolean) => void> = new Set();
  private errorListeners: Set<(message: string) => void> = new Set();
  private engineListeners: Set<(engine: string) => void> = new Set();

  public setPlaybackStateListener(listener: (isPlaying: boolean) => void): void {
    this.playbackListeners.add(listener);
  }

  public addPlaybackStateListener(listener: (isPlaying: boolean) => void): () => void {
    this.playbackListeners.add(listener);
    return () => {
      this.playbackListeners.delete(listener);
    };
  }

  public addErrorListener(listener: (message: string) => void): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  public addEngineListener(listener: (engine: string) => void): () => void {
    this.engineListeners.add(listener);
    return () => {
      this.engineListeners.delete(listener);
    };
  }

  private notifyPlayback(isPlaying: boolean): void {
    this.playbackListeners.forEach((l) => l(isPlaying));
  }

  private notifyError(message: string): void {
    this.errorListeners.forEach((l) => l(message));
  }

  public getGenerationId(): number {
    return this.currentGenerationId;
  }

  public newGeneration(): number {
    this.currentGenerationId += 1;
    this.clear();
    return this.currentGenerationId;
  }

  public enqueue(text: string, generationId: number): void {
    // Drop if from a stale generation
    if (generationId !== this.currentGenerationId) return;

    const chunk: AudioChunk = {
      id: `chunk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      generationId,
      text,
    };

    this.queue.push(chunk);
    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    this.notifyPlayback(true);
    voiceDiagnostics.set({ audio: 'queued' });

    // Prefetch the next chunk's audio so sentences play back-to-back.
    let prefetch: { id: string; promise: Promise<string | null> } | null = null;

    while (this.queue.length > 0) {
      const nextChunk = this.queue.shift();
      if (!nextChunk) break;

      // Stale check before synthesis — never synthesize text that will not play.
      if (nextChunk.generationId !== this.currentGenerationId) continue;

      const upcoming = this.queue.find((c) => c.generationId === this.currentGenerationId);
      if (upcoming && (!prefetch || prefetch.id !== upcoming.id)) {
        const generationAtRequest = this.currentGenerationId;
        prefetch = {
          id: upcoming.id,
          promise: tts.prepare(upcoming.text).then((url) => {
            if (generationAtRequest !== this.currentGenerationId) {
              if (url) URL.revokeObjectURL(url);
              return null;
            }
            return url;
          }),
        };
      }

      const preparedUrl = prefetch && prefetch.id === nextChunk.id ? await prefetch.promise : null;

      // STOP always wins: if the generation changed, nothing more may play.
      if (nextChunk.generationId !== this.currentGenerationId) {
        if (preparedUrl) URL.revokeObjectURL(preparedUrl);
        break;
      }

      const handlers = {
        onStart: () => {
          if (nextChunk.generationId === this.currentGenerationId) this.notifyPlayback(true);
        },
        onEnd: () => {},
        onError: (err: { message: string }) => {
          if (nextChunk.generationId !== this.currentGenerationId) return;
          this.notifyError(err.message);
        },
        onEngine: (engine: string) => {
          this.engineListeners.forEach((l) => l(engine));
        },
      };

      voiceDiagnostics.stage('tts', preparedUrl ? 'Playing pre-synthesized chunk' : 'Synthesizing chunk');
      if (preparedUrl) await tts.speakPrepared(preparedUrl, handlers);
      else await tts.speak(nextChunk.text, handlers);

      if (nextChunk.generationId !== this.currentGenerationId) break;
    }

    this.isProcessing = false;
    voiceDiagnostics.set({ audio: 'idle' });
    this.notifyPlayback(false);
  }

  public interrupt(): void {
    this.newGeneration();
    tts.stop();
    this.isProcessing = false;
    voiceDiagnostics.set({ audio: 'idle' });
    this.notifyPlayback(false);
  }

  public clear(): void {
    this.queue = [];
  }

  public isPlaying(): boolean {
    return this.isProcessing || tts.isSpeaking();
  }
}

export const audioQueue = new AudioQueue();
