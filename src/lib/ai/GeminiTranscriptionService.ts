/**
 * GeminiTranscriptionService
 * 
 * Provides cloud Gemini-powered Speech-to-Text dictation without requiring
 * local Whisper model downloads or quantized on-device inference caches.
 * Uses dedicated audio transcription model gemini-3.5-transcribe with ultra-fast
 * fallback to gemini-3.1-flash-lite and gemini-3.8-flash.
 */

import { GoogleGenAI } from '@google/genai';
import { resolveGeminiApiKey } from './keyManager';
import { voiceUsageService } from '../voice/voiceUsageService';
import { voiceDiagnostics } from '../voice/diagnostics';

const TRANSCRIBE_MODELS = [
  'gemini-3.5-transcribe',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash'
];

export class GeminiTranscriptionService {
  private static instance: GeminiTranscriptionService | null = null;
  private isTranscribing = false;

  public static getInstance(): GeminiTranscriptionService {
    if (!GeminiTranscriptionService.instance) {
      GeminiTranscriptionService.instance = new GeminiTranscriptionService();
    }
    return GeminiTranscriptionService.instance;
  }

  public isBusy(): boolean {
    return this.isTranscribing;
  }

  /**
   * Transcribes raw Float32Array audio samples by converting them to a standard 16kHz WAV in memory.
   */
  public async transcribeSamples(
    samples: Float32Array,
    sampleRate: number = 16000
  ): Promise<{ text: string; error?: string }> {
    if (!samples || samples.length === 0) {
      return { text: '' };
    }
    const base64Wav = this.samplesToWavBase64(samples, sampleRate);
    return this.transcribeBase64(base64Wav, 'audio/wav');
  }

  /**
   * Transcribes an audio blob using the user's Gemini key
   */
  public async transcribeAudio(
    audioBlob: Blob,
    mimeType: string = 'audio/wav'
  ): Promise<{ text: string; error?: string }> {
    if (!audioBlob || audioBlob.size === 0) {
      return { text: '' };
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = this.arrayBufferToBase64(arrayBuffer);
      const effectiveMime = audioBlob.type || mimeType || 'audio/wav';
      return this.transcribeBase64(base64Audio, effectiveMime);
    } catch (err: any) {
      return { text: '', error: err?.message || 'Failed to read audio blob' };
    }
  }

  /**
   * Internal core transcription with model failover and strict timeout
   */
  private async transcribeBase64(
    base64Audio: string,
    mimeType: string
  ): Promise<{ text: string; error?: string }> {
    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      const err = 'Gemini API key required for voice dictation. Add your key in Settings.';
      voiceUsageService.recordError(err, 'MISSING_KEY');
      return { text: '', error: err };
    }

    this.isTranscribing = true;
    voiceDiagnostics.set({ stt: 'transcribing via Gemini', stage: 'stt' });

    let lastError = '';

    for (const model of TRANSCRIBE_MODELS) {
      try {
        const text = await this.executeTranscriptionCall(apiKey, model, base64Audio, mimeType);
        this.isTranscribing = false;
        voiceDiagnostics.set({ stt: `transcription complete (${model})`, stage: 'transcript' });
        voiceUsageService.recordDictation(true);
        return { text };
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.warn(`[GeminiTranscriptionService] Model ${model} failed, trying fallback:`, lastError);
      }
    }

    this.isTranscribing = false;
    voiceDiagnostics.set({ stt: 'error', stage: 'error' });
    voiceUsageService.recordError(lastError, 'GEMINI_STT_ERROR');
    return { text: '', error: lastError || 'Transcription failed. Check your network or API key.' };
  }

  private async executeTranscriptionCall(
    apiKey: string,
    model: string,
    base64Audio: string,
    mimeType: string
  ): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Transcription timed out after 10s')), 10000);
    });

    const callPromise = (async () => {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Audio,
                },
              },
              {
                text: 'Transcribe this user speech audio verbatim into plain text. Output ONLY the transcribed words with natural punctuation, without any quotation marks, explanations, notes, or conversational preamble.',
              },
            ],
          },
        ],
      });

      return response?.text?.trim() || '';
    })();

    return Promise.race([callPromise, timeoutPromise]);
  }

  private samplesToWavBase64(samples: Float32Array, sampleRate: number): string {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');

    // fmt subchunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // 16-bit

    // data subchunk
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return this.arrayBufferToBase64(buffer);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    const chunkSize = 0x8000;
    for (let i = 0; i < len; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)) as any);
    }
    return btoa(binary);
  }
}

export const geminiTranscriptionService = GeminiTranscriptionService.getInstance();
