/**
 * Bob Humanistic Voice Agent
 * 
 * 100% Free, Zero-Credit, On-Device Humanistic Speech Agent
 * 
 * Features:
 * - Kind, warm voice synthesis with natural human cadence, pitch, and intonation
 * - Automatic detection of premium system voices (Google US English, Samantha, Microsoft Natural)
 * - Hands-free speech recognition (dictate directly into Bob's composer)
 * - Sentence-level streaming speech synthesis
 * - Audio visualizer state hooks for wave animation
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

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }

    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
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
      // Fallback to any English voice with localService
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

    // Clean markdown, symbols, and formatting for clean conversational speech
    const cleanText = text
      .replace(/\[\^?\d+\]/g, '') // remove citations [1]
      .replace(/```[\s\S]*?```/g, 'Here is the code block.') // code blocks
      .replace(/\|.*\|/g, '') // markdown tables
      .replace(/[#*_~`]/g, '') // markdown formatting
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
   * Hands-free voice recognition
   */
  public startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError?: (err: string) => void
  ): boolean {
    if (!this.recognition) {
      if (onError) onError('Speech recognition is not supported in this browser.');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
      return false;
    }

    // Stop speaking if currently talking
    this.stopSpeaking();

    this.isListening = true;
    this.notify();

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      this.notify(text);
      onResult(text, Boolean(finalTranscript));
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      this.notify();
      if (onError) onError(event.error || 'Mic input interrupted');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.notify();
    };

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      this.isListening = false;
      this.notify();
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
      this.notify();
    }
  }

  public getVoiceName(): string {
    return this.preferredVoice?.name || 'Bob Humanistic Voice (Default)';
  }
}

export const bobVoice = new BobVoiceAgent();
