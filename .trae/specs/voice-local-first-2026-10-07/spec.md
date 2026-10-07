# Bob Voice System — Local-First Overhaul — Product Requirements Document

## Overview
- **Summary**: Complete overhaul of Bob's entire voice stack to remove all Gemini cloud voice dependencies for Prompt (dictation), Call (conversational), and Read Aloud modes. STT uses Moonshine WASM locally. TTS uses Moonshine WASM locally. Call mode uses the local VAD + local STT + Bob text brain + local TTS pipeline exclusively (no Gemini Live WebSocket). Users get ChatGPT-style voice cards, model download management, clear native Bob-style model install prompts, a unified state machine, reliable barge-in, never-blocking STOP, and never-silent error diagnostics.
- **Purpose**: Eliminate every reported voice failure permanently (Gemini quota exceeded, connection failures, prompt transcription failures, no-speech-detected false positives, slow Read Aloud startup, robotic fallback voices, hanging sessions, silent failures). Ensure voice works 100% without Gemini voice credits, internet, or available cloud endpoints.
- **Target Users**: Bob desktop/web app users on 8GB RAM Windows 11 laptops who want a reliable, always-available WhisperFlow-style prompt dictation experience and natural hands-free voice calls.

## Goals
1. Remove Gemini voice/cloud-transcription and cloud-TTS dependencies from Prompt, Call, and Read Aloud paths.
2. Deliver live partial dictation into the composer, finalized ~1.5 s after silence, no long TRANSCRIBING block.
3. Deliver natural Call mode turn flow with VAD, interruption (barge-in), and zero cloud waits.
4. Deliver streaming Read Aloud with instant, always-reachable STOP (no stale audio after stop).
5. Surface model-download prompts as native Bob cards with real progress, never simulated.
6. Provide ChatGPT-style voice selection: browse, preview, select, default-voice persist.
7. Provide Settings → Voice Models page listing every local voice model, size, status, progress, delete, and test.
8. Build ONE authoritative voice state machine (single source of truth).
9. Never break existing text chat, research, tasks, tabs, summaries, settings, extension, or Gemini text brain.

## Non-Goals
1. Do NOT replace or modify Bob's text-brain / Gemini text chat. Gemini may continue to power normal text responses.
2. Do NOT implement multi-language STT/TTS. English-only Moonshine Tiny + Moonshine en_us TTS.
3. Do NOT implement on-device LLM or local brain replacement. Bob's brain = existing text AI path.
4. Do NOT add cloud fallback tiers. Local-or-nothing for voice layer.
5. Do NOT rewrite working non-voice components.

## Background & Context
### Existing Architecture Audit Summary
Repository root: `c:\Users\HP\Documents\Qoder\2026-09-29\0e55e344`
Branch: `voice-local-first-2026-09-29`

**Already done in unstaged changes:**
- `src/lib/voice/sttProvider.ts` — Replaced old `WebSpeechSTTProvider` / Gemini STT with `MoonshineSTTProvider` using `@moonshine-ai/moonshine-wasm` `MicTranscriber` + `ModelArch.TinyStreaming`. Loads model via Cache API. Emits streaming partials + onLine finals.
- `src/lib/voice/ttsProvider.ts` — Replaced old Gemini-TTS-HTTP + `speechSynthesis` fallback with `MoonshineTTSProvider` using `TextToSpeech.say()`, `synthesize()` → WAV blob, and `listVoices()`.
- `src/lib/voice/types.ts` — Added `LOADING_MODEL`, `MODEL_LOADING`, `MODEL_LOAD_FAILED`, `MICROPHONE_PERMISSION_DENIED`, `MICROPHONE_NOT_FOUND` error codes. Renamed TTSEngine to `moonshine-tts`.
- `package.json` — Already pins `@moonshine-ai/moonshine-wasm: ^0.1.5`.

