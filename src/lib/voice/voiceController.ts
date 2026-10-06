import { VoiceState, VoiceStateListener, VoiceMode } from './types';
import { DEFAULT_VOICE_CONFIG } from './voiceConfig';
import { micManager } from './microphoneManager';
import { vad } from './vad';
import { stt } from './sttProvider';
import { audioQueue } from './audioQueue';
import { tts } from './ttsProvider';
import { ResponseTextChunker } from './textChunker';
import { liveProvider, GeminiLiveProvider } from './liveProvider';
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
  /** Live mode already produced Bob's spoken answer — persist both sides, no new request. */
  onVoiceExchange?: (userText: string, bobText: string) => void;
  /** Research context injected into the realtime session. */
  onGetVoiceContext?: () => string;
}

const ERROR_AUTO_CLEAR_MS = 6000;

/**
 * Single authoritative voice state machine and the only owner of Bob's audio
 * output. Prompt = mic → STT → composer. Call = Gemini Live realtime, with a
 * visible fallback to VAD → STT → chat → chunked TTS.
 */
export class VoiceController {
  private state: VoiceState = 'IDLE';
  private listeners: Set<VoiceStateListener> = new Set();
  private energyListeners: Set<(energy: number) => void> = new Set();
  private speakingListeners: Set<(info: SpeakingInfo) => void> = new Set();
  private noticeListeners: Set<(message: string) => void> = new Set();

  private currentTranscript = '';
  private lastBobReply = '';
  private isVoiceModeActive = false;
  private mode: VoiceMode = 'prompt';
  private handlers?: VoiceHandlers;

  private chunker: ResponseTextChunker;
  private readAloudChunker: ResponseTextChunker | null = null;
  private callGeneration = -1;
  private speakingSource: SpeechSource | null = null;
  private isSubmitting = false;
  private responseCancelled = false;

  private liveActive = false;
  private liveBobText = '';
  private liveBobFromTranscription = false;
  private pendingLiveUserText = '';
  private streamingReply = '';

  private idleTimer: any = null;
  private turnTimer: any = null;
  private errorTimer: any = null;

  constructor() {
    this.chunker = new ResponseTextChunker((chunk) => {
      audioQueue.enqueue(chunk, this.callGeneration);
    });

    audioQueue.setPlaybackStateListener((isPlaying) => this.handlePlaybackState(isPlaying));
    audioQueue.addErrorListener((message) => this.notify(message));
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

  /** Merged so the composer and the app context can each own part of the contract. */
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
    return this.liveActive;
  }

  public getProviderLabel(): string {
    if (this.liveActive) return `Gemini Live (${liveProvider.getModel()})`;
    if (this.isCallActive()) return 'Gemini Fallback (STT → chat → TTS)';
    return this.mode === 'prompt' ? 'STT only' : 'idle';
  }

  public setMode(mode: VoiceMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (this.isVoiceModeActive && !this.liveActive) {
      vad.stop();
      const stream = micManager.getStream();
      if (stream) this.startVad(stream);
    }
  }

  // ------------------------------------------------------------------- start

