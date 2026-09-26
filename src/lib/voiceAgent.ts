/**
 * Bob Humanistic Voice Agent
 * 
 * 100% Free, Zero-Credit, On-Device Humanistic Speech Agent
 * 
 * Features:
 * - Natural human cadence, pitch, and intonation
 * - Auto-detects premium system voices (Google US English, Samantha, Microsoft Natural)
 * - Continuous live speech recognition (real-time voice to text in prompt composer)
 * - Audio visualizer wave animation hooks
 */

export interface VoiceProfile {
  id: string;
  name: string;
  lang: string;
  natural: boolean;
  gender?: 'female' | 'male';
}

type VoiceStatusListener = (isSpeaking: boolean, isListening: boolean, currentTranscript?: string) => void;

class BobVoiceAgent {
  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking = false;
  private isListening = false;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private listeners: Set<VoiceStatusListener> = new Set();
  private voiceVolume = 1.0;
  private voicePitch = 1.02; // Warm, approachable pitch
  private voiceRate = 1.0;   // Natural conversational speed
  private mediaStream: MediaStream | null = null;
  private accumulatedTranscript = '';

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }

    this.setupRecognition();
  }

  private setupRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.maxAlternatives = 1;
          this.recognition.lang = navigator.language || 'en-US';
        } catch (e) {
          console.warn('SpeechRecognition initialization error:', e);
        }
      }
    }
  }

  private initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

    // Prioritize warm, humanistic, natural-sounding voices
    const humanisticVoiceNames = [
      'Google US English',
      'Samantha',
      'Microsoft Jenny Online (Natural)',
      'Microsoft Guy Online (Natural)',
      'Microsoft Aria Online (Natural)',
      'Karen',
      'Victoria',
      'Daniel',
      'Alex'
    ];

    for (const name of humanisticVoiceNames) {
      const match = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) {
        this.preferredVoice = match;
        break;
      }
    }

    if (!this.preferredVoice) {
      this.preferredVoice = voices.find(v => v.lang.startsWith('en') && v.localService) || voices[0];
    }
  }

  public subscribe(listener: VoiceStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.isSpeaking, this.isListening);
    return () => this.listeners.delete(listener);
  }

  private notify(transcript?: string) {
    this.listeners.forEach(fn => fn(this.isSpeaking, this.isListening, transcript));
  }

  /**
   * Speak response in a kind, conversational manner
   */
  public speak(text: string, onEnd?: () => void): void {
    if (!this.synth) return;
    this.stopSpeaking();

    const cleanText = text
      .replace(/\[\^?\d+\]/g, '') // remove citations [1]
      .replace(/```[\s\S]*?```/g, 'Here is the code block.')
      .replace(/\|.*\|/g, '') // markdown tables
      .replace(/[#*_~`]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.preferredVoice) {
      utterance.voice = this.preferredVoice;
    }
    utterance.volume = this.voiceVolume;
    utterance.pitch = this.voicePitch;
    utterance.rate = this.voiceRate;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.notify();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.notify();
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.notify();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public stopSpeaking(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.notify();
    }
  }

  public toggleSpeak(text: string, onEnd?: () => void): void {
    if (this.isSpeaking) {
      this.stopSpeaking();
    } else {
      this.speak(text, onEnd);
    }
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Continuous hands-free voice recognition
   */
  public async startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError?: (err: string) => void
  ): Promise<boolean> {
    if (this.isListening) {
      this.stopListening();
      return false;
    }

    // Stop speaking if currently talking
    this.stopSpeaking();
    this.accumulatedTranscript = '';

    // Request microphone permission via getUserMedia first if available
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err: any) {
      console.warn('Microphone permission request:', err);
    }

    if (!this.recognition) {
      this.setupRecognition();
    }

    if (!this.recognition) {
      if (onError) onError('Speech recognition is not available on this system.');
      return false;
    }

    this.isListening = true;
    this.notify();

    this.recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.accumulatedTranscript += (this.accumulatedTranscript ? ' ' : '') + transcriptPart.trim();
        } else {
          interim += transcriptPart;
        }
      }

      const combined = (this.accumulatedTranscript + (interim ? ' ' + interim : '')).trim();
      this.notify(combined);
      onResult(combined, Boolean(this.accumulatedTranscript));
    };

    this.recognition.onerror = (event: any) => {
      // Don't kill session on harmless 'no-speech' timeout
      if (event.error === 'no-speech') {
        return;
      }
      console.warn('Speech recognition error event:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.isListening = false;
        this.notify();
        if (onError) onError('Microphone access was denied or unavailable.');
      }
    };

    this.recognition.onend = () => {
      // If user still has listening mode turned on, auto-restart to keep listening
      if (this.isListening) {
        try {
          this.recognition.start();
        } catch {
          this.isListening = false;
          this.notify();
        }
      } else {
        this.notify();
      }
    };

    try {
      this.recognition.start();
      return true;
    } catch (e: any) {
      // If already started, that's fine
      if (e?.name === 'InvalidStateError') {
        return true;
      }
      this.isListening = false;
      this.notify();
      if (onError) onError(e?.message || 'Could not start microphone');
      return false;
    }
  }

  public stopListening(): void {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach(t => t.stop());
        this.mediaStream = null;
      } catch {}
    }
    this.notify();
  }

  public getVoiceName(): string {
    return this.preferredVoice?.name || 'Bob Humanistic Voice';
  }
}

export const bobVoice = new BobVoiceAgent();