**Still broken / missing (primary targets of this spec):**
1. **`voiceController.ts` lines 286-292** — Call mode still gates on `bobAi.getGeminiKey()` / old `stt.hasWebSpeech()`. Moonshine path has no `hasWebSpeech()` → Call mode entry will throw or block.
2. **`voiceController.ts` lines 294-376** — Call mode still tries `GeminiLiveProvider.connect()` first (WebSocket), only falls back locally if that fails. Spec requires local path ONLY (no Live attempt at all).
3. **`voiceConfig.ts` line 18** — `liveEnabled: true`. Must be false / effectively no-op.
4. **`voiceConfig.ts` line 8** — `promptSilenceDurationMs: 10000`. Spec requires ~1.5s (1500 ms) silence for Prompt finalization.
5. **Voice states missing from `types.ts`** — REQUESTING_PERMISSION, CONNECTING_LOCAL_ENGINE, TRANSCRIPT_READY, STOPPING.
6. **`useVoiceStore.ts`** — no model-status subscriptions (STT/TTS download progress not surfaced).
7. **BottomComposer / VoiceCallOverlay** — No model-download prompt cards when STT/TTS models are missing.
8. **SettingsPage** — No `Voice Models` tab/section listing Moonshine Tiny / Moonshine TTS with sizes, progress, download, delete, test.
9. **No voice selection UI** — No cards showing each TTS voice, preview play button, default-voice save.
10. **Call mode `appendVoiceExchange` in AppContext** only triggers for `onVoiceExchange` (Gemini Live path). Local fallback does not persist both sides automatically via that hook.
11. **Missing AbortController wrapping** around long-running voice ops; no timeouts for LOADING_MODEL / TRANSCRIBING / SPEAKING states that are stuck indefinitely.
12. **Read Aloud in ChatView** — `voiceController.stopSpeaking()` called on unmount, but TTS generation cancellability is not guaranteed (MoonshineTTSProvider.stop must discard in-progress generation; verify and fix).

### Resolved Legacy Issues — Permanent Fix Mandates
The following failures must be eliminated by the new architecture:
- Gemini transcription quota exceeded errors (fixed: no Gemini voice)
- Voice connection failures (fixed: no WebSocket/Live)
- Prompt transcription failures (fixed: Moonshine local + proper error codes)
- Call "no speech detected" false positives (fixed: local VAD + min speech window + energy tuning)
- Excessively long Read Aloud startup (fixed: local Moonshine + chunked prefetch)
- Robotic fallback voices (fixed: Moonshine TTS only, no browser speechSynthesis)
- Voice sessions hanging indefinitely (fixed: per-op timeouts + unified STOP cleanup)
- Silent failures with no user feedback (fixed: diagnostic pills + specific error messages)
- Unclear provider failure notifications (fixed: user-readable + specific root cause codes)
- Cannot stop Read Aloud (fixed: stopPlaying interrupts + clears queue + aborts TTS generation)
- System works when all Gemini voice services are unavailable (fixed: zero Gemini-voice dependency)

## Functional Requirements
### FR-1: Local Prompt / Dictation Mode
Click Mic → Prompt: requests mic permission, shows loading model if needed, displays live partial transcript in the composer textarea, finalizes within ~1.5 s of silence, inserts punctuated final transcript into composer, NEVER auto-sends. User reviews/edits, then presses Send manually.

### FR-2: Local Call Mode (Exclusive, No Gemini Live)
Click Mic → Call: requests mic permission, loads Moonshine Tiny (download card if missing). Local VAD detects speech start/end. Speech end (1.5 s silence) flushes STT, sends final transcript to Bob's existing text brain via `onSubmitMessage`. Streamed response text chunks go to `ResponseTextChunker` → `AudioQueue` → Moonshine TTS → speaker. User can interrupt (barge-in): VAD detects user speech while Bob speaking → audio stops, TTS cancelled, queue cleared, new utterance transcribed. Session uses `SILENCE_TIMEOUT_MS=1500`, `MAX_UTTERANCE_MS=60000`, `MAX_CALL_IDLE_MS=60000` with clean teardown. Both sides of the turn persist to chat (`appendVoiceExchange`-equivalent, one per turn).

### FR-3: Read Aloud
Per-message speaker icon in ChatView: click → Moonshine TTS. Stop button (or second click) must immediately: stop playing audio, cancel TTS generation, clear queue, reset state. No stale audio resumes later. Chunked/prefetched sentences; first sentence plays ASAP. Uses existing `speakText(text, 'read-aloud')` pipeline.

### FR-4: Unified Voice State Machine (Single Source of Truth)
States in `VoiceState`: IDLE, REQUESTING_PERMISSION, LOADING_MODEL, CONNECTING_LOCAL_ENGINE, LISTENING, USER_SPEAKING, TRANSCRIBING, TRANSCRIPT_READY, THINKING, SPEAKING, INTERRUPTING, STOPPING, ERROR.
Every component reads from `voiceController` → `useVoiceStore`. No component owns its own independent "speaking/listening" flag.

