/**
 * Quiet background warmup for Bob's voice stack (v1.0.60 Gemini-only release).
 *
 * Kokoro and Whisper downloads are intentionally disabled for this release so
 * users can evaluate Gemini Live + Gemini transcription without local model
 * downloads. Only browser speechSynthesis is primed.
 *
 * To re-enable local models later, restore the previous warmStt / warmTts bodies.
 */

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
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

/**
 * Warm browser TTS only. Whisper / Kokoro downloads are suppressed in v1.0.60.
 */
export async function warmupVoiceEngine(): Promise<void> {
  if (warmed) return;
  if (warmupPromise) return warmupPromise;

  warmupPromise = (async () => {
    warmBrowserSpeechSynthesis();
    warmed = true;
  })();

  return warmupPromise;
}

/** Whether a warmup pass has completed this session. */
export function isVoiceEngineWarmed(): boolean {
  return warmed;
}
