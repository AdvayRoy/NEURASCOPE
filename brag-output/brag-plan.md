# Brag Plan: NEURASCOPE

## What is this app?
NEURASCOPE is a synthetic attention laboratory: it runs a short-form video past 10,000 seeded synthetic viewers (CORTEX, four behavioral cohorts), finds the exact moments attention fractures, explains why, simulates a patch, and hands back a Pre-flight Brief — before the video is published.

## The angle
A pre-flight telemetry film. No metaphors, no stock footage: the real workspace is the hero. The viewer watches a video get tested on a synthetic audience the way an aircraft gets wind-tunnelled — the retention curve, the fracture, the counterfactual lift, the brief. Scientific confidence through restraint: calm type, long holds, the UI's own evidence-tier honesty left visible ("DEV FIXTURE · NOT ORIANE OUTPUT", "not measured activation").

## Hook (first 3 seconds)
Ink-black field. A monospace eyebrow — `NEURASCOPE · SYNTHETIC ATTENTION LABORATORY` — then the claim, large and light: **"10,000 seeded synthetic viewers."** followed by **"Same seed, same answer."** (verbatim README claim). It earns the next 20 seconds because it is a measurable promise, not a vibe.

## Key moments (the middle)
- The real workspace *playing*: playhead sweeping the retention / hazard / synthetic-EEG timeline while the 3D cortex and the 10,000-viewer ring update (captured frame-by-frame from the live fixture run).
- **Fracture F1 · 2.70–3.20 s**: the orange window on the timeline, the Inspector reading "ATTENTION FRACTURE F1", cohorts dropping "−17% across F1".
- **SIMULATE PATCH** → `COUNTERFACTUAL · Split the dense line` with the mint counterfactual retention line lifting above baseline and the **+2.1 pts** card.
- **Pre-flight Brief**: primary risk → why CORTEX predicts it → observed in the video → recommended change → **+2.4 pts predicted survival**.

