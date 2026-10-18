/**
 * Quiet background warmup for Bob's AI & voice stack.
 *
 * Pre-warms Gemini cloud connection, HTTP/2 session, audio context, and speech services
 * so the very first speech turn or prompt generation has zero cold-start delay.
 * Never throws into the UI and does not request microphone permission during boot.
 */

import { resolveGeminiApiKey } from '../ai/keyManager';
import { bobAi } from '../aiEngine';

let warmupPromise: Promise<void> | null = null;
let warmed = false;

function warmBrowserSpeechSynthesis(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    if (voices.length === 0) {
      synth.addEventListener(
        'voiceschanged',
        () => {
          void synth.getVoices();
        },
        { once: true }
      );
    }
    try {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      synth.speak(u);
      synth.cancel();
    } catch {}
  } catch {}
}

async function warmGeminiEngine(): Promise<void> {
  try {
    const key = resolveGeminiApiKey();
    if (!key) return;
    // Quietly verify connection and prime HTTP/2 keep-alive tunnel
    await Promise.race([
      bobAi.testGeminiConnection(key),
      new Promise((r) => setTimeout(r, 4000))
    ]);
  } catch (err) {
    console.warn('[startupWarmup] Gemini connection warmup skipped:', err);
  }
}

async function warmAudioSubsystems(): Promise<void> {
  try {
    warmBrowserSpeechSynthesis();
    // Warm AudioContext if permitted by browser policy
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          const ctx = new AudioCtx();
          if (ctx.state === 'running') {
            void ctx.close();
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('[startupWarmup] Audio subsystem warmup skipped:', err);
  }
}

/**
 * Warm Gemini AI and audio subsystems in the background. Safe to call multiple times.
 */
export async function warmupVoiceEngine(): Promise<void> {
  if (warmed) return;
  if (warmupPromise) return warmupPromise;

  warmupPromise = (async () => {
    await Promise.allSettled([
      warmGeminiEngine(),
      warmAudioSubsystems()
    ]);
    warmed = true;
  })().finally(() => {
    warmupPromise = null;
  });

  return warmupPromise;
}

export function isVoiceEngineWarmed(): boolean {
  return warmed;
}
