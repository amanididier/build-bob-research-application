import { AudioChunk } from './types';
import { tts } from './ttsProvider';

export class AudioQueue {
  private queue: AudioChunk[] = [];
  private isProcessing = false;
  private currentGenerationId = 1;
  private onPlaybackStateChange?: (isPlaying: boolean) => void;

  public setPlaybackStateListener(listener: (isPlaying: boolean) => void): void {
    this.onPlaybackStateChange = listener;
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
    // Drop if from stale generation
    if (generationId !== this.currentGenerationId) {
      return;
    }

    const chunk: AudioChunk = {
      id: `chunk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      generationId,
      text,
    };

    this.queue.push(chunk);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    this.onPlaybackStateChange?.(true);

    while (this.queue.length > 0) {
      const nextChunk = this.queue.shift();
      if (!nextChunk) break;

      // Stale check
      if (nextChunk.generationId !== this.currentGenerationId) {
        continue;
      }

      await tts.speak(nextChunk.text, {
        onStart: () => {
          this.onPlaybackStateChange?.(true);
        },
        onEnd: () => {},
        onError: () => {},
      });

      // After speak finishes, check if generation changed
      if (nextChunk.generationId !== this.currentGenerationId) {
        break;
      }
    }

    this.isProcessing = false;
    this.onPlaybackStateChange?.(false);
  }

  public interrupt(): void {
    this.newGeneration();
    tts.stop();
    this.isProcessing = false;
    this.onPlaybackStateChange?.(false);
  }

  public clear(): void {
    this.queue = [];
  }

  public isPlaying(): boolean {
    return this.isProcessing || tts.isSpeaking();
  }
}

export const audioQueue = new AudioQueue();
