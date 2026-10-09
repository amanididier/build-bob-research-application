/**
 * Quiet background warmup for Bob's voice stack.
 *
 * Goal: by the time the user finishes onboarding (or opens the app again),
 * Whisper STT and the active TTS path are already in memory so the first
 * hold-to-talk / call-mode turn does not wait on a multi-second model load.
 *
 * Called from OnboardingFlow on the first card (alongside silent model
 * download). Must never throw into the UI and must not ask for mic permission.
 */

import { localVoiceManager } from './localVoiceManager';
import { tts } from './ttsProvider';

let warmupPromise: Promise<void> | null = null;
let warmed = false;

function warmBrowserSpeechSynthesis(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    // Force the browser to populate the voice list early. Electron / Chrome
    // often leave getVoices() empty until this runs once.
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
    // Tiny no-op utterance cancelled immediately — primes the speech service
    // without audible output on most platforms.
    try {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      synth.speak(u);
      synth.cancel();
    } catch {
      // Some environments reject empty utterances; list load above is enough.
    }
  } catch {
    // Ignore — WebSpeech TTS is a fallback tier only.
  }
}

async function warmStt(): Promise<void> {
  try {
    // Prefer in-memory ready. If the model was downloaded before, ensureReady
    // loads it from the browser cache without a full re-download.
    if (localVoiceManager.isReady()) return;

    if (localVoiceManager.isModelInstalled()) {
      await localVoiceManager.ensureReady();
      return;
    }

    // First-run: start a silent download so the model is cached by the time
    // the user reaches call mode. downloadModel(true) suppresses progress UI.
    await localVoiceManager.downloadModel(true);
  } catch (err) {
    console.warn('[startupWarmup] STT warmup skipped:', err);
  }
}

async function warmTts(): Promise<void> {
  try {
    warmBrowserSpeechSynthesis();

    // Only pull Kokoro weights if the user already installed them (or a prior
    // session marked them ready). Avoids a surprise large download on first open.
    if (tts.isKokoroInstalled()) {
      await tts.initKokoro();
    }
  } catch (err) {
    console.warn('[startupWarmup] TTS warmup skipped:', err);
  }
}

/**
 * Warm STT + TTS in the background. Safe to call many times; concurrent
 * callers share one promise. Resolves when the best-effort warmup finishes
 * (success or soft failure).
 */
export async function warmupVoiceEngine(): Promise<void> {
  if (warmed) return;
  if (warmupPromise) return warmupPromise;

  warmupPromise = (async () => {
    // Run STT and TTS warmup in parallel — independent stacks.
    await Promise.all([warmStt(), warmTts()]);
    warmed = true;
  })().finally(() => {
    // Allow a later retry if everything soft-failed (e.g. offline first open).
    if (!localVoiceManager.isReady() && !tts.isKokoroInstalled()) {
      warmed = false;
      warmupPromise = null;
    }
  });

  return warmupPromise;
}

/** Whether a warmup pass has completed successfully this session. */
export function isVoiceEngineWarmed(): boolean {
  return warmed || localVoiceManager.isReady();
}