### FR-5: Model Download Prompt Cards (Bob-Style White Cards)
When user triggers Prompt/Call/Read Aloud and the required local model is NOT downloaded, show a Bob-style clean overlay card (not alert, not toast, not stack trace) with exact size, purpose, [Download & Enable] and [Not now] buttons. Real progress with transfer speed.

### FR-6: Settings → Voice Models Section
New tab in Settings: `Voice Models`. Three cards:
1. Speech Recognition — Moonshine Tiny (approx size, status, Download / Use / Delete / Test / version / storage-used)
2. Text-to-Speech — Moonshine (same controls + model listing)
3. (Optional) Alternative TTS — Chatterbox Nano placeholder with Download button and "Not available locally, coming soon" message.
All downloads non-blocking. Verify integrity with checksum (Moonshine Cache API + local size comparison). Interrupted downloads show retry.

### FR-7: Voice Selection Cards (ChatGPT Style)
Within Settings Voice Models section and/or a popover from Call Overlay debug area: grid of cards per TTS voice. Each card shows voice name, gender/description label, sample waveform glyph, [Play preview] button, [Set as default] / current-default badge. Default persisted in localStorage under `bob_voice_default`.

### FR-8: Barge-In / Interruption
Bob is speaking (Call or Read Aloud). User starts speaking. VAD fires onSpeechStart → immediately: (1) stop all playback, (2) cancel pending TTS generation, (3) clear queue, (4) begin transcribing user's new utterance. Zero click required.

### FR-9: Diagnostic UI — Notification Pills
Bottom composer / Call Overlay visible pills (auto-clear 6 s) for: "Microphone ready", "Loading Moonshine...", "Moonshine ready", "Listening...", "Transcribing locally...", "Bob is thinking...", "Bob is speaking", "Bob stopped speaking", "Local voice ready", "Model download required", "Microphone permission denied", "Microphone disconnected", "Transcription failed", "TTS failed", "Not enough memory to load voice model", "Model failed to initialize", "Voice model downloaded successfully".

Full technical diagnostics continue to exist in Debug panel (VoiceCallOverlay debug toggle).

### FR-10: Error Handling & Timeouts
Every async voice op (load model, start mic, finalize STT, TTS generate, audio playback start) wrapped in try/catch/finally + AbortController. Each op has a timeout:
- `MODEL_LOAD_TIMEOUT_MS = 90000` (first download may be slow)
- `MIC_START_TIMEOUT_MS = 8000`
- `STT_FINALIZE_TIMEOUT_MS = 10000`
- `TTS_GENERATE_TIMEOUT_MS = 15000`
- `FIRST_AUDIO_TIMEOUT_MS = 10000`
On failure: (1) cancel op, (2) cleanup resources, (3) update unified state, (4) notify user via FR-9 pill with specific root cause, (5) offer recovery button.

### FR-11: Memory Management (8 GB Windows Target)
Lazy model loading only. Prompt mode loads Moonshine Tiny STT only. Read Aloud loads Moonshine TTS only. Call mode loads both. Models NOT unloaded on session end (keep hot for fast re-entry). But explicit "Unload models" button in Settings → Voice Models releases WASM instances & cache. No duplicate AudioContext, no duplicate mic streams, no duplicate VAD loops. Every `.close()`, `.stopTrack()`, `disconnect()` called in teardown.

### FR-12: No Auto-Send (Prompt Mode)
Transcript appears in composer textarea. User manually clicks Send. No code path auto-calls `sendMessage()` from Prompt-mode transcription.

### FR-13: VoiceController → AppContext Integration
`registerHandlers` owns: `onTranscriptUpdate`, `onSubmitMessage`, `onVoiceExchange`, `onGetVoiceContext`. Call fallback path must call `onVoiceExchange(userText, bobText)` per completed turn so both sides persist to chat (not just Live).

### FR-14: Provider Abstraction Interfaces
`STTProvider` (existing) and `TTSProvider` (existing) remain stable public interfaces. `voiceController` depends only on these interfaces. Adding a future provider (e.g. Chatterbox) should require zero `voiceController` changes.

## Non-Functional Requirements
### NFR-1: Performance — 8 GB Windows 11 Target
- Model load (cold first-download + init): Moonshine Tiny STT ≤ 90 s on 10 Mbps, ≤ 3 s cached hot load.
- TTS cold load ≤ 90 s first download, ≤ 3 s hot.
- First transcript partial within 2.5 s of speech start.
- Read Aloud first audio within 3.5 s of click (hot model).
- No more than 400 MB combined RAM increase with both STT + TTS hot loaded.