  public async startVoiceMode(targetMode?: VoiceMode): Promise<boolean> {
    if (targetMode) this.mode = targetMode;
    if (this.isVoiceModeActive) return true;

    // Only one Bob audio session may own the output.
    this.stopSpeaking();

    voiceDiagnostics.reset();
    voiceDiagnostics.set({ mode: this.mode, provider: 'connecting' });
    this.lastBobReply = '';
    this.currentTranscript = '';
    this.responseCancelled = false;

    try {
      const stream = await micManager.startCapture();
      voiceDiagnostics.set({ microphone: 'active' });
      this.isVoiceModeActive = true;

      if (this.mode === 'call') {
        await this.startCallSession(stream);
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
    this.setState('LISTENING');
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
          // Prompt mode never auto-sends: the user reviews and presses Send.
          if (this.state !== 'USER_SPEAKING') this.setState('LISTENING');
          return;
        }
        if (this.state !== 'USER_SPEAKING') this.setState('USER_SPEAKING');
      },
      (errMsg) => this.failSoft(errMsg)
    );
  }

  /**
   * Prompt mode "End": finalize the captured audio, transcribe it, put the
   * transcript into the real composer, then release the microphone.
   */
  public async endDictation(): Promise<string> {
    if (!this.isVoiceModeActive || this.mode !== 'prompt') {
      this.stopVoiceMode();
      return '';
    }

    this.clearTimers();
    vad.stop();
    this.setState('TRANSCRIBING');
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

  private async startCallSession(stream: MediaStream): Promise<void> {
    const apiKey = bobAi.getGeminiKey();

    if (!apiKey && !stt.hasWebSpeech()) {
      this.failWith('Gemini API key required for voice. Add your key in Settings.');
      return;
    }

    if (DEFAULT_VOICE_CONFIG.liveEnabled && apiKey && GeminiLiveProvider.isSupported()) {
      this.setState('CONNECTING');
      voiceDiagnostics.set({ provider: 'Gemini Live', connection: 'connecting' });
      voiceDiagnostics.event('Connecting to Bob (live voice)…');

      const connected = await liveProvider.connect(stream, apiKey, this.buildLiveInstruction(), {
        onConnected: (model) => {
          this.liveActive = true;
          voiceDiagnostics.set({ provider: 'Gemini Live', model, connection: 'connected' });
          voiceDiagnostics.event('Live voice connected');
          this.setState('LISTENING');
          this.armIdleTimer();
        },
        onUserSpeechStart: () => {
          this.clearIdleTimer();
          this.armTurnTimer();
          voiceDiagnostics.mark('speechStart');
          voiceDiagnostics.set({ vad: 'speech detected (server VAD)' });
          if (this.state !== 'SUBMITTING') this.setState('USER_SPEAKING');
        },
        onUserSpeechEnd: () => {
          this.clearTurnTimer();
          voiceDiagnostics.mark('speechEnd');
          voiceDiagnostics.set({ vad: 'speech ended' });
          // Safety net: if Live never returns audio/turnComplete, the idle timer
          // still recovers the session instead of listening forever.
          this.armIdleTimer();
        },
        onUserTranscript: (text, isFinal) => {
          this.currentTranscript = text;
          if (isFinal) this.pendingLiveUserText = text;
          voiceDiagnostics.event(isFinal ? 'User turn transcribed' : 'Transcribing user…');
          this.emitState();
        },
        onModelText: (text, isFinal) => {
          if (!text) return;
          // Prefer the output transcription; modelTurn text is the backup signal.
          if (isFinal) {
            this.liveBobFromTranscription = true;
            this.liveBobText = text;
          } else if (!this.liveBobFromTranscription) {
            this.liveBobText += text;
          }
          this.lastBobReply = this.liveBobText;
          this.emitState();
        },
        onModelAudioStart: () => {
          this.clearIdleTimer();
          voiceDiagnostics.set({ audio: 'playing (live)' });
          if (this.state !== 'USER_SPEAKING') this.setState('SPEAKING');
        },
        onModelAudioEnd: () => {
          this.persistLiveExchange();
          if (this.isVoiceModeActive && this.state !== 'USER_SPEAKING') {
            this.setState('LISTENING');
            this.armIdleTimer();
          }
        },
        onInterrupted: () => {
          voiceDiagnostics.event('Barge-in: Bob stopped, listening again');
          this.lastBobReply = '';
          this.liveBobText = '';
          this.liveBobFromTranscription = false;
          if (this.isVoiceModeActive) this.setState('USER_SPEAKING');
        },
        onError: (message) => this.notify(message),
        onClosed: () => {
          if (!this.isVoiceModeActive || this.mode !== 'call') return;
          const wasLive = this.liveActive;
          this.liveActive = false;
          if (wasLive) this.notify('Live voice connection closed. Switching to backup voice.');
          void this.startFallbackCall();
        },
      });

      if (connected) return;
      liveProvider.stop();
      voiceDiagnostics.event('Live voice unavailable — backup voice pipeline active');
      this.notify('Live voice unavailable. Backup voice active.');
    }

    await this.startFallbackCall();
  }

  private async startFallbackCall(): Promise<void> {
    if (!this.isVoiceModeActive) return;
    const stream = micManager.getStream();
    if (!stream) {
      this.failWith('Microphone is no longer available. Start the call again.');
      return;
    }

    this.liveActive = false;
    voiceDiagnostics.set({ provider: 'Gemini Fallback', connection: 'n/a (HTTP)', model: 'chat + TTS' });
    this.setState('FALLBACK');
    this.startVad(stream, DEFAULT_VOICE_CONFIG.callSilenceDurationMs);

    await stt.start(
      (event) => {
        if (!this.isVoiceModeActive) return;
        this.currentTranscript = event.transcript;
        if (event.isFinal) {
          voiceDiagnostics.mark('sttEnd');
          void this.handleFinalTranscript(event.transcript);
          return;
        }
        if (this.state !== 'USER_SPEAKING' && this.state !== 'THINKING' && this.state !== 'SUBMITTING') {
          this.setState('USER_SPEAKING');
        }
      },
      (errMsg) => this.failSoft(errMsg)
    );

    this.setState('LISTENING');
    this.armIdleTimer();
  }

  private buildLiveInstruction(): string {
    let context = '';
    try {
      context = this.handlers?.onGetVoiceContext?.() || '';
    } catch {
      context = '';
    }
    return [
      'You are Bob, a warm, intelligent research companion speaking live by voice.',
      'Answer conversationally in short spoken sentences (2-4 unless detail is requested).',
      'Never use markdown, tables, bullet symbols, code blocks or URLs — this is audio only.',
      'If the user interrupts, stop and respond to the new request.',
      context ? `Current research context:\n${context.slice(0, 3500)}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private persistLiveExchange(): void {
    const userText = this.pendingLiveUserText.trim();
    const bobText = this.liveBobText.trim();
    this.pendingLiveUserText = '';
    this.liveBobText = '';
    this.liveBobFromTranscription = false;
    if (!userText && !bobText) return;
    this.handlers?.onVoiceExchange?.(userText, bobText);
  }

  // ------------------------------------------------------------- turn handling

  private handleSpeechStart(): void {
    if (!this.isVoiceModeActive) return;
    this.clearIdleTimer();
    this.armTurnTimer();
    voiceDiagnostics.mark('speechStart');
    voiceDiagnostics.resetTurn();
    voiceDiagnostics.set({ vad: 'speech detected' });

    // Barge-in: never make the user click Stop first.
    if (this.state === 'SPEAKING' || audioQueue.isPlaying()) {
      this.interrupt();
      return;
    }
    if (this.state !== 'SUBMITTING' && this.state !== 'THINKING') {
      this.setState('USER_SPEAKING');
    }
  }

  private handleSpeechEnd(): void {
    if (!this.isVoiceModeActive) return;
    this.clearTurnTimer();
    voiceDiagnostics.mark('speechEnd');
    voiceDiagnostics.set({ vad: 'speech ended' });
    // Transcribe this turn now instead of waiting for the ~55s chunk boundary.
    void stt.flush();
    this.armIdleTimer();
  }

  private async handleFinalTranscript(transcript: string): Promise<void> {
    const cleanText = transcript.trim();
    if (!cleanText || this.isSubmitting || !this.isVoiceModeActive) return;

    this.isSubmitting = true;
    this.responseCancelled = false;
    this.callGeneration = -1;
    this.streamingReply = '';
    this.clearIdleTimer();
    voiceDiagnostics.mark('transcript');
    this.setState('SUBMITTING');

    try {
      this.setState('THINKING');
      this.currentTranscript = '';
      voiceDiagnostics.stage('gemini', 'Waiting for Bob');
      await this.handlers?.onSubmitMessage(cleanText);
    } catch (err) {
      console.warn('Voice submit message error:', err);
      this.notify('Bob could not process that request.');
    } finally {
      this.isSubmitting = false;
      if (this.isVoiceModeActive && !audioQueue.isPlaying()) {
        this.setState('LISTENING');
        this.armIdleTimer();
      }
    }
  }

  /** Call mode: streamed answer text → sentence chunks → TTS as they arrive. */
  public feedAIStreamChunk(deltaText: string): void {
    if (!this.isCallActive() || this.liveActive || this.responseCancelled) return;
    if (!deltaText) return;

    if (this.callGeneration < 0) {
      this.callGeneration = audioQueue.getGenerationId();
      voiceDiagnostics.mark('firstToken');
      voiceDiagnostics.stage('tts', 'Synthesizing first sentence');
    }
    this.streamingReply += deltaText;
    this.lastBobReply = this.streamingReply;
    this.chunker.feed(deltaText);
  }

  public finalizeAIResponse(fullText?: string): void {
    if (!this.isCallActive() || this.liveActive) return;
    if (this.responseCancelled) return;
    this.chunker.flush();
    this.lastBobReply = this.streamingReply || fullText || this.lastBobReply;
    this.callGeneration = -1;
    this.emitState();
  }

  // --------------------------------------------------------------- audio output

  private handlePlaybackState(isPlaying: boolean): void {
    if (this.speakingSource === 'read-aloud') {
      if (isPlaying && !this.isVoiceModeActive) this.setState('SPEAKING');
      if (!isPlaying) {
        this.speakingSource = null;
        if (!this.isVoiceModeActive) this.setState('IDLE');
      }
      this.emitSpeaking(isPlaying);
      return;
    }

    if (this.isVoiceModeActive && this.mode === 'call' && !this.liveActive) {
      if (isPlaying && this.state !== 'USER_SPEAKING' && this.state !== 'INTERRUPTING') {
        this.setState('SPEAKING');
      } else if (!isPlaying && this.state === 'SPEAKING') {
        this.setState('LISTENING');
        this.armIdleTimer();
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

  /**
   * Unified speech output (Read Aloud and Call share this path and this queue).
   * Returns the generation id; anything enqueued under an older id is discarded.
   */
  public speakText(text: string, source: SpeechSource = 'read-aloud'): number {
    const clean = (text || '').trim();
    if (!clean) return audioQueue.getGenerationId();

    // Single output owner: Read Aloud interrupts Call audio and vice versa.
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
    audioQueue.interrupt(); // new generation + stop in-flight TTS: STOP always wins
    if (this.liveActive) liveProvider.clearScheduledAudio();
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
    if (this.liveActive) liveProvider.clearScheduledAudio();
    this.emitSpeaking(false);

    if (this.isVoiceModeActive) {
      this.setState('LISTENING');
      this.armIdleTimer();
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
        this.state === 'SUBMITTING' ||
        this.state === 'TRANSCRIBING' ||
        audioQueue.isPlaying() ||
        liveProvider.isPlayingAudio();
      if (busy) {
        this.armIdleTimer();
        return;
      }
      this.endSessionWithMessage('No speech detected. Voice session ended.');
    }, DEFAULT_VOICE_CONFIG.idleNoSpeechTimeoutMs);
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

  private clearTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearIdleTimer();
    this.clearTurnTimer();
  }

  private scheduleErrorClear(): void {
    if (this.errorTimer) clearTimeout(this.errorTimer);
    this.errorTimer = setTimeout(() => {
      this.errorTimer = null;
      if (this.state === 'ERROR') this.setState('IDLE');
    }, ERROR_AUTO_CLEAR_MS);
  }

  /** Non-fatal problem: tell the user, then go back to a safe listening/idle state. */
  private failSoft(message: string): void {
    voiceDiagnostics.event(message);
    if (!this.isVoiceModeActive) {
      this.setState('ERROR', message);
      this.scheduleErrorClear();
      return;
    }
    this.notify(message);
    if (this.mode === 'prompt') {
      // Dictation stays usable: the transcript may still arrive, and End still works.
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
    this.teardown();
    this.setState('STOPPING');
    this.setState('IDLE');
  }

  /** Release microphone, VAD, STT, Live socket, timers and queued audio. */
  private teardown(): void {
    this.clearTimers();
    this.isVoiceModeActive = false;
    this.isSubmitting = false;
    this.responseCancelled = false;
    this.callGeneration = -1;
    this.streamingReply = '';
    this.speakingSource = null;
    this.pendingLiveUserText = '';
    this.liveBobText = '';

    this.chunker.reset();
    if (this.readAloudChunker) {
      this.readAloudChunker.reset();
      this.readAloudChunker = null;
    }

    audioQueue.interrupt();
    liveProvider.stop();
    this.liveActive = false;
    vad.stop();
    stt.stop();
    micManager.stopCapture();
    this.currentTranscript = '';

    voiceDiagnostics.set({ microphone: 'inactive', vad: 'idle', connection: 'idle', audio: 'idle' });
    this.emitSpeaking(false);
  }
}

export const voiceController = new VoiceController();
