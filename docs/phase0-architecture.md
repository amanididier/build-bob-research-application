Phase 0: Baseline architecture audit for Bob Voice (local-first planning)

Scope:
- Inspect current Bob voice system (Prompt, Call, Read Aloud) in this repo path.
- Map out entry points and runtime paths for VAD, STT, TTS, and brain integration.
- Identify Gemini dependencies and cloud endpoints to prepare for local-first path.
- Produce an architecture map and baseline test plan.

What this document will cover:
- Current components and responsibilities
- Data flow between microphone input, VAD, STT, brain, TTS, and playback
- Existing fallback/dialects (Web Speech, Gemini Live, Gemini STT/TTS, Edge TTS)
- Potential local-first integration points (Moonshine STT, PocketTTS, Kokoro, etc.)
- Risks and cutover plan (phases and gating)

Deliverables:
- Phase 0 architecture map
- Baseline test plan and commands to reproduce current behavior
- Patch plan for Phase 1 scaffolding
