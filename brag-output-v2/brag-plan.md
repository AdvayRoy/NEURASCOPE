# /brag plan — NEURASCOPE · alternate cut (v2, interaction-driven)

Companion to `../brag-output/brag-plan.md` (v1). Same product, same visual language, same
fixture-mode grounding; this cut is faster, chat-driven, and built around the real Ask bar.

## Angle
A creator asks the lab one question; the lab answers with a specific fracture, a specific
cohort, a specific patch — and the creator acts on it by clicking the analyst's own actions.
Hero = the real workspace. The chat is the steering wheel, not the subject.

## Grounded facts shown (all real fixture-mode UI copy, captured via Playwright)
- Prompt typed into the real Ask bar: “I'm a content creator. Where do I lose potential
  scrollers, and what should I change to keep them watching?” (near-verbatim to the ask;
  "do I lose" instead of "am I losing" so the deterministic analyst routes to a
  fracture-specific answer — no LLM key configured, see `tools/capture-ask.mjs`).
- Answer 1 (NEURASCOPE · deterministic analyst): “The model predicts elevated disengagement at
  4.4 s–5.4 s (hazard +0.07/s over baseline, 3.0 survival pts in excess). Mechanism: processing
  demand rising, unresolved payoff rising. Visual-First Viewers are most affected, losing 29%
  of those still watching.” → action chip **Focus F2**.
- Clicking Focus F2 opens ATTENTION FRACTURE F2 · 4.40–5.40 s in the Inspector.
- Suggestion chip “Which patch has the most upside?” → Answer 2: “Start with F2 at 4.4 s: it
  costs the most survival (3.0 pts). Simulate “Split the dense line” to see the predicted
  change.” → action **Simulate Split the dense line**.
- Clicking it runs the counterfactual: COUNTERFACTUAL · Split the dense line, brain recolours
  mint, retention overlay, footer “counterfactual · Split the dense line · +2.4 pts at 8.4 s”.
- PRE-FLIGHT BRIEF: 1 Primary risk F2 4.4–5.4 s −3.0 pts survival · 5 Recommended change
  “Split the dense line — Rewrite 4.4 s–5.4 s with ~30% fewer words, keeping the same claims.”
  · 6 After simulation **+2.4 pts** predicted survival at 8.4 s · 33% → 34% · Tier C.
- Honesty copy kept visible: DEV FIXTURE · NOT ORIANE OUTPUT; “Corpus evidence unavailable:
  ORIANE_API_KEY is not configured”; “model-derived, not measured”.

## Tone
Polished / scientific. Faster than v1: beat-locked hard cuts, synthetic cursor driving the
UI, accelerated typing (12 real UI frames over 1.5 s — no slow letter-by-letter), camera
pushes that land exactly on the answer text, short dissolves (0.2 s) only where a hard cut
would flash. Restraint: no glitch, no particle bursts, no neon; palette and type unchanged.

## Music
`happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` — 120.19 BPM (vs 109.96 in v1),
beat = 0.4992 s. Detected beats from 3.02 s every ~0.50 s; strong cues 16.02 / 17.02 / 17.52 /
18.02 / 19.02. Scene cuts sit on beats; Brief lands on 16.02 (first strong cue), the +2.4 pts
reveal on 17.52. Fade in 0.5 s, out from 19.5 s. Volume 0.5 (data-automation, no GSAP tween).

## Storyboard (21.5 s, 1920×1080, 30 fps)
| t (s) | scene | what the viewer sees | motion |
|---|---|---|---|
| 0.00–2.02 | Hook | eyebrow SYNTHETIC ATTENTION LABORATORY · “10,000 viewers.” / “One question.” | fast rise-ins on 0.52 / 1.02, hard cut out |
| 2.02–4.52 | Workspace | real playback (workspace-play.mp4): retention, hazard, synthetic EEG | slow push 1.00→1.03, label chip |
| 4.52–7.52 | Ask | cursor → Ask bar, click, 12 typing frames (5.02→6.52), Enter, answer appears 6.77 | camera push 1.0→1.5 onto Ask/answer region |
| 7.52–10.02 | Answer | answer 1 readable; card outline breathes once; cursor → **Focus F2**, click 10.02 | hold, micro drift |
| 10.02–12.02 | Inspector | F2 opens right; camera pulls out then leans right | pull 1.5→1.0 (0.5 s), lean 1.12 |
| 12.02–14.02 | Upside | chip click → answer 2 with Simulate action; cursor → Simulate, click 14.02 | push 1.0→1.5 |
| 14.02–16.02 | Counterfactual | brain mint, COUNTERFACTUAL · Split the dense line, retention overlay; card “+2.4 pts at 8.4 s” | pull out 0.5 s, lean to stats |
| 16.02–19.02 | Brief | PRE-FLIGHT BRIEF panel reveal (mask wipe from right), pan down to **+2.4 pts** on 17.52 | wipe 0.35 s, y-pan + 1.12 |
| 19.02–21.50 | Outro | NEURASCOPE wordmark · SYNTHETIC ATTENTION LABORATORY · “Ask before you publish.” | scale settle, fades |

## SFX
click_003 on each cursor click (4.90, 10.02, 12.02, 14.02, 16.02) at 0.5; impactSoft on
hook 0.52 and on answer reveal 6.77; impactBell (0.25) on +2.4 pts 17.52.

## Chat decision
Required by brief: chat is the spine of this cut (two real exchanges, two real action
clicks). Kept honest: the card header reads “NEURASCOPE · DETERMINISTIC ANALYST”.
