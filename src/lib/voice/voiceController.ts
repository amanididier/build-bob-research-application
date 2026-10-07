import { VoiceState, VoiceStateListener, VoiceMode } from './types';
import { DEFAULT_VOICE_CONFIG, SILENCE_TIMEOUT_MS, MAX_CALL_IDLE_MS, DEFAULT_VOICE_KEY } from './voiceConfig';
import { micManager } from './microphoneManager';
import { vad } from './vad';
import { stt, STTModelStatus } from './sttProvider';
import { audioQueue } from './audioQueue';
import { tts, TTSModelStatus } from './ttsProvider';
import { ResponseTextChunker } from './textChunker';
import { liveProvider } from './liveProvider';
import { voiceDiagnostics, classifyError } from './diagnostics';
import { bobAi } from '../aiEngine';

export type SpeechSource = 'call' | 'read-aloud';

export interface SpeakingInfo {
  speaking: boolean;
  source: SpeechSource | null;
  generation: number;
}

export interface VoiceHandlers {
  onTranscriptUpdate: (transcript: string, isFinal: boolean) => void;
  onSubmitMessage: (text: string) => Promise<void>;
  onVoiceExchange?: (userText: string, bobText: string) => void;
  onGetVoiceContext?: () => string;
}

const ERROR_AUTO_CLEAR_MS = 6000;

export class VoiceController {
  private state: VoiceState = 'IDLE';
  private listeners: Set<VoiceStateListener> = new Set();
  private energyListeners: Set<(energy: number) => void> = new Set();
  private speakingListeners: Set<(info: SpeakingInfo) => void> = new Set();
  private noticeListeners: Set<(message: string) => void> = new Set();

  private currentTranscript = '';
  private lastBobReply = '';
  private lastPersistedTurnId = -1;
  private turnUserText = '';
  private turnBobText = '';
  private isVoiceModeActive = false;
  private mode: VoiceMode = 'prompt';
  private handlers?: VoiceHandlers;

  private chunker: ResponseTextChunker;
  private readAloudChunker: ResponseTextChunker | null = null;
  private callGeneration = -1;
  private speakingSource: SpeechSource | null = null;
  private isSubmitting = false;
  private responseCancelled = false;
  private streamingReply = '';

  private idleTimer: any = null;
  private turnTimer: any = null;
  private errorTimer: any = null;
  private callIdleTimer: any = null;
  private transcriptReadyTimer: any = null;

  private sttUnsubscribe: (() => void) | null = null;

  constructor() {
    this.chunker = new ResponseTextChunker((chunk) => {
      audioQueue.enqueue(chunk, this.callGeneration);
    });

    audioQueue.setPlaybackStateListener((isPlaying) => this.handlePlaybackState(isPlaying));
    audioQueue.addErrorListener((message) => this.notify(message));

    this.sttUnsubscribe = stt.subscribe((status: STTModelStatus) => {
      if (status.state === 'downloading' || status.state === 'loading') {
        if (this.state !== 'LOADING_MODEL' && this.isVoiceModeActive) this.setState('LOADING_MODEL');
      } else if (status.state === 'ready') {
        if (this.state === 'LOADING_MODEL' && this.isVoiceModeActive) {
          this.notify('Local voice ready');
          voiceDiagnostics.event('Voice model downloaded successfully');
        }
      } else if (status.state === 'error') {
        this.failSoft(status.message);
      }
    });
  }

