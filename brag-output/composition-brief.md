# Hyperframes Composition Brief: NEURASCOPE

## Objective
Create a short launch-style brag video for NEURASCOPE — a pre-flight telemetry film in which the real workspace is the hero.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 22 seconds

## Source Material
- Project root: `/Users/devin/repos/NEURASCOPE`
- Primary files read: `README.md`, `src/app/layout.tsx`, `src/app/globals.css`, `src/components/{InputScreen,Workspace,PreflightBrief,AskBar,useKeyboard}.tsx`, `e2e/canonical.spec.ts`
- Real UI captures (fixture run on the built app, Playwright @2x): `composition/assets/ui/*.png`, playback sequence `composition/assets/ui/workspace-play.mp4` (70 frames, app time 0.0→6.9 s, 30 fps interpolated, last frame held)
- Product name: NEURASCOPE
- Tagline / strongest claim: "Test on synthetic attention before you spend real attention."
- Key UI moments to show: workspace playing (timeline + cortex + viewer ring), `ATTENTION FRACTURE F1 · 2.70–3.20 s` with cohorts `−17% across F1`, `COUNTERFACTUAL · Split the dense line` → `+2.1 pts`, Pre-flight Brief → `+2.4 pts predicted survival at 8.4 s`
- Copy that must appear verbatim (all from the UI/README):
  - `NEURASCOPE` / `SYNTHETIC ATTENTION LABORATORY`
  - `10,000 seeded synthetic viewers` · `Same seed, same answer.`
  - `ATTENTION FRACTURE F1` · `2.70–3.20 s`
  - `Split the dense line` · `+2.1 pts`
  - `PRE-FLIGHT BRIEF` · `+2.4 pts`
  - `Test on synthetic attention before you spend real attention.`
  - `Oriane observes · CORTEX predicts · platform analytics validate later`

## Creative Direction
- Tone preset: polished
- Creative direction: premium research-product energy — telemetry, not marketing
- Interpretation: long holds, slow camera pushes into real UI, 0.5–0.7 s crossfades, light Geist type with wide tracking, mono eyebrows, numbers quoted exactly; no exclamation marks, no bullet lists, no generic gradients.
- Angle: a video gets wind-tunnelled on a synthetic audience before launch; the UI's own epistemic honesty (`DEV FIXTURE · NOT ORIANE OUTPUT`, "not measured activation") stays visible.
- Hook: ink field → mono eyebrow → "10,000 seeded synthetic viewers." → "Same seed, same answer."
- Outro / punchline: NEURASCOPE wordmark + "Test on synthetic attention before you spend real attention." + mono footer `Oriane observes · CORTEX predicts · platform analytics validate later`
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign

## Visual Identity
- Background: `#0b0c0e`; panels `#111316` / `#16191d`; lines `rgba(235,238,242,0.08)`
- Text: `#eceae4`, secondary `#a9adb3`, tertiary `#6d727a`
- Accent: signal `#8fb3ff`; fracture `#ff7a45`; counterfactual `#9be3c7`
- Display font: Geist Sans (variable, local `assets/fonts/Geist-Variable.woff2`), weights 300–500, letterspaced wordmark as in the app
- Body font: Geist Mono (variable, local `assets/fonts/GeistMono-Variable.woff2`)
- Visual references from the project: the app's wordmark treatment (`N E U R A S C O P E`), the orange fracture window on the Timeline, the Inspector header, the mint counterfactual line, the Pre-flight Brief panel

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 3.27 s — eyebrow, "10,000 seeded synthetic viewers.", "Same seed, same answer."
2. Workspace playing — 4.37 s — real playback capture full-frame, slow push 1.00→1.06, caption chip
3. Fracture F1 — 4.38 s — real screenshot, push-in to Inspector/Reviewers landing on 8.74 s, label `FRACTURE · F1 · 2.70–3.20 s`
4. Simulate patch — 3.82 s — tall screenshot, push-in to `Split the dense line · +2.1 pts` card landing 13.11 s
5. Pre-flight Brief — 3.26 s — tall screenshot, pan down the panel to `+2.4 pts` landing 17.47 s, footer readable
6. Outro — 2.90 s — wordmark, tagline (19.66 s), footer; music to silence

## Audio
- Audio role: warm bed, low in the mix
- Audio arc: fades in under the hook, breathes under the UI, 3–4 soft accents on the F1 click and the two "+pts" results, fades to silence under the tagline
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: `data-volume` ≈0.5, automation lane fade-in 0–0.6 s, fade-out 20.4–22 s
- Music cue guidance: bundled preset `assets/music/…vol-12….music-cues.json` (109.96 BPM); strong cues 8.74 / 13.11 / 17.47 / 19.66; scene cuts on beat grid
- Audio-reactive treatment: subtle — bass (bands 0–2) breathes the background signal glow and the halo under the UI frame; per-frame `tl.call` sampling from `assets/music/audio-data.js` (extracted with hyperframes-creative `extract-audio-data.py`, 30 fps, 16 bands, trimmed to 23 s)
- Audio-coupled moments:
  - Hook line 1 — beat-grid landing with soft impact
  - Scene 3 start — simulated F1 selection, `click_003`
  - +2.1 pts card — `impactSoft_medium_001` on 13.11 s
  - +2.4 pts result — `impactBell_heavy_000` (low volume) on 17.47 s
- SFX selection guidance: low HF-risk picks only (polished); nothing on the outro
- SFX analysis guidance: `~/.agents/skills/brag/assets/sfx/sfx-analysis.md`
- Exact SFX choice: Hyperframes decides after the animation exists
- Audio files: copied to `composition/assets/music/` and `composition/assets/sfx/`

## Hyperframes Instructions
Load `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`. /brag is its own workflow.

Requirements:
- Real UI in scenes 2–5 (captures of the live fixture run).
- All text readable; UI punch-ins keep the quoted numbers legible at 1080p.
- 22 s total (within 15–25).
- Music + sparse SFX present; no voiceover (user request).
- Beat locks: 8.74, 13.11, 17.47 (±0.15 s); smaller entrances on the beat grid (±0.10 s).
- Audio-reactive glow from pre-extracted data only.
- Local assets only: GSAP vendored at `assets/vendor/gsap.min.js`, fonts/music/SFX under `assets/`.
- `hyperframes check` before render; render locally.