## Outro / punchline
NEURASCOPE wordmark (the product's own letterspaced treatment) and its tagline, verbatim: **"Test on synthetic attention before you spend real attention."** Footer in mono, the product's own epistemic line: `Oriane observes · CORTEX predicts · platform analytics validate later`.

## User flow worth showing
entry (Run on development fixture) → workspace playing → select Fracture F1 → Simulate patch (counterfactual) → open Pre-flight Brief → simulated result (+2.4 pts). This flow is the centerpiece; scenes 2–5 are the product doing it.

## Tone
- Preset: polished
- Creative direction: premium research-product energy — telemetry, not marketing. Scientific, calm, exact.
- Interpretation: 6 scenes with long holds (3–5 s), soft 0.5–0.7 s crossfades, slow camera pushes into real UI, light-weight Geist type with generous tracking, no exclamation marks, no bullet lists, numbers quoted from the UI exactly.

## Format: landscape — 1920x1080
## Duration: 22 seconds

## Visual identity (from the project — src/app/globals.css)
- Background: `#0b0c0e` (ink), panels `#111316` / `#16191d`
- Accent: `#8fb3ff` (signal), fracture `#ff7a45`, counterfactual `#9be3c7`
- Text: `#eceae4` (fg), `#a9adb3` (fg-2), `#6d727a` (fg-3)
- Display font: Geist Sans (light / regular, letterspaced — as the app's wordmark)
- Body font: Geist Mono (labels, telemetry)
- Strongest visual element: the workspace itself — 3D cortex with the 10,000-point viewer ring, the Timeline instrument with F1/F2 fracture windows, the orange `ATTENTION FRACTURE` inspector, the mint counterfactual curve.

## Share copy (draft)
Introducing NEURASCOPE: test on synthetic attention before you spend real attention. 10,000 seeded synthetic viewers find where a video fractures, simulate the patch, and hand back a Pre-flight Brief — before you post.

## Audio direction
- Role: warm bed, low in the mix — supports the telemetry feel, never leads.
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (109.96 BPM, bundled preset cues)
- Music treatment: starts at 0 under a 0.6 s fade-in, ~0.45 volume through the body, fade out across the last 1.6 s so the outro tagline sits in near-silence.
- Music cue guidance: preset read (`assets/music/cues/…vol-12…json`). Strong cues targeted: 8.74 s (inspector punch-in / fracture lands), 13.11 s (+2.1 pts counterfactual card), 17.47 s (+2.4 pts brief result), 19.66 s (tagline). Scene cuts sit on beat-grid points: 3.27, 7.64, 12.02, 15.84, 19.10.
- Audio-reactive treatment: subtle; music RMS/bass breathes the background signal glow and the halo behind the UI frame. No waveform/equalizer visuals, no text pulsing.
- SFX posture: sparse, low high-frequency risk. 3–4 cues total: a soft drop on the hook claim, a gentle select/click when F1 is chosen, a soft drop when the counterfactual card lands, a quiet bell-ish accent under the +2.4 pts result. Nothing on the outro.
- Audio-coupled moments: hook line settles on a beat; F1 selection = simulated interaction (click); +2.1 and +2.4 reveals land on strong cues.
- Restraint rule: no stingers, no whooshes on every cut, music never above the UI; outro ends quiet.

## Storyboard

### Scene 1 — Hook — 3.27 s (0.00–3.27)
Ink field with a faint telemetry grid and a slow signal-blue radial glow. Mono eyebrow `NEURASCOPE · SYNTHETIC ATTENTION LABORATORY` fades in top-left. Headline (Geist light, ~92px): "10,000 seeded synthetic viewers." Second line (fg-2): "Same seed, same answer." Hairline rule draws under the headline.
Sequential/interaction: yes — eyebrow, then line 1, then line 2 (each holds ≥1.2 s settled).
Audio intent: quiet confidence; music fades in under the type.
Audio-coupled idea: line 1 lands on a beat (1.09 s) with a soft drop.
Music: warm bed, fading in
Transition mood: soft crossfade → Scene 2

### Scene 2 — The workspace, playing — 4.37 s (3.27–7.64)
Full-frame real workspace (captured playback sequence): playhead sweeps 0.0 → 6.9 s, retention / hazard / synthetic EEG lanes, cortex heat on DK parcels, 10,000-viewer ring, cohort percentages falling (Cold Scroller 100% → 33%). Slow push-in 1.00 → 1.06. Small mono caption chip bottom-left: `SIMULATE · CORTEX · 10,000 seeded viewers · four cohorts` (from the app's own labels). The header badge `DEV FIXTURE · NOT ORIANE OUTPUT` stays visible on purpose.
Sequential/interaction: yes — the app's own playback is the motion.
Audio intent: the bed carries; no SFX.
Audio-coupled idea: none (background glow breathes with RMS).
Music: warm bed
Transition mood: soft crossfade → Scene 3

### Scene 3 — Attention Fracture F1 — 4.38 s (7.64–12.02)
Real screenshot with F1 selected. Camera pushes toward the right column: Synthetic Reviewers showing `−17% across F1` and the Inspector `ATTENTION FRACTURE F1 · 2.70–3.20 s`; the orange F1 window is lit on the timeline. Mono label `FRACTURE` + `F1 · 2.70–3.20 s` appears bottom-left, with the one-line mechanism from the UI: "processing demand rising, unresolved payoff rising".
Sequential/interaction: yes — the fracture selection is implied by the cut (click SFX at scene start); the push-in lands on the strong cue at 8.74 s.
Audio intent: focus; a single soft click.
Audio-coupled idea: beat-locked push-in landing at 8.74 s.
Music: warm bed
Transition mood: soft crossfade → Scene 4

### Scene 4 — Simulate patch — 3.82 s (12.02–15.84)
Real screenshot after SIMULATE PATCH: `COUNTERFACTUAL · Split the dense line` under the metrics, the mint counterfactual retention line sitting above baseline, survival 72% → 73%. Camera drifts from the timeline (the lift) up to the metrics strip. Mono label `INTERVENE` + the UI's own result: "Split the dense line · +2.1 pts". The +2.1 value lands on the 13.11 s cue.
Sequential/interaction: yes — label then value.
Audio intent: a quiet positive accent (soft drop), not a fanfare.
Audio-coupled idea: beat-locked value reveal at 13.11 s.
Music: warm bed
Transition mood: soft slide/crossfade → Scene 5

### Scene 5 — Pre-flight Brief — 3.26 s (15.84–19.10)
The real Pre-flight Brief panel (tall capture) over the dimmed workspace. Camera slides down the panel: `1 PRIMARY RISK F2 4.4–5.4 s −3.0 pts survival` → `5 RECOMMENDED CHANGE Split the dense line` → `6 AFTER SIMULATION +2.4 pts predicted survival`. Mono label `PRE-FLIGHT BRIEF` bottom-left; the panel's own footer `Oriane observes · CORTEX predicts · platform analytics validate later` must be readable.
Sequential/interaction: yes — the pan reveals sections in order; +2.4 pts lands on 17.47 s.
Audio intent: resolution; a quiet bell-ish accent under +2.4.
Audio-coupled idea: beat-locked +2.4 at 17.47 s.
Music: warm bed, begins to fade
Transition mood: soft crossfade → Scene 6

### Scene 6 — Outro — 2.90 s (19.10–22.00)
Ink field. `NEURASCOPE` wordmark (letterspaced, light) settles; tagline "Test on synthetic attention before you spend real attention." fades in on the 19.66 s cue; mono footer `Oriane observes · CORTEX predicts · platform analytics validate later`. Hold. Music fades to silence.
Sequential/interaction: wordmark → tagline → footer.
Audio intent: quiet landing.
Audio-coupled idea: tagline on 19.66 s cue; music fade-out across the last 1.6 s.
Music: fading out
Transition mood: hold on last frame

**Music mood for this video:** polished / warm, kept low
**Audio summary:** a single warm bed fades in under the hook, breathes beneath the real UI with 3–4 soft, motion-matched accents on the F1 click and the two "+pts" results, and fades to silence under the tagline.
