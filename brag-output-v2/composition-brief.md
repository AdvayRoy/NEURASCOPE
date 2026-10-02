# Hyperframes Composition Brief: NEURASCOPE — alternate cut (v2)

Objective: a 21.5 s, 1920×1080, 30 fps launch film built from real fixture-mode NEURASCOPE UI,
driven by the Ask/analyst feature. Faster and more interaction-led than v1
(`../brag-output/`), same palette, type and restraint. No voiceover.

## Source frames (Playwright, 1440×810 @2x unless noted; `tools/capture-ask.mjs`)
- `A-workspace.png` — workspace at 4.40 s, no fracture selected
- `B-ask-focus.png` — Ask bar focused
- `C-type-01..12.png` — 12 cumulative prefixes of the creator prompt (accelerated typing)
- `D-answer.png` — answer 1 (fracture F2 specific) + Focus F2 action
- `E-focus-fracture.png` — after clicking Focus F2: ATTENTION FRACTURE F2 · 4.40–5.40 s
- `F-answer-upside.png` — chip “Which patch has the most upside?” → answer 2 + Simulate action
- `G-counterfactual.png` — after clicking Simulate: COUNTERFACTUAL · Split the dense line
- `H-brief.png` — Pre-flight Brief panel open (same layout as G)
- `T-brief-result.png` — Brief with “6 AFTER SIMULATION +2.4 pts” (1440×1100 @2x → 1920×1467)
- `workspace-play.mp4` — real playback sequence (shared with v1)
- `boxes.json` — DOM bounding boxes (CSS px; ×4/3 → canvas px) for the synthetic cursor

## Visual identity (unchanged from v1)
ink #0b0c0e · fg #eceae4 · fg-2 #a9adb3 · low-emphasis mono #8a8f97 · signal #8fb3ff ·
fracture #ff7a45 · counterfactual #9be3c7 · Geist / Geist Mono (local woff2).

## Camera model
Single helper `cam(scale, cx, cy)` → `{scale, x: 960 − cx·scale, y: 540 − cy·scale}` with
`transformOrigin 0 0`, so every scene starts exactly where the previous one ended (hard cuts
are seamless) and pushes/pulls are plain transform tweens. Framings are clamped so the
screenshot always covers the canvas.

## Scenes (hard cuts on the 120 BPM grid; 0.2 s dissolves only where noted)
| t | scene | motion |
|---|---|---|
| 0.00–2.02 | Hook | eyebrow 0.10 · “10,000 viewers.” 0.52 · “One question.” 1.02 · out 1.90 |
| 2.02–4.52 | Workspace video | cam 1.00→1.04, label chip 2.52 |
| 4.52–10.02 | Ask | cursor→Ask (click 4.90) · push to 1.5 on answer region 4.52–5.27 · typing frames 5.02–6.40 (0.125 s each) · Enter 6.52 · answer dissolve-in 6.77 · outline pulse 7.52 · cursor→Focus F2 (click 10.02) |
| 10.02–12.02 | Inspector F2 | pull out 1.5→1.0 (0.55 s) · lean 1.12 right · cursor→chip (click 12.02) |
| 12.02–14.02 | Upside answer | push to 1.5 (0.5 s) · outline pulse · cursor→Simulate (click 14.02) |
| 14.02–16.02 | Counterfactual | pull out (0.55 s) · lean 1.10 to header stats · card 14.52 · cursor→PRE-FLIGHT BRIEF (click 16.02) |
| 16.02–19.02 | Brief | panel slides in from right 0.35 s (H slice over G) · dissolve to T 16.52 · pan down to +2.4 pts landing 17.52 · card 17.52 |
| 19.02–21.50 | Outro | wordmark scale 1.05→1 · sub 19.37 · tagline 19.52 · footer 20.02 |

## Audio
Music `vol-1` 120.19 BPM, volume by data-automation (0→0.5 @0.5 s, hold, →0 @21.5).
SFX: click_003 at 4.90 / 10.02 / 12.02 / 14.02 / 16.02 (0.5); impactSoft 0.52 and 6.77 (0.4);
impactBell 17.52 (0.25). Audio-reactive ambient glow (hook/outro only) from pre-extracted
`audio-data.js` (30 fps, 16 bands, trimmed to 22 s).

## Hyperframes rules observed
Root `data-composition-id="neurascope-brag-v2"`, 1920×1080, duration 21.5; single paused GSAP
timeline at `window.__timelines["neurascope-brag-v2"]`; initial hidden states via immediate
`gsap.set`; transforms/opacity only (no layout props); unique ids on every `<audio>`; relative
local assets; no network.
