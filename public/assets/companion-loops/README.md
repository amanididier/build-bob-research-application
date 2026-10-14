# Bob Companion Loop Assets

Drop short, seamless Bob animation loops in this folder. These are intended to replace generic static icons in the floating companion UI.

Recommended filenames:
- `bob-idle.webm` — gentle idle motion
- `bob-listening.webm` — listening / attention
- `bob-thinking.webm` — thinking while a response is prepared
- `bob-speaking.webm` — talking loop
- `bob-success.webm` — brief success / completion animation

Prefer WebM with alpha transparency where supported, with an optimized MP4/WebP fallback if needed. Aim for 1–3 second loops, no audio track, consistent framing, and a transparent or clean background. Keep the 3D yellow Bob character and turquoise bow tie visually consistent. Do not use copyrighted character or music assets without permission.

The UI should show a static accessible fallback when a loop is missing or reduced-motion is enabled. Register filenames in the companion asset map; do not construct arbitrary asset paths from model output.
