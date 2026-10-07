# Bob Voice System — Local-First Overhaul — Implementation Plan

## Task 1: Fix voiceConfig + types — Unify state machine + silence windows
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Update `DEFAULT_VOICE_CONFIG`: set `liveEnabled: false` (permanently disable Gemini Live attempts).
  - Set `promptSilenceDurationMs: 1500` (1.5 s not 10 s).
  - Add three new configurable constants to voiceConfig (don't duplicate in code): `MODEL_LOAD_TIMEOUT_MS=90000`, `MAX_CALL_IDLE_MS=60000`, `SILENCE_TIMEOUT_MS=1500`.
  - In `types.ts`: rename/add VoiceState to the unified set: IDLE, REQUESTING_PERMISSION, LOADING_MODEL, CONNECTING_LOCAL_ENGINE, LISTENING, USER_SPEAKING, TRANSCRIBING, TRANSCRIPT_READY, THINKING, SPEAKING, INTERRUPTING, STOPPING, ERROR. Keep existing FALLBACK if referenced but ensure it's unused in new paths.
  - In STTResult error codes, ensure MODEL_LOADING, MODEL_LOAD_FAILED, MICROPHONE_PERMISSION_DENIED, MICROPHONE_NOT_FOUND, NETWORK, STT_EMPTY, STT_FAILED, NO_AUDIO all present.
  - Add a new `DEFAULT_VOICE_KEY` storage constant to `voiceConfig.ts`: `bob_voice_default = 'bob_voice_default_v1'`.
- **Acceptance Criteria Addressed**: AC-4, AC-9
- **Test Requirements**:
  - `rule` TR-1.1: Import DEFAULT_VOICE_CONFIG in a small test and assert `liveEnabled === false`, `promptSilenceDurationMs === 1500`, `SILENCE_TIMEOUT_MS === 1500`.
  - `rule` TR-1.2: For every state in the 14-state list, `VoiceState extends type` matches (TS `--noEmit` typecheck passes).
- **Notes**: Minimal change. All other tasks depend on correct values here.

## Task 2: Remove old WebSpeech/browser paths + helpers from sttProvider and ttsProvider
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - In `sttProvider.ts`: Remove any dead `hasWebSpeech()` method or fallback. If missing `hasWebSpeech` anywhere elsewhere (it is: `voiceController.ts` calls `!stt.hasWebSpeech()`), replace with true because Moonshine is always the engine.
  - In `ttsProvider.ts`: Confirm `floatToWavBlob`, `classifyTTSError`, `ensureLoaded`, `speak`, `speakPrepared`, `prepare`, `stop`, `isSpeaking`, `listVoices`, `getEngine`, `getPlannedEngine`, `subscribe`, `getStatus` all exist and use only Moonshine. Remove remaining references to `speechSynthesis`, `gemini`, `fetch('generativelanguage.googleapis.com')`, `SpeechSynthesisUtterance`. Confirm `getPlannedEngine()` returns 'moonshine-tts' (it does).
  - Verify the unstaged changes compile. Run `tsc --noEmit`.
- **Acceptance Criteria Addressed**: AC-1, AC-3
- **Test Requirements**:
  - `rule` TR-2.1: `grep -n "hasWebSpeech\|speechSynthesis\|generativelanguage\.googleapis" src/lib/voice/*.ts` returns 0 matching lines after changes.
  - `rule` TR-2.2: `npm run lint` / `tsc --noEmit` exits 0.

## Task 3: Rewrite voiceController Call entry — Local-only, no Live attempt, remove Gemini gate
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - Delete/rename `startCallSession` and `startFallbackCall`. Replace with a single `startLocalCallSession(stream: MediaStream)` that is always called — NO attempt at `liveProvider.connect()`. NO `GeminiLiveProvider.isSupported()` check. NO `apiKey` gate at lines 287-292.
  - `startLocalCallSession`: setState to CONNECTING_LOCAL_ENGINE, startVad(stream, SILENCE_TIMEOUT_MS=1500), armIdleTimer with `idleNoSpeechTimeoutMs` then setState to LISTENING. Start `stt.start` with the same callbacks used by `startFallbackCall` (final transcript → `handleFinalTranscript`).
  - `handleSpeechEnd` for Call: setState to TRANSCRIBING then call `stt.flush()`. When STT final fires → `handleFinalTranscript`. In `handleFinalTranscript`, send to `onSubmitMessage` which triggers existing text brain. The `feedAIStreamChunk` + `finalizeAIResponse` already exist — keep using them.
  - After Bob reply audio queue empties, return to LISTENING (not IDLE). Call stays active until user clicks End Call.
  - At end of every call turn (Bob audio end + user transcript submitted), call `handlers.onVoiceExchange?.(userText, bobText)` with accumulated turn pair so BOTH sides persist to chat (AppContext `appendVoiceExchange`). Currently `onVoiceExchange` is only fired in Live path. Store userText/bobText accumulation fields on controller and reset per turn.
  - Remove `liveActive`, `liveBobText`, `liveBobFromTranscription`, `pendingLiveUserText` fields (or explicitly make them unused).
  - Update `getProviderLabel()`: call mode shows `"Local Call (Moonshine STT → Bob brain → Moonshine TTS)"`, prompt shows `"Local Prompt (Moonshine STT only)"`.
  - Add REQUESTING_PERMISSION state: set before `micManager.startCapture()` call in `startVoiceMode`, clear when capture succeeds/fails.
  - Wrap model-load start in LOADING_MODEL state: bridge `stt.subscribe(sts=>...)` listener within controller so state changes to LOADING_MODEL during download and back when ready.
- **Acceptance Criteria Addressed**: AC-2, AC-12, AC-9, AC-1
- **Test Requirements**:
  - `rule` TR-3.1: In Call mode with `liveEnabled: false` + no API key stored + DevTools Offline, speak → 1.5s silence → "Bob generates reply + speaks locally" works. Breakpoint on `liveProvider.connect` is never hit.
  - `rule` TR-3.2: After 3 call turns, localStorage `bob_session_messages_v3` contains BOTH user and assistant messages for each turn.
  - `rubric` TR-3.3: State transition correctness. Scale 1-5, anchors 1=random jumps, 3=1 skipped state per workflow, 5=exactly REQUESTING_PERMISSION→LOADING_MODEL(or skip)→CONNECTING_LOCAL_ENGINE→LISTENING→USER_SPEAKING→TRANSCRIBING→THINKING→SPEAKING→LISTENING. Threshold ≥ 4. Evidence: debug state transition log.

## Task 4: Add AbortController + timeouts + failWith-recovery for all long ops
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - Define per-op timeouts from voiceConfig: `MODEL_LOAD_TIMEOUT_MS=90000`, `MIC_START_TIMEOUT_MS=8000`, `STT_FINALIZE_TIMEOUT_MS=10000`, `TTS_GENERATE_TIMEOUT_MS=15000`, `FIRST_AUDIO_TIMEOUT_MS=10000`.
  - `startVoiceMode`: wrap `micManager.startCapture()` with MIC_START timeout. Timeout message: "Microphone didn't respond. Check your mic or try again."
  - Within Moonshine `ensureLoaded` (both STT and TTS): add timeout wrapper so LOADING_MODEL state returns ERROR if > 90 s or if the load Promise never settles. Surface error in the state listener.
  - `endDictation → stt.finalize()`: wrap in STT_FINALIZE_TIMEOUT. Fail with "Transcription is taking too long. Try again."
  - `tts.speak`: enclosing race between `engine.say()` and TTS_GENERATE_TIMEOUT. Message "Bob couldn't generate speech quickly enough. Try shorter text."
  - In `audioQueue.processQueue`: every chunk starts a FIRST_AUDIO_TIMEOUT for the first chunk only. Cleared on first `onStart` fire.
  - All timeouts use `AbortController` where supported (Moonshine API may not, but at minimum the timeout rejects the wrapper promise and drives teardown + ERROR pill).
  - Every ERROR state enters via existing `failWith(message)` that already does teardown → ERROR → scheduleErrorClear. Ensure teardown aborts/cancels the timeout timers.
- **Acceptance Criteria Addressed**: AC-10, AC-11
- **Test Requirements**:
  - `rule` TR-4.1: Simulate a hanging mic start (stub getUserMedia never resolves). After ~8.5 s → ERROR pill shows, state → ERROR, teardown called.
  - `rule` TR-4.2: In 5 rapid STOP/interrupt cycles, no timeout leak (no console timeouts pending, `node:` clearTimeout count stable).
  - `rule` TR-4.3: ERROR pill for each of 6 failure modes names exact root cause; "try again" never appears standalone.

## Task 5: Wire STT/TTS model-status subscriptions into useVoiceStore
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - In `useVoiceStore.ts`, add fields: `sttModelStatus` (STTModelStatus), `ttsModelStatus` (TTSModelStatus).
  - Call `stt.subscribe(status => set({ sttModelStatus: status }))` and `tts.subscribe(status => set({ ttsModelStatus: status }))` at store init, matching the pattern used for existing subscriptions.
  - Expose actions: `downloadSttModel`, `downloadTtsModel`, `deleteSttModel`, `deleteTtsModel`, `previewTtsVoice(voiceId: string)`, `setDefaultVoice(voiceId: string)`, `getDefaultVoice(): string`.
  - Actions for delete: Moonshine stores in Cache API. Implement a helper: `async clearMoonshineCache()`. Reasonable approach: iterate `caches.keys()`, delete caches whose name matches Moonshine package patterns (a conservative best-effort — if exact names unknown, expose `deleteSttModel` as "Clear model cache (will re-download on next use)" and note limitation in the UI hint). Test model re-download after clear.
  - Persist default voice: read/write `localStorage.getItem(DEFAULT_VOICE_KEY)` and set it via `tts.getEngineInstance().voice()` if supported. If `TextToSpeech` supports a `.voice(id)` fluent method, use it before each `say()`/`synthesize()` call.
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-8
- **Test Requirements**:
  - `rule` TR-5.1: DevTools → Application → Cache → clear Moonshine entries → store sttModelStatus.state becomes 'idle' on refresh.
  - `rule` TR-5.2: `setDefaultVoice('aria')` → localStorage key → reload → `getDefaultVoice()` === 'aria'.
  - `rule` TR-5.3: `useVoiceStore.getState().sttModelStatus` non-undefined immediately after store hydration.

## Task 6: Build Settings → Voice Models section (new tab + 3 cards)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - In `SettingsPage.tsx`, extend `activeTab` union to include `'voice'` alongside existing `'ai'|'updates'|'memory'|'browser'|'privacy'`.
  - Add a tab header button "Voice" with icon `Mic` or `Volume2`.
  - Implement `<VoiceModelsSection />` inline or as an extracted component file `src/components/modals/VoiceModelsSection.tsx` (new file OK because dedicated section is substantial).
  - Section renders:
    - **Card 1: Speech Recognition — Moonshine Tiny**
      Purpose: Local dictation and call speech recognition.
      Approx size: ~45 MB (Moonshine Tiny on WASM).
      Version: `@moonshine-ai/moonshine-wasm` package.json version.
      Storage used: `(downloadedBytes / 1024 / 1024).toFixed(1)` or "Pending".
      Status pill: `sttModelStatus.state` mapped.
      Progress bar: if `state in ('downloading'|'loading')`, show real % and transfer-rate line (`message` already contains MB/s/MB from onProgress).
      Buttons:
        - [Download] → triggers `stt.ensureLoaded()` by calling a new store action `preloadSttModel()` which is just `await stt.start(noop, noop)` then `stt.stop()` to force download.
        - [Use] → disabled (auto-used on next mic click; or simply same as Download).
        - [Delete model] → calls `deleteSttModel()` store action with confirm dialog.
        - [Test mic] → requests mic, captures 2 seconds via micManager, shows "Mic works ✓" / error pill.
    - **Card 2: Text-to-Speech — Moonshine**
      Same layout plus Voice Selection grid (AC-8) inline under a "Voices" subheader.
      Approx size: ~65 MB placeholder.
      [Preview voice] button per card (Task 7 content here).
    - **Card 3: Alternative TTS — Chatterbox Nano**
      Status pill: "Not available locally (coming soon)". Download button disabled with tooltip. Note: skip any actual Chatterbox integration unless Task 15 bench decides otherwise.
  - Tabs layout styling matches existing Settings tab buttons (same rounded pill, borders).
- **Acceptance Criteria Addressed**: AC-7, AC-6
- **Test Requirements**:
  - `rule` TR-6.1: DOM contains 3 cards. Click Settings → Voice → all three cards visible; progress bar animates during download.
  - `rule` TR-6.2: Click Delete model → confirm → cache cleared → status changes to "Not downloaded".
  - `rubric` TR-6.3: Visual match to existing Settings quality. Scale 1-5, anchors 1=raw unstyled, 3=styled inconsistent, 5=matches Bob card/typography/shadow. Threshold ≥ 4. Evidence: screenshot.

## Task 7: ChatGPT-style voice selection cards with preview
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 6
- **Description**:
  - Use `tts.listVoices()` to render a grid of voice cards. Each card has:
    - Voice card image placeholder: rounded avatar (initials of voice name, colored circle) OR a waveform glyph.
    - Voice name + voice metadata (gender/style if Moonshine provides it; else neutral "Sample" label).
    - [▶ Play sample] button → plays `tts.speak("Hello! I'm Bob, your research companion.")` using that selected voice (apply via `setDefaultVoice` and/or a temporary voice arg to `tts.speak`).
    - Current default badge: a small checkmark pill if this voice matches `getDefaultVoice()`.
    - [Set as default] button → calls store action; persists.
  - If `listVoices()` returns only 1 entry, render that 1 card + 3 "More voices coming soon" placeholder cards with Download disabled.
  - Ensure `tts.getEngineInstance().voice()` fluent call supported. If Moonshine API does not expose per-call voice id directly, store default globally and call setter method on engine on demand.
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `rule` TR-7.1: Number of cards ≥ 2 or ≥ 1 + 3 placeholders; each [Play sample] triggers audio playback within 3.5 s.
  - `rule` TR-7.2: Set default → reload → default badge on same card.

## Task 8: Build missing-model Bob-style install prompt overlay card (STT + TTS)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - New component: `src/components/voice/ModelInstallCard.tsx`.
  - Render conditionally in BottomComposer OR as a dedicated overlay portal.
  - Trigger rules:
    - STT missing: Triggered inside `startVoiceMode` when `stt.getStatus().state !== 'ready'` AND user clicks Prompt/Call. Show STT_MODEL_MISSING_CARD content:
      Title: "Bob Voice needs one small local model". Body: "Moonshine Tiny is required for offline speech recognition. Size: ~45 MB. It runs directly on your computer and does not use Gemini transcription credits." Buttons: [Download & Enable] → starts STT model download; [Not now] → cancels.
    - TTS missing: Triggered inside `speakText`/`Read Aloud` entry when `tts.getStatus().state !== 'ready'`. Show TTS_MODEL_MISSING_CARD:
      Title: "Bob needs a local voice". Body: "Moonshine is required for offline speech. Size: ~65 MB. This voice runs directly on your computer and does not require an API key." Buttons identical pattern.
  - Real progress: body copy below title updates to show % + MB/s during download using `sttModelStatus.message`/`ttsModelStatus.message`.
  - Style: Bob-card white / dark-surface, soft shadow, rounded 2xl, exactly as existing ThinkingCard / AuthModal visual language, no raw alert(), no <Modal generic>, no stack traces.
  - Once download completes, card auto-dismisses and retries the original action (start dictation / start call / start read-aloud).
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `rule` TR-8.1: Fresh profile (no cache) → click Mic → Prompt → card appears. Progress updates. After 100%, Prompt mode auto-starts. Same for Read Aloud with empty TTS cache.
  - `rule` TR-8.2: Click [Not now] → card closes, mode does NOT start.
  - `rubric` TR-8.3: Card visual fidelity. Scale 1-5, anchors 1=browser alert, 3=styled but mismatched, 5=matches Bob ThinkingCard 1:1 typography/border-radius/shadow/blur. Threshold ≥ 4.

## Task 9: BottomComposer — wire REQUESTING_PERMISSION, model cards, TRANSCRIPT_READY indicator, prompt silence 1.5s auto-finalize
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3, Task 5, Task 8
- **Description**:
  - Show a REQUESTING_PERMISSION pill / overlay line in composer when state === REQUESTING_PERMISSION.
  - Show TRANSCRIPT_READY subtle "Done transcribing" pill (green, check icon) for 2.5 s after Prompt finalization completes.
  - Wire ModelInstallCard trigger: in `startMode('prompt'|'call')`, check `sttModelStatus.state` before awaiting start. If not ready, open install card and chain completion into start.
  - Prompt mode auto-final: VAD fires onSpeechEnd after 1.5 s → stt.flush() → `voiceController` should auto-emit final and call `onTranscriptUpdate(final, true)` then return to LISTENING. BUT per FR-12: NEVER auto-send, NEVER auto-return to IDLE without user confirmation. Keep mic open after single auto-final? NO — simpler: Prompt mode works exactly as the existing `endDictation()` manual flow, EXCEPT the 1.5 s silence VAD end auto-calls `endDictation()` for the user (because old prompt silence window was 10 s; now we want 1.5 s → finalize). This single change makes "dictate, stop talking, transcript lands in composer" work without user clicking End. Verify it does NOT call `sendMessage` — only `setPrompt(transcript)`.
  - Add READ ALOUD entry: `speakText` before starting calls ttsModelStatus check, opens ModelInstallCard if needed.
  - Keep STOP button always visible when speaking (Bob speaking / mic active).
- **Acceptance Criteria Addressed**: AC-4, AC-12, AC-6
- **Test Requirements**:
  - `rule` TR-9.1: Prompt mode → speak 4-word sentence → stop 1.5 s → transcript appears in textarea. `sendMessage` NOT invoked (add a spy/log to confirm).
  - `rule` TR-9.2: REQUESTING_PERMISSION pill visible for 1-3 s before mic prompt appears. TRANSCRIPT_READY shows for 2-3 s after final.

## Task 10: ChatView Read Aloud — Stop mid-pass reliability + TTS-missing card trigger
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3, Task 8
- **Description**:
  - In ChatView `handleSpeakMessage`: Before calling `voiceController.speakText`, check `ttsModelStatus` from store. If `state !== 'ready'` → render the same TTS install ModelInstallCard (portal). Do NOT try speak until ready.
  - After `stopSpeaking()` call, also explicitly invoke store-level ttsStop guard (already exists via `voiceController.stopSpeaking → interrupt → audioQueue.interrupt → tts.stop`). Verify stale-audio guard: `speakText` increments a `generation`; all chunks check generation match.
  - Ensure Read Aloud on STOP:
    (a) `tts.stop()` → Moonshine engine stops.
    (b) `audioQueue.queue.length = 0` (interrupt → newGeneration → clear queue).
    (c) Any `<audio>` currently playing stopped.
    (d) speaking listener fires `speaking:false` within 500 ms.
  - No change to message formatting, copy, save-to-notes — only Read Aloud logic.
- **Acceptance Criteria Addressed**: AC-3, AC-10
- **Test Requirements**:
  - `rule` TR-10.1: Start Read Aloud on long text. Click Stop at 2 s. No audio plays after 2.5 s elapsed. `voiceController.isSpeaking()` === false.
  - `rule` TR-10.2: Repeat start-stop 5x. All cycles pass, no stutter restarts.

## Task 11: Diagnostic pills mapping FR-9 across all states
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 3, Task 4, Task 9
- **Description**:
  - Create a mapping from `VoiceState` + `voiceDiagnostics.lastEvent` to pill messages in BottomComposer (and VoiceCallOverlay) so all 17 required pills appear.
  - Existing `errorMessage` and `notice` channels already used; extend mapping with explicit `notify()` calls inside controller for:
    - "Microphone ready" — micManager.startCapture success, stream got.
    - "Loading Moonshine..." — stt.status state === 'loading'.
    - "Moonshine ready" — stt.status state === 'ready' after loading.
    - "Listening..." — state LISTENING.
    - "Transcribing locally..." — state TRANSCRIBING.
    - "Bob is thinking..." — state THINKING.
    - "Bob is speaking" — state SPEAKING entry.
    - "Bob stopped speaking" — on playback end from audio queue when call was active.
    - "Local voice ready" — tts.status state === 'ready'.
    - "Model download required" — before showing install card.
    - "Microphone permission denied" — classifyError MIC_DENIED.
    - "Microphone disconnected" — mic stream track ended event handler added.
    - "Transcription failed" — STT error surfaced.
    - "TTS failed" — TTS generation error.
    - "Not enough memory to load voice model" — on OOM/quota errors from Moonshine load.
    - "Model failed to initialize" — MODEL_LOAD_FAILED.
    - "Voice model downloaded successfully" — on status.state transitions 'loading' → 'ready'.
  - Also wire VoiceCallOverlay to show these pills (it has an error/notice block already — reuse).
- **Acceptance Criteria Addressed**: AC-11, AC-9
- **Test Requirements**:
  - `rule` TR-11.1: All 17 pills have distinct strings reachable via their trigger path. Screenshot/log for each.
  - `rule` TR-11.2: No pill contains just "Try again." without naming a root cause.

## Task 12: Memory management — lazy model loads + explicit Unload button
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 3, Task 6
- **Description**:
  - Currently `MoonshineSTTProvider.loaded` flag stays true once loaded. Keep hot load for fast re-entry.
  - Add explicit store actions `unloadVoiceModels()` that:
    - Calls `stt.stop()`, nulls `stt.mic`, sets `stt.loaded = false`.
    - Calls `tts.stop()`, nulls `tts.engine`, sets `tts.loaded = false`.
    - Optionally deletes cache entries (reuses delete actions).
  - Add Settings → Voice Models → one "Unload all voice models from memory" button at section bottom. Calls action, shows "Models unloaded" toast.
  - In teardown of `voiceController`, NO model unload (keep hot). Only explicit button unloads.
  - For each start of Prompt / Call / Read Aloud: only load the needed model(s). Prompt = STT only. Read Aloud = TTS only. Call = both.
  - Ensure no duplicate `AudioContext`: micManager + VAD + STT are separate but not simultaneously creating 3+ contexts. Moonshine MicTranscriber manages its own internally. Verify with DevTools Performance memory snapshot taken before/after 5 call sessions: delta MB stable < 200 MB hot loaded, no monotonic leak.
- **Acceptance Criteria Addressed**: NFR-1, AC-13
- **Test Requirements**:
  - `rule` TR-12.1: Load STT only (Prompt) → TTS.loaded === false. Load TTS only (Read Aloud) → STT.loaded initially false (loaded only if STT already ran). Call mode loads both; both loaded true.
  - `rubric` TR-12.2: Memory profile across cycles. Scale 1-5, anchors 1=leak > 500 MB / 5 cycles, 3=200-500 MB, 5=<200 MB delta after hot load. Threshold ≥ 4.

## Task 13: Add MAX_CALL_IDLE timer and all timer cleanup verification
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 3, Task 4
- **Description**:
  - Add timer `MAX_CALL_IDLE_MS = 60000` (configurable in voiceConfig). In Call mode, on every LISTENING re-entry arm this timer; on any user speech start or Bob thinking/speaking clear it. On timeout fire: endSessionWithMessage("Call went idle too long. Ended for safety.").
  - Existing `idleNoSpeechTimeoutMs` and `maximumTurnDurationMs` already 20 s / 60 s; ensure MAX_CALL_IDLE distinct: it's 60 s of Bob+user no-progress (no Bob speaking, no user speech, no thinking state), not just "no speech heard at start".
  - Clear all timers in `teardown()` — audit for any setTimeout calls outside existing 4 (idle, turn, error, silence): add MAX_CALL_IDLE.
  - `clearTimers` function now clears: idleTimer, turnTimer, errorTimer, silenceTimer (already inside vad.stop), callIdleTimer.
- **Acceptance Criteria Addressed**: AC-13 (stability), AC-9
- **Test Requirements**:
  - `rule` TR-13.1: Open Call mode, say nothing, don't touch UI → after ~61 s session ends with correct message.
  - `rule` TR-13.2: After 3 timed ends, no timers pending (Node-style pending check via browser-devtools or log).

## Task 14: Append both sides of every Local Call turn to chat
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - VoiceController currently calls `handlers.onVoiceExchange?.(user, bob)` only in `persistLiveExchange()` triggered by Gemini Live path.
  - In the new local Call path:
    - When `handleFinalTranscript(cleanText)` is called → save userText = cleanText.
    - When the final chunk of Bob reply is played back by `audioQueue` (last playback end of the generation, callGeneration matches) → save bobText = `lastBobReply` and call `handlers.onVoiceExchange?.(userText, bobText)`.
    - Use `onVoiceExchange` because `AppContext` already hooks it → `appendVoiceExchange` writes both messages.
  - Also fire it immediately after `finalizeAIResponse` if playback is empty (Bob answered with empty text — unusual but possible).
  - Prevent double-fire for same turn: use a `lastPersistedTurnId` counter or generation match so no duplicate entries.
- **Acceptance Criteria Addressed**: AC-12
- **Test Requirements**:
  - `rule` TR-14.1: 3 call turns; chat has 6 messages (3 user, 3 assistant). No duplicates.

## Task 15: Benchmark Moonshine TTS vs Chatterbox Nano on 8 GB Windows (deferred or optional integration)
- **Status**: `pending`
- **Priority**: low
- **Depends On**: Task 7, Task 10
- **Description**:
  - First run baseline bench on current Moonshine TTS, in-environment: synthesize 3 phrases (short 1 sentence, 5 sentence, 20 sentence), record metrics.
  - If Chatterbox Nano has a reliable WASM npm install (`@chatterbox/nano-wasm` or similar — verify first via npm search or skip entirely), install it as dev-only candidate, implement quick wrapper interface matching TTSProvider, run same bench.
  - Metrics collected:
    - Model download size (MB)
    - Model load time (s)
    - RAM usage pre/post (MB)
    - CPU usage sample (task manager rough %)
    - Time to first audio / first sentence (ms)
    - Realtime factor (audioDuration / generateDuration; <1 means faster than realtime)
    - Generation speed (characters/sec)
    - Voice naturalness (1-5, human listened)
    - Stability (no crashes over 10 runs)
    - Long response handling (memory usage after 1 min response)
    - Cancellation behavior after stop, after 10 stops
  - If Chatterbox Nano realtime-factor ≤ Moonshine × 1.5 AND naturalness ≥ Moonshine AND memory ≤ Moonshine × 1.3 → integrate as second TTS engine with switcher. Otherwise mark "Alternative TTS — Chatterbox Nano: coming soon" only in Settings. Always keep Moonshine default.
  - Output results to `scripts/voice-bench-results.json` artifact. Write to logs only.
  - Do NOT ship Chatterbox unless metrics pass — default path keeps Moonshine only. Keep this task status updated to `completed` with benchmark evidence; no further code if skipped.
- **Acceptance Criteria Addressed**: NFR-1 (perf evidence), AC-7 (alternative card)
- **Test Requirements**:
  - `rubric` TR-15.1: Bench completeness. Scale 1-5, 1=no metrics, 3=5/11 metrics, 5=all 11 metrics collected for both providers (or Moonshine only + explicit skip reason with evidence). Threshold ≥ 4.

## Task 16: Provider abstraction — formal STTProvider/TTSProvider/VADProvider interfaces
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 2, Task 3
- **Description**:
  - `STTProvider` already exists. Ensure it has no Moonshine-specific args leaking into call-sites. Currently `voiceController` does NOT import `MicTranscriber` directly → good. Keep.
  - `TTSProvider` already exists. Same — confirm `voiceController` only calls interface methods `speak`, `stop`, `isSpeaking`, `prepare`, `speakPrepared`. Ensure no `TextToSpeech` import outside `ttsProvider.ts`.
  - Add a `VADProvider` interface in `vad.ts`: `start(stream, cb, opts)`, `stop()`, `isDetecting()`, `inSpeech()`, `resetSpeech()`. `voiceController` depends on interface only — currently `vad` is a class instance, convert the `VoiceActivityDetector` class to explicitly export `VADProvider` interface and export `const vad: VADProvider = new VoiceActivityDetector()`.
  - Add one dummy local unit type test: create `DummySTT` that satisfies STTProvider, `DummyTTS` satisfies TTSProvider, `DummyVAD` satisfies VADProvider. TS typecheck only (no runtime).
- **Acceptance Criteria Addressed**: FR-14 (modularity), NFR-4 (no breakage)
- **Test Requirements**:
  - `rule` TR-16.1: Grep for `MicTranscriber|TextToSpeech` OUTSIDE `sttProvider.ts|ttsProvider.ts` returns 0. Grep for `class VoiceActivityDetector` usage only inside `vad.ts` exports.
  - `rule` TR-16.2: `tsc --noEmit` passes with dummy providers (declare them, don't ship — keep in a temp file or verify only via editor diagnostics).

## Task 17: Final build + lint + 10x workflow stability run + checklist
- **Status**: `pending`
- **Priority**: high
- **Depends On**: All tasks 1-16
- **Description**:
  - Run `npm install` (if dependencies changed) → `npm run build` → `npm run lint` / `tsc --noEmit`. All pass.
  - Manual stability run per AC-13 (Prompt ×10, Call ×10, Read Aloud ×5 stop-restart). Record pass/fail.
  - Fill a final AC checklist (14 ACs covered). Evidence written per AC.
  - Console errors: 0 non-voice errors. Voice warnings only where expected.
- **Acceptance Criteria Addressed**: AC-13, AC-14, NFR-2, NFR-4
- **Test Requirements**:
  - `rule` TR-17.1: `npm run build` exits 0. `tsc --noEmit` exits 0.
  - `rule` TR-17.2: Prompt 10/10, Call 10/10, Read Aloud 5/5 manual runs PASS.
  - `rule` TR-17.3: Smoke test 8 features (new session, tab, task extract, note save, extension settings, gemini key save, sidebar, new onboarding) ALL PASS.