### NFR-2: Stability
10 consecutive Prompt mode end-to-end (speak → silence 1.5 s → transcript in composer). 10 consecutive Call turns (speak → Bob responds → speak again). No crashes, no stuck states. STOP always returns to IDLE within 500 ms.

### NFR-3: Accessibility / Predictability
No "invisible" state. Every state has visible UI indicator. No generic "Try again." messages. Every failure names the cause.

### NFR-4: Non-Breakage
Existing core Bob functionality (text chat, research features, tasks, tabs, summaries, settings, extension, Gemini text chat, conversation state, UI design) behaves exactly as before. No changes outside `src/lib/voice/*`, `src/components/voice/*`, `src/components/layout/BottomComposer.tsx`, `src/store/useVoiceStore.ts`, `src/context/AppContext.tsx`, `src/pages/Settings/SettingsPage.tsx`, `src/pages/Research/ChatView.tsx` (Stop/Read Aloud buttons only).

## Constraints
- **Technical**: Browser-only WASM. No server-side voice proxy. No Chrome Web Store changes. `@moonshine-ai/moonshine-wasm@0.1.5` only (no version bump without user approval). Existing React 19 + Vite 8 + Zustand 5 stack.
- **Business**: Moonshine Tiny English STT first. Moonshine en_us TTS voices. No new paid APIs or keys.
- **Dependencies**: Only add dependencies if Chatterbox Nano is evaluated and chosen; default keep existing set.

## Assumptions
1. Moonshine WASM `MicTranscriber.start()` internally handles `getUserMedia` and mic permissions. But we still need explicit "REQUESTING_PERMISSION" state surface and separate `micManager.requestPermission()` for the user-facing flow before STT init.
2. Moonshine `TextToSpeech.voices({ language: 'en_us' })` returns ≥2 distinct voices (male/female) usable for selection cards.
3. Moonshine WASM stores downloaded model assets in browser Cache API; a same-key reload skips re-download.
4. `DEFAULT_VOICE_CONFIG.callSilenceDurationMs=1500` (already correct) maps to `SILENCE_TIMEOUT_MS`.
5. 8 GB laptop user is NOT running dozens of heavy browser tabs; worst-case Bob + a few tabs still fit both voice models.

## Acceptance Criteria

### AC-1: No Gemini voice in Prompt path
- **Type**: `rule`
- **Given**: A user opens Bob, clicks Mic → Prompt, speaks, ends dictation.
- **When**: Network is disabled (offline) and no Gemini API key is stored.
- **Then**: Prompt mode still works end-to-end. Live transcript shows, final punctuated transcript appears in composer, no network requests for transcription occur.
- **Pass Condition**: `grep -r "gemini" src/lib/voice/sttProvider.ts` and `grep -r "live\|WebSocket" src/lib/voice/sttProvider.ts` returns 0 matches in STT path. AND offline (devtools offline) + no-Gemini-key scenario runs through the full flow without ERROR state.
- **Evidence**: DevTools Network tab recording (offline, no voice-domain requests), grep output, and end-to-end manual test notes.

### AC-2: No Gemini voice in Call path (No Live attempted)
- **Type**: `rule`
- **Given**: User starts Call mode. Gemini API key exists but network is disabled.
- **When**: User speaks a complete sentence, pauses 1.5 s.
- **Then**: Bob transcribes locally, generates a text response through the existing text brain, speaks it through local Moonshine TTS. No WebSocket is opened, no `liveProvider.connect()` is called.
- **Pass Condition**: Call mode entry does NOT call `liveProvider.connect`. Verify by breakpoint / log. AND grep shows `startFallbackCall` becomes `startLocalCall` and is the only code path. AND offline + no Gemini voice-credit scenario works end-to-end for 10 consecutive turns.
- **Evidence**: Modified `voiceController.ts` line numbers, Network tab WebSocket count = 0, 10-turn manual log.

### AC-3: No Gemini / browser speechSynthesis in Read Aloud
- **Type**: `rule`
- **Given**: Chat message exists. No Gemini API key stored.
- **When**: User clicks Read Aloud (speaker icon). Then clicks Stop mid-sentence. Then clicks Read Aloud again.
- **Then**: Audio plays from local TTS. First audio within 4 s (hot model). Stop clears all audio instantly; no stale audio plays after Stop. Second read-aloud starts fresh.
- **Pass Condition**: `speechSynthesis.speak` not called anywhere (breakpoint + grep). `TextToSpeech.say()` or `.speakPrepared()` is the only audio generation path. Stop → 0 queued items in `audioQueue`, `tts.isSpeaking()` returns false within 500 ms.
- **Evidence**: Grep, breakpoint logs, manual test.

