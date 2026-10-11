/**
 * GeminiTranscriptionService
 *
 * Cloud Gemini-powered Speech-to-Text for Prompt dictation.
 * No local Whisper downloads required.
 */

import { GoogleGenAI } from '@google/genai';
import { resolveGeminiApiKey } from './keyManager';
import { voiceUsageService } from '../voice/voiceUsageService';
import { voiceDiagnostics } from '../voice/diagnostics';

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

  public async transcribeAudio(
    audioBlob: Blob,
    mimeType: string = 'audio/webm'
  ): Promise<{ text: string; error?: string }> {
    const apiKey = resolveGeminiApiKey();
    if (!apiKey) {
      const err = 'Gemini API key required for dictation. Add your key in Settings.';
      voiceUsageService.recordError(err, 'MISSING_KEY');
      return { text: '', error: err };
    }

    this.isTranscribing = true;
    voiceDiagnostics.set({ stt: 'transcribing via Gemini', stage: 'stt' });

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = this.arrayBufferToBase64(arrayBuffer);

      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: audioBlob.type || mimeType || 'audio/webm',
                  data: base64Audio,
                },
              },
              {
                text: 'Transcribe this user audio verbatim into text. Return ONLY the exact transcribed words spoken, with no markdown quotes, preamble, or conversational comments.',
              },
            ],
          },
        ],
      });

      const transcript = (response as any)?.text?.trim?.() || '';
      this.isTranscribing = false;
      voiceDiagnostics.set({ stt: 'transcription complete', stage: 'transcript' });
      voiceUsageService.recordDictation(true);
      return { text: transcript };
    } catch (err: any) {
      this.isTranscribing = false;
      const errorMsg = err?.message || 'Gemini transcription request failed';
      const isQuota =
        /quota|rate.?limit|429|resource.?exhausted/i.test(errorMsg);
      voiceDiagnostics.set({ stt: 'error', stage: 'error' });
      voiceUsageService.recordError(
        errorMsg,
        isQuota ? 'QUOTA_EXHAUSTED' : 'GEMINI_STT_ERROR'
      );
      voiceUsageService.recordDictation(false);
      return { text: '', error: errorMsg };
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    const chunkSize = 0x8000;
    for (let i = 0; i < len; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunkSize)) as any
      );
    }
    return btoa(binary);
  }
}

export const geminiTranscriptionService = GeminiTranscriptionService.getInstance();
