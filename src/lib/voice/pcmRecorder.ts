// Bob High-Fidelity 16kHz PCM & WAV Audio Recorder
// Captures pristine, uncompressed 16kHz mono audio directly from Web Audio API.
// Eliminates WebM container corruption, EBML header loss, and decoding crashes.

export interface RecordedAudioData {
  blob: Blob;
  samples: Float32Array;
  durationMs: number;
}

export class PcmAudioRecorder {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private samplesBuffer: Float32Array[] = [];
  private totalSampleCount = 0;
  private isRecording = false;
  private targetSampleRate = 16000;
  private startTime = 0;

  public start(stream: MediaStream): void {
    if (this.isRecording) return;

    this.samplesBuffer = [];
    this.totalSampleCount = 0;
    this.isRecording = true;
    this.startTime = Date.now();

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const inputSampleRate = this.audioContext.sampleRate;
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Use 4096 buffer size for stable real-time capture
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (event) => {
        if (!this.isRecording) return;

        const inputChannel = event.inputBuffer.getChannelData(0);
        // Downsample input to target 16kHz if needed
        const resampled = this.downsampleTo16k(inputChannel, inputSampleRate, this.targetSampleRate);
        if (resampled && resampled.length > 0) {
          this.samplesBuffer.push(new Float32Array(resampled));
          this.totalSampleCount += resampled.length;
        }
      };

      this.sourceNode.connect(this.processorNode);
      // Connect to destination via silent gain to keep audio processing alive in Chrome/WebKit
      const zeroGain = this.audioContext.createGain();
      zeroGain.gain.value = 0;
      this.processorNode.connect(zeroGain);
      zeroGain.connect(this.audioContext.destination);
    } catch (err) {
      console.warn('[PcmAudioRecorder] Setup warning:', err);
    }
  }

  private downsampleTo16k(
    buffer: Float32Array,
    inputRate: number,
    targetRate: number
  ): Float32Array {
    if (inputRate === targetRate) {
      return buffer;
    }
    const ratio = inputRate / targetRate;
    const targetLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(targetLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : buffer[offsetBuffer] || 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  }

  public getRecordedAudio(): RecordedAudioData | null {
    if (this.totalSampleCount === 0 || this.samplesBuffer.length === 0) {
      return null;
    }

    // Merge chunks into a single Float32Array
    const merged = new Float32Array(this.totalSampleCount);
    let offset = 0;
    for (const chunk of this.samplesBuffer) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const durationMs = Math.round((this.totalSampleCount / this.targetSampleRate) * 1000);
    const wavBlob = this.encodeWav(merged, this.targetSampleRate);

    return {
      blob: wavBlob,
      samples: merged,
      durationMs,
    };
  }

  public resetTurn(): void {
    this.samplesBuffer = [];
    this.totalSampleCount = 0;
    this.startTime = Date.now();
  }

  public stop(): RecordedAudioData | null {
    this.isRecording = false;
    const result = this.getRecordedAudio();

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch {}
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.samplesBuffer = [];
    this.totalSampleCount = 0;
    return result;
  }

  private encodeWav(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');

    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, 1, true); // NumChannels (1 = Mono)
    view.setUint32(24, sampleRate, true); // SampleRate (16000)
    view.setUint32(28, sampleRate * 2, true); // ByteRate (sampleRate * 1 * 16/8)
    view.setUint16(32, 2, true); // BlockAlign (1 * 16/8)
    view.setUint16(34, 16, true); // BitsPerSample (16-bit)

    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Convert Float32 to 16-bit signed PCM
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }
}

export const pcmRecorder = new PcmAudioRecorder();