### AC-4: Live partial transcript + 1.5 s silence final in Prompt mode
- **Type**: `rule`
- **Given**: Prompt mode active.
- **When**: User speaks "Hello Bob this is a test sentence" then pauses.
- **Then**: While speaking, partial words appear in composer textarea (live). Within 1.5 s + 0.5 s tolerance of silence, a punctuated final sentence appears, state returns to IDLE. Transcript is never auto-sent.
- **Pass Condition**: Measured silence-end → final transcript-in-composer ≤ 2.0 s. `sendMessage` is NOT called after end of dictation (only when user manually clicks Send).
- **Evidence**: Performance.now() timestamps from VAD `onSpeechEnd` → `onTranscriptUpdate(isFinal=true)`. Manual Send-button click log.

### AC-5: Call mode barge-in
- **Type**: `rule`
- **Given**: Call mode active; Bob is mid-sentence (SPEAKING).
- **When**: User starts speaking loudly/clearly.
- **Then**: Bob's audio stops within ≤ 200 ms of VAD onSpeechStart. Queue clears. User's new utterance transcribes. Bob responds to the NEW utterance, not the previous one.
- **Pass Condition**: VAD `onSpeechStart` → `audioQueue.isPlaying()` false → ≤ 200 ms. Bob's next response matches the interrupted utterance content.
- **Evidence**: Timestamped console logs from `handleSpeechStart` through `audioQueue.interrupt()` + TTS.stop() completes. Turn transcript comparison.

### AC-6: Missing-model native Bob cards (STT + TTS)
- **Type**: `rule`
- **Given**: Fresh user profile (no Moonshine models cached).
- **When**: User clicks Mic → Prompt. And separately, user clicks Read Aloud on a message.
- **Then**: Exact Bob-style card appears overlaying the composer with correct title, size, purpose, and [Download & Enable]/[Not now]. Real download progress % and transfer speed update. Download completes; model status changes. User can retry. Not-now dismisses card without starting mode.
- **Pass Condition**: Visual match to template. Transfer speed real (`performance.now` deltas on bytes). On subsequent entry no re-download if size/checksum match.
- **Evidence**: Screenshots/captures. DevTools Application Cache showing stored model. Cache hit on second open.

### AC-7: Settings Voice Models page
- **Type**: `rule`
- **Given**: Settings page open.
- **When**: User navigates to the Voice Models tab.
- **Then**: Shows three cards (Moonshine Tiny / Moonshine / Chatterbox Nano placeholder). Each: name, purpose, approx size, status, progress, version, storage, Download/Use/Delete/Test buttons. Delete removes cache entry. Test plays a 1-second STT mic capture test or TTS preview.
- **Pass Condition**: DOM contains all three cards. Delete button click → model status "Not downloaded" and model not in Cache on next page reload. Test STT button → mic permission request + "Mic OK" toast. Test TTS → "Hello, this is your local voice." sample playback.
- **Evidence**: Manual DOM/button test + Cache storage inspection.

### AC-8: Voice selection cards (browse / preview / default)
- **Type**: `rule`
- **Given**: Settings → Voice Models → Voice Selection area.
- **When**: User sees all available Moonshine voices.
- **Then**: Each voice shows a card with name, short sample text, [▶ Preview] button, [Set default] button. Default badge on current default. Preview plays a short sample. Default persists across page reloads via `localStorage.getItem('bob_voice_default')`.
- **Pass Condition**: ≥ 2 distinct Moonshine voices listed. Click Set default → badge changes → reload → same default. Preview button plays unique sound per voice.
- **Evidence**: LocalStorage key + values, playback log per voice card.

### AC-9: Unified state machine + no stuck states
- **Type**: `rubric`
- **Dimension**: Correctness and exhaustiveness of the single voice state machine across all components.
- **Scale**: 1-5
- **Anchors**:
  1 = Multiple components own independent voice booleans; duplicate state often disagrees; at least one "stuck" state on every workflow.
  3 = Single state machine defined but not used by BottomComposer or Call Overlay or ChatView Read Aloud; rare transient disagreement.
  5 = IDLE → REQUESTING_PERMISSION → LOADING_MODEL → CONNECTING_LOCAL_ENGINE → LISTENING → USER_SPEAKING → TRANSCRIBING → TRANSCRIPT_READY → (THINKING → SPEAKING)* → IDLE/ERROR/STOPPING flow implemented and every component reads ONLY from useVoiceStore. No stuck TRANSCRIBING or SPEAKING after 5 s.
