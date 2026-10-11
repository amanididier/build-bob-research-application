/**
 * VoiceUsageService
 * 
 * Tracks real observed usage, active provider status, and quota diagnostics
 * for the Gemini-first platform without storing raw microphone audio or private prompts.
 */

export interface VoiceUsageSnapshot {
  provider: string;
  activeModel: string;
  isAvailable: boolean;
  totalGeminiRequests: number;
  successfulOperations: number;
  failedOperations: number;
  liveCallsCount: number;
  dictationCount: number;
  totalCallDurationSeconds: number;
  lastActiveSessionTime: number | null;
  lastError: {
    message: string;
    timestamp: number;
    code?: string;
  } | null;
}

const STORAGE_KEY = 'bob_voice_usage_v1';

class VoiceUsageService {
  private static instance: VoiceUsageService | null = null;
  private currentCallStartTime: number | null = null;
  private listeners: Set<(snapshot: VoiceUsageSnapshot) => void> = new Set();

  private snapshot: VoiceUsageSnapshot = {
    provider: 'Gemini Multimodal Live',
    activeModel: 'models/gemini-2.0-flash-exp',
    isAvailable: true,
    totalGeminiRequests: 0,
    successfulOperations: 0,
    failedOperations: 0,
    liveCallsCount: 0,
    dictationCount: 0,
    totalCallDurationSeconds: 0,
    lastActiveSessionTime: null,
    lastError: null,
  };

  private constructor() {
    this.loadPersistedUsage();
  }

  public static getInstance(): VoiceUsageService {
    if (!VoiceUsageService.instance) {
      VoiceUsageService.instance = new VoiceUsageService();
    }
    return VoiceUsageService.instance;
  }

  private loadPersistedUsage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.snapshot = {
          ...this.snapshot,
          totalGeminiRequests: parsed.totalGeminiRequests || 0,
          successfulOperations: parsed.successfulOperations || 0,
          failedOperations: parsed.failedOperations || 0,
          liveCallsCount: parsed.liveCallsCount || 0,
          dictationCount: parsed.dictationCount || 0,
          totalCallDurationSeconds: parsed.totalCallDurationSeconds || 0,
          lastActiveSessionTime: parsed.lastActiveSessionTime || null,
        };
      }
    } catch {}
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        totalGeminiRequests: this.snapshot.totalGeminiRequests,
        successfulOperations: this.snapshot.successfulOperations,
        failedOperations: this.snapshot.failedOperations,
        liveCallsCount: this.snapshot.liveCallsCount,
        dictationCount: this.snapshot.dictationCount,
        totalCallDurationSeconds: this.snapshot.totalCallDurationSeconds,
        lastActiveSessionTime: this.snapshot.lastActiveSessionTime,
      }));
    } catch {}
    this.emit();
  }

  private emit(): void {
    const copy = { ...this.snapshot };
    this.listeners.forEach((l) => l(copy));
  }

  public subscribe(listener: (snapshot: VoiceUsageSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.snapshot });
    return () => this.listeners.delete(listener);
  }

  public getSnapshot(): VoiceUsageSnapshot {
    return { ...this.snapshot };
  }

  public setProvider(provider: string, model: string, available: boolean = true): void {
    this.snapshot.provider = provider;
    this.snapshot.activeModel = model;
    this.snapshot.isAvailable = available;
    this.emit();
  }

  public recordLiveCallStart(): void {
    this.currentCallStartTime = Date.now();
    this.snapshot.totalGeminiRequests += 1;
    this.snapshot.liveCallsCount += 1;
    this.snapshot.lastActiveSessionTime = Date.now();
    this.save();
  }

  public recordLiveCallEnd(): void {
    if (this.currentCallStartTime) {
      const durationSeconds = Math.round((Date.now() - this.currentCallStartTime) / 1000);
      this.snapshot.totalCallDurationSeconds += Math.max(1, durationSeconds);
      this.snapshot.successfulOperations += 1;
      this.currentCallStartTime = null;
      this.save();
    }
  }

  public recordDictation(success: boolean): void {
    this.snapshot.totalGeminiRequests += 1;
    this.snapshot.dictationCount += 1;
    this.snapshot.lastActiveSessionTime = Date.now();
    if (success) {
      this.snapshot.successfulOperations += 1;
    } else {
      this.snapshot.failedOperations += 1;
    }
    this.save();
  }

  public recordError(message: string, code?: string): void {
    this.snapshot.failedOperations += 1;
    this.snapshot.lastError = {
      message,
      timestamp: Date.now(),
      code,
    };
    if (code === 'QUOTA_EXHAUSTED' || message.includes('quota') || message.includes('429')) {
      this.snapshot.isAvailable = false;
    }
    this.save();
  }

  public clearError(): void {
    this.snapshot.lastError = null;
    this.snapshot.isAvailable = true;
    this.emit();
  }
}

export const voiceUsageService = VoiceUsageService.getInstance();