  // ---------------------------------------------------------------- listeners

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state, this.stateData());
    return () => this.listeners.delete(listener);
  }

  public addEnergyListener(listener: (energy: number) => void): () => void {
    this.energyListeners.add(listener);
    return () => this.energyListeners.delete(listener);
  }

  public addSpeakingListener(listener: (info: SpeakingInfo) => void): () => void {
    this.speakingListeners.add(listener);
    listener({ speaking: audioQueue.isPlaying(), source: this.speakingSource, generation: audioQueue.getGenerationId() });
    return () => this.speakingListeners.delete(listener);
  }

  public addNoticeListener(listener: (message: string) => void): () => void {
    this.noticeListeners.add(listener);
    return () => this.noticeListeners.delete(listener);
  }

  public registerHandlers(handlers: Partial<VoiceHandlers>): void {
    this.handlers = { ...(this.handlers || {}), ...handlers } as VoiceHandlers;
  }

  private stateData() {
    return {
      transcript: this.currentTranscript,
      aiReply: this.lastBobReply,
      mode: this.mode,
      provider: this.getProviderLabel(),
    };
  }

  private setState(newState: VoiceState, error?: string): void {
    this.state = newState;
    const data = this.stateData();
    this.listeners.forEach((l) => l(newState, error ? { ...data, error } : data));
  }

  private emitState(): void {
    this.setState(this.state);
  }

  private notify(message: string): void {
    voiceDiagnostics.event(message);
    this.noticeListeners.forEach((l) => l(message));
  }

  public getState(): VoiceState {
    return this.state;
  }

  public getMode(): VoiceMode {
    return this.mode;
  }

  public isActive(): boolean {
    return this.isVoiceModeActive;
  }

  public isCallActive(): boolean {
    return this.isVoiceModeActive && this.mode === 'call';
  }

  public isLive(): boolean {
    return false;
  }

  public getProviderLabel(): string {
    if (this.isCallActive()) return 'Local Call (Moonshine STT → Bob brain → Moonshine TTS)';
    if (this.isVoiceModeActive && this.mode === 'prompt') return 'Local Prompt (Moonshine STT only)';
    return this.mode === 'prompt' ? 'STT only' : 'idle';
  }

  public setMode(mode: VoiceMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (this.isVoiceModeActive) {
      vad.stop();
      const stream = micManager.getStream();
      if (stream) this.startVad(stream);
    }
  }

  // ------------------------------------------------------------------- start

  public async startVoiceMode(targetMode?: VoiceMode): Promise<boolean> {
    if (targetMode) this.mode = targetMode;
    if (this.isVoiceModeActive) return true;

    this.stopSpeaking();

    voiceDiagnostics.reset();
    voiceDiagnostics.set({ mode: this.mode, provider: 'connecting' });
    this.lastBobReply = '';
    this.currentTranscript = '';
    this.responseCancelled = false;
    this.turnUserText = '';
    this.turnBobText = '';

    try {
      this.setState('REQUESTING_PERMISSION');
      this.notify('Requesting microphone access…');
      const stream = await micManager.startCapture();
      this.notify('Microphone ready');
      voiceDiagnostics.set({ microphone: 'active' });
      this.isVoiceModeActive = true;

      if (this.mode === 'call') {
        await this.startLocalCallSession(stream);
      } else {
        await this.startDictationSession(stream);
      }
      return true;
    } catch (err: any) {
      const classified = classifyError(err);
      voiceDiagnostics.error(classified.code, classified.message);
      this.teardown();
      this.setState('ERROR', classified.message);
      this.scheduleErrorClear();
      return false;
    }
  }

  private startVad(stream: MediaStream, silenceMs?: number): void {
    vad.start(
      stream,
      {
        onSpeechStart: () => this.handleSpeechStart(),
        onSpeechEnd: () => this.handleSpeechEnd(),
        onEnergyChange: (energy) => this.energyListeners.forEach((fn) => fn(energy)),
      },
      { silenceMs }
    );
    voiceDiagnostics.set({ vad: `detecting (${silenceMs ?? DEFAULT_VOICE_CONFIG.speechEndSilenceDurationMs}ms silence)` });
  }

  // ---------------------------------------------------------- prompt / dictation

  private async startDictationSession(stream: MediaStream): Promise<void> {
    this.setState('CONNECTING_LOCAL_ENGINE');
    this.startVad(stream, DEFAULT_VOICE_CONFIG.promptSilenceDurationMs);
    this.armIdleTimer();

    await stt.start(
      (event) => {
        if (!this.isVoiceModeActive) return;
        this.currentTranscript = event.transcript;
        this.handlers?.onTranscriptUpdate(event.transcript, event.isFinal);

        if (event.isFinal) {
          voiceDiagnostics.mark('sttEnd');
          voiceDiagnostics.event(`Transcript received (${event.transcript.length} chars)`);
          this.setState('TRANSCRIPT_READY');
          this.notify('Transcript ready');
          if (this.transcriptReadyTimer) clearTimeout(this.transcriptReadyTimer);
          this.transcriptReadyTimer = setTimeout(() => {
            this.transcriptReadyTimer = null;
            if (this.state === 'TRANSCRIPT_READY') this.setState('LISTENING');
          }, 2500);
          return;
        }
        if (this.state !== 'USER_SPEAKING') this.setState('USER_SPEAKING');
      },
      (errMsg) => this.failSoft(errMsg)
    );

    if (this.state !== 'USER_SPEAKING' && this.state !== 'TRANSCRIPT_READY') {
      this.setState('LISTENING');
      this.notify('Listening…');
    }
  }

  public async endDictation(): Promise<string> {
    if (!this.isVoiceModeActive || this.mode !== 'prompt') {
      this.stopVoiceMode();
      return '';
    }

    this.clearTimers();
    vad.stop();
    this.setState('TRANSCRIBING');
    this.notify('Transcribing locally…');
    voiceDiagnostics.stage('stt', 'Audio finalized — sending to STT');

    let text = this.currentTranscript.trim();
    let errorMessage = '';

    try {
      const result = await stt.finalize();
      if (result.text.trim()) text = result.text.trim();
      else if (result.error) errorMessage = result.error.message;
    } catch (err: any) {
      const classified = classifyError(err);
      errorMessage = classified.message;
    }

    this.teardown();

    if (text) {
      voiceDiagnostics.mark('transcript');
      voiceDiagnostics.event('Transcript inserted into composer');
      this.handlers?.onTranscriptUpdate(text, true);
      this.setState('IDLE');
      return text;
    }

    const message = errorMessage || 'Bob could not hear any speech. Try again.';
    voiceDiagnostics.error('STT_EMPTY', message);
    this.setState('ERROR', message);
    this.scheduleErrorClear();
    return '';
  }

  // ------------------------------------------------------------------ call mode

  private async startLocalCallSession(stream: MediaStream): Promise<void> {
    if (!this.isVoiceModeActive) return;

    this.setState('CONNECTING_LOCAL_ENGINE');
    this.notify('Connecting local voice engine…');
    this.lastPersistedTurnId = -1;
    this.startVad(stream, SILENCE_TIMEOUT_MS);

    await stt.start(
      (event) => {
        if (!this.isVoiceModeActive) return;
        this.currentTranscript = event.transcript;
        if (event.isFinal) {
          voiceDiagnostics.mark('sttEnd');
          void this.handleFinalTranscript(event.transcript);
          return;
        }
        if (this.state !== 'USER_SPEAKING' && this.state !== 'THINKING') {
          this.setState('USER_SPEAKING');
        }
      },
      (errMsg) => this.failSoft(errMsg)
    );

    this.setState('LISTENING');
    this.notify('Listening…');
    this.armIdleTimer();
    this.armCallIdleTimer();
  }

  // ------------------------------------------------------------- turn handling

  private handleSpeechStart(): void {
    if (!this.isVoiceModeActive) return;
    this.clearIdleTimer();
    this.clearCallIdleTimer();
    this.armTurnTimer();
    voiceDiagnostics.mark('speechStart');
    voiceDiagnostics.resetTurn();
    voiceDiagnostics.set({ vad: 'speech detected' });

    if (this.state === 'SPEAKING' || audioQueue.isPlaying()) {
      this.interrupt();
      return;
    }
    if (this.state !== 'THINKING') {
      this.setState('USER_SPEAKING');
    }
  }

  private handleSpeechEnd(): void {
    if (!this.isVoiceModeActive) return;
    this.clearTurnTimer();
    voiceDiagnostics.mark('speechEnd');
    voiceDiagnostics.set({ vad: 'speech ended' });

    if (this.mode === 'prompt') {
      void (async () => {
        try {
          await stt.flush();
          const result = await stt.finalize();
          if (result.text && this.isVoiceModeActive && this.mode === 'prompt') {
            this.currentTranscript = result.text;
            this.handlers?.onTranscriptUpdate(result.text, true);
            this.setState('TRANSCRIPT_READY');
            this.notify('Done transcribing');
            if (this.transcriptReadyTimer) clearTimeout(this.transcriptReadyTimer);
            this.transcriptReadyTimer = setTimeout(() => {
              this.transcriptReadyTimer = null;
              if (this.state === 'TRANSCRIPT_READY') this.setState('LISTENING');
            }, 2500);
          }
        } catch {}
      })();
    } else {
      this.setState('TRANSCRIBING');
      this.notify('Transcribing locally…');
      void stt.flush();
    }
    this.armIdleTimer();
    this.armCallIdleTimer();
  }

  private async handleFinalTranscript(transcript: string): Promise<void> {
    const cleanText = transcript.trim();
    if (!cleanText || this.isSubmitting || !this.isVoiceModeActive) return;

    this.isSubmitting = true;
    this.responseCancelled = false;
    this.callGeneration = -1;
    this.streamingReply = '';
    this.turnUserText = cleanText;
    this.turnBobText = '';
    this.clearIdleTimer();
    this.clearCallIdleTimer();
    voiceDiagnostics.mark('transcript');
    this.setState('THINKING');
    this.notify('Bob is thinking…');
    this.currentTranscript = '';
    voiceDiagnostics.stage('gemini', 'Waiting for Bob');

    try {
      await this.handlers?.onSubmitMessage(cleanText);
    } catch (err) {
      console.warn('Voice submit message error:', err);
      this.notify('Bob could not process that request.');
    } finally {
      this.isSubmitting = false;
    }
  }

  /** Call mode: streamed answer text → sentence chunks → TTS as they arrive. */
  public feedAIStreamChunk(deltaText: string): void {
    if (!this.isCallActive() || this.responseCancelled) return;
    if (!deltaText) return;

    if (this.callGeneration < 0) {
      this.callGeneration = audioQueue.getGenerationId();
      voiceDiagnostics.mark('firstToken');
      voiceDiagnostics.stage('tts', 'Synthesizing first sentence');
    }
    this.streamingReply += deltaText;
    this.turnBobText += deltaText;
    this.lastBobReply = this.streamingReply;
    this.chunker.feed(deltaText);
  }

  public finalizeAIResponse(fullText?: string): void {
    if (!this.isCallActive()) return;
    if (this.responseCancelled) return;
    this.chunker.flush();
    const finalBob = this.streamingReply || fullText || this.turnBobText || this.lastBobReply;
    this.lastBobReply = finalBob;
    this.turnBobText = finalBob;
    this.callGeneration = -1;

    this.emitState();

    if (!audioQueue.isPlaying() && this.turnUserText && this.turnBobText) {
      this.persistLocalExchange();
    }
  }

  private persistLocalExchange(): void {
    const userText = this.turnUserText.trim();
    const bobText = this.turnBobText.trim();
    const turnId = audioQueue.getGenerationId();
    if (!userText && !bobText) return;
    if (turnId === this.lastPersistedTurnId) return;
    this.lastPersistedTurnId = turnId;
    this.handlers?.onVoiceExchange?.(userText, bobText);
    this.turnUserText = '';
    this.turnBobText = '';
  }

  // --------------------------------------------------------------- audio output

  private handlePlaybackState(isPlaying: boolean): void {
    if (this.speakingSource === 'read-aloud') {
      if (isPlaying && !this.isVoiceModeActive) this.setState('SPEAKING');
      if (!isPlaying) {
        this.speakingSource = null;
        if (!this.isVoiceModeActive) this.setState('IDLE');
        this.notify('Bob stopped speaking');
      }
      this.emitSpeaking(isPlaying);
      return;
    }

    if (this.isCallActive()) {
      if (isPlaying && this.state !== 'USER_SPEAKING' && this.state !== 'INTERRUPTING') {
        this.setState('SPEAKING');
        this.notify('Bob is speaking');
      } else if (!isPlaying && this.state === 'SPEAKING') {
        this.notify('Bob stopped speaking');
        this.persistLocalExchange();
        this.setState('LISTENING');
        this.armIdleTimer();
        this.armCallIdleTimer();
      }
    }
    this.emitSpeaking(isPlaying);
  }

  private emitSpeaking(speaking: boolean): void {
    const info: SpeakingInfo = {
      speaking,
      source: this.speakingSource,
      generation: audioQueue.getGenerationId(),
    };
    this.speakingListeners.forEach((l) => l(info));
  }

  /** Unified speech output (Read Aloud and Call share this path and this queue). */
  public speakText(text: string, source: SpeechSource = 'read-aloud'): number {
    const clean = (text || '').trim();
    if (!clean) return audioQueue.getGenerationId();

    if (this.speakingSource === 'call' && this.isCallActive()) this.interrupt();
    this.stopSpeaking();

    const generation = audioQueue.getGenerationId();
    this.speakingSource = source;
    this.responseCancelled = false;

    voiceDiagnostics.set({
      mode: source,
      provider: source === 'read-aloud' ? `TTS (${tts.getPlannedEngine()})` : voiceDiagnostics.get().provider,
    });
    voiceDiagnostics.stage('tts', 'Read Aloud: preparing chunks');
    voiceDiagnostics.mark('readAloudClick');

    const chunker = new ResponseTextChunker((chunk) => audioQueue.enqueue(chunk, generation));
    this.readAloudChunker = chunker;
    chunker.feed(clean);
    chunker.flush();

    this.emitSpeaking(true);
    if (!this.isVoiceModeActive) this.setState('SPEAKING');
    return generation;
  }

  public stopSpeaking(): void {
    if (this.readAloudChunker) {
      this.readAloudChunker.reset();
      this.readAloudChunker = null;
    }
    this.speakingSource = null;
    audioQueue.interrupt();
    this.emitSpeaking(false);
    if (!this.isVoiceModeActive && this.state === 'SPEAKING') this.setState('IDLE');
  }

  public isSpeaking(): boolean {
    return audioQueue.isPlaying();
  }

  public interrupt(): void {
    voiceDiagnostics.event('Barge-in: interrupting Bob');
    this.responseCancelled = true;
    this.callGeneration = -1;
    this.chunker.reset();
    if (this.readAloudChunker) {
      this.readAloudChunker.reset();
      this.readAloudChunker = null;
    }
    this.speakingSource = null;
    audioQueue.interrupt();
    this.emitSpeaking(false);
    this.setState('INTERRUPTING');

    if (this.isVoiceModeActive) {
      setTimeout(() => {
        if (this.isVoiceModeActive) {
          this.setState('LISTENING');
          this.armIdleTimer();
          this.armCallIdleTimer();
        }
      }, 120);
    } else {
      this.setState('IDLE');
    }
  }

  // ------------------------------------------------------------------ timeouts

  private armIdleTimer(): void {
    this.clearIdleTimer();
    if (!this.isVoiceModeActive) return;
    this.idleTimer = setTimeout(() => {
      if (!this.isVoiceModeActive) return;
      const busy =
        this.state === 'USER_SPEAKING' ||
        this.state === 'THINKING' ||
        this.state === 'TRANSCRIBING' ||
        this.state === 'TRANSCRIPT_READY' ||
        audioQueue.isPlaying();
      if (busy) {
        this.armIdleTimer();
        return;
      }
      this.endSessionWithMessage('No speech detected. Voice session ended.');
    }, DEFAULT_VOICE_CONFIG.idleNoSpeechTimeoutMs);
  }

  private armCallIdleTimer(): void {
    this.clearCallIdleTimer();
    if (!this.isVoiceModeActive || this.mode !== 'call') return;
    this.callIdleTimer = setTimeout(() => {
      if (!this.isVoiceModeActive || this.mode !== 'call') return;
      const busy =
        this.state === 'USER_SPEAKING' ||
        this.state === 'THINKING' ||
        this.state === 'SPEAKING' ||
        this.state === 'TRANSCRIBING' ||
        audioQueue.isPlaying();
      if (busy) {
        this.armCallIdleTimer();
        return;
      }
      this.endSessionWithMessage('Call went idle too long. Ended for safety.');
    }, MAX_CALL_IDLE_MS);
  }

  private armTurnTimer(): void {
    this.clearTurnTimer();
    if (!this.isVoiceModeActive) return;
    this.turnTimer = setTimeout(() => {
      if (!this.isVoiceModeActive) return;
      this.endSessionWithMessage('Voice turn limit reached (60s). Session ended for safety.');
    }, DEFAULT_VOICE_CONFIG.maximumTurnDurationMs);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private clearCallIdleTimer(): void {
    if (this.callIdleTimer) {
      clearTimeout(this.callIdleTimer);
      this.callIdleTimer = null;
    }
  }

  private clearTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearIdleTimer();
    this.clearCallIdleTimer();
    this.clearTurnTimer();
    if (this.transcriptReadyTimer) {
      clearTimeout(this.transcriptReadyTimer);
      this.transcriptReadyTimer = null;
    }
  }

  private scheduleErrorClear(): void {
    if (this.errorTimer) clearTimeout(this.errorTimer);
    this.errorTimer = setTimeout(() => {
      this.errorTimer = null;
      if (this.state === 'ERROR') this.setState('IDLE');
    }, ERROR_AUTO_CLEAR_MS);
  }

  private failSoft(message: string): void {
    voiceDiagnostics.event(message);
    if (!this.isVoiceModeActive) {
      this.setState('ERROR', message);
      this.scheduleErrorClear();
      return;
    }
    this.notify(message);
    if (this.mode === 'prompt') {
      return;
    }
    this.endSessionWithMessage(message);
  }

  private failWith(message: string): void {
    voiceDiagnostics.error('UNKNOWN', message);
    this.teardown();
    this.setState('ERROR', message);
    this.scheduleErrorClear();
  }

  private endSessionWithMessage(message: string): void {
    this.stopVoiceMode();
    this.setState('ERROR', message);
    this.scheduleErrorClear();
  }

  // ------------------------------------------------------------------- cleanup

  public stopVoiceMode(): void {
    this.setState('STOPPING');
    this.teardown();
    this.setState('IDLE');
  }

  private teardown(): void {
    this.clearTimers();
    this.isVoiceModeActive = false;
    this.isSubmitting = false;
    this.responseCancelled = false;
    this.callGeneration = -1;
    this.streamingReply = '';
    this.speakingSource = null;
    this.turnUserText = '';
    this.turnBobText = '';

    this.chunker.reset();
    if (this.readAloudChunker) {
      this.readAloudChunker.reset();
      this.readAloudChunker = null;
    }

    audioQueue.interrupt();
    liveProvider.stop();
    vad.stop();
    stt.stop();
    micManager.stopCapture();
    this.currentTranscript = '';

    voiceDiagnostics.set({ microphone: 'inactive', vad: 'idle', connection: 'idle', audio: 'idle' });
    this.emitSpeaking(false);
  }
}

export const voiceController = new VoiceController();