- **Pass Threshold**: ≥ 4
- **Evidence**: Component grep for any boolean `const [speaking, setSpeaking]` outside of `useVoiceStore`. State transition log for 3 workflows.

### AC-10: Stop/Interrupt always kills stale audio
- **Type**: `rule`
- **Given**: Read Aloud playing, Call Bob speaking, or Prompt LOADING_MODEL.
- **When**: User clicks Stop / End Call / X.
- **Then**: All audio stops within ≤ 500 ms. No queued sentence plays 2+ seconds later. `voiceController.getState()` reaches IDLE or STOPPING → IDLE. `tts.engine?.stop()` called; `audioQueue.queue.length = 0`; all `AudioBufferSourceNode.stop()` invoked.
- **Pass Condition**: Manual test 5 consecutive stop-interrupt cycles with no audio after STOP.
- **Evidence**: 5-cycle manual log. AudioQueue length assertions.

### AC-11: Specific error messages (no generic "try again")
- **Type**: `rule`
- **Given**: Six failure modes.
- **When**: (a) mic permission denied, (b) no mic device, (c) model missing, (d) model load OOM/error, (e) audio capture disconnected, (f) STT/TTS generation exception.
- **Then**: Each surface a distinct pill naming the exact root cause, plus a relevant recovery action (Grant mic / Connect mic / Download model / Free RAM / Restart Bob / Try again).
- **Pass Condition**: 6 distinct pill messages containing exactly 0 occurrences of "try again" without a cause.
- **Evidence**: Manual test matrix with simulated failures. Screenshots of each pill.

### AC-12: Call turn persistence to chat (local path)
- **Type**: `rule`
- **Given**: Call mode (local, no Live).
- **When**: User speaks → Bob responds → turn completes.
- **Then**: `sessionMessages[activeResearchId]` contains BOTH a user-role message with the transcript AND an assistant-role message with Bob's answer. `modelTier` reflects local-voice path (not `gemini-live`).
- **Pass Condition**: Turn count in ChatView matches call turn count. User + assistant text both present.
- **Evidence**: LocalStorage `bob_session_messages_v3` JSON after 3 turns.

### AC-13: 10-Workflow stability matrix
- **Type**: `rubric`
- **Dimension**: Stability across 10 consecutive Prompt + 10 consecutive Call + 5 Read Aloud start/stop cycles.
- **Scale**: 1-5
- **Anchors**:
  1 = ≥ 3 crashes, stuck states, or ERROR per 10-run block.
  3 = 1-2 stuck states or false negatives per 10-run block; recovery requires refresh.
  5 = 10 Prompt end-to-end PASS, 10 Call turns PASS (each: transcript → Bob reply → audio), 5 Read-Aloud stop/restart PASS. Zero crashes. All states reach IDLE cleanly.
- **Pass Threshold**: ≥ 4
- **Evidence**: Manual run log. Timestamped per workflow.

### AC-14: No core Bob regressions
- **Type**: `rule`
- **Given**: Existing feature set.
- **When**: User performs normal text chat, creates new research session, opens tabs, creates task from extract, saves note, opens extension settings, updates Gemini API key.
- **Then**: All features behave identically to baseline (before voice changes). No styling regressions. No console errors unrelated to voice.
- **Pass Condition**: Smoke-test checklist for 8 features all PASS.
- **Evidence**: Smoke-test run log.

## Open Questions
- [ ] Q1: Moonshine `TextToSpeech.voices()` — does it actually return ≥ 2 distinct en_us voices? If only 1 voice available, selection card shows it + "More voices coming soon" placeholder cards. Actionable fallback confirmed.
- [ ] Q2: Chatterbox Nano — does a stable WASM/CPU-only npm package exist that integrates ≤ 600 MB RAM on 8 GB Windows? If no stable integration found by bench task, skip entirely (Kokoro = Moonshine TTS current), mark as "coming soon" in Settings.
- [ ] Q3: Desktop Electron app model storage directory — should downloaded WASM models also be mirrored to the app model dir for offline? Current Moonshine Cache-only is acceptable for v1; desktop bridge persistence can be deferred unless user rejects.
