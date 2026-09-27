# NEURASCOPE — Science Ledger

Auditable record of every CORTEX quantity as implemented. Code is canonical; if this file and the code disagree, the code wins and this file is wrong.

All constants live in `src/lib/cortex/params.ts`. Source ids refer to `src/lib/evidence/sources.ts`.

## Evidence tiers

| Tier | Code value | Meaning |
|---|---|---|
| A | `empirical` | Observed in the source video itself (e.g. Oriane/local-file signals). No external dataset is Tier A: `bbbd2026` is cited as Tier B because only its published effect directions are used |
| B | `literature` | Published findings / summary statistics |
| C | `derived` | Computed by CORTEX from inputs; literature may calibrate it |
| D | `heuristic` | Chosen parameter or rule, not fitted to data (`neurascopeHeuristics`) |

**Every displayed CORTEX output is Tier C** (attention, survival/retention, hazard, neural-reliability proxy, network state, synthetic EEG proxy, cohort outputs, counterfactual deltas) even when a Tier B source calibrates its scale. Tier B applies to the *source*, not to the model output.

## What is and is not ingested

- Participant-level BBBD recordings are **not** ingested. The build uses BBBD 2026 published effect directions (distraction → alpha ↑) and Madsen 2021 gaze-ISC summary statistics (median/IQR).
- No model is fitted to retention data. Absolute retention levels are illustrative; relative differences between conditions (cohorts, counterfactuals) are the intended output.
- Nothing here measures emotion, EEG, dopamine, or biological activation.
- Oriane platform metrics (views, likes, shares, comments, engagement rate, followers) are **never** CORTEX inputs; they appear only as descriptive corpus context. Oriane observes/retrieves; CORTEX predicts; platform analytics would later validate.

## Pipeline

```
VideoOntology (src/lib/ontology.ts)
  → buildFeatureTimeline   features.ts   (10 Hz feature arrays + semantic events)
  → computeDrivers         features.ts   (population-level drivers)
  → samplePopulation       population.ts (10,000 seeded viewers)
  → simulate               simulate.ts   (per-viewer attention, hazard, survival)
  → detectFractures        fractures.ts
  → proposeInterventions   interventions.ts → runCounterfactual (index.ts)
  → networkSeries          networks.ts
  → eegEnvelopes / eegSynth eeg.ts
```

Orchestrated by `runCortexOnTimeline` in `src/lib/cortex/index.ts`, executed in a Web Worker (`cortex.worker.ts`). Defaults: `SIM_HZ = 10`, `DEFAULT_POPULATION = 10_000`, `DEFAULT_SEED = 20260926`, context `feed`. PRNG: mulberry32 + Box–Muller (`rng.ts`). Same seed + same input ⇒ identical output.

## 1. Feature timeline — `buildFeatureTimeline` (features.ts)

`n = ceil(max(1, duration) · 10)` steps. Inputs come from `ontology.signals` (measured in-browser from a local file by `src/lib/media/extract.ts`, 72×128 px, 5 Hz) and `ontology.transcript` (Oriane transcript chunks, or the fixture). Tier C unless noted.

| Feature | Formula | If unavailable |
|---|---|---|
| `visualChange` | `frameDiff` resampled to 10 Hz, robust-normalized to [p5, p95] → [0,1] | constant 0.3 |
| `cut` | 1 at steps of detected hard cuts | 0 |
| `audioOnset` | `max(0, rms[i] − rms[i−1])`, robust-normalized (p98) | 0 |
| `gazeDispersion` | spatial entropy of 6×6 gradient-energy grid, normalized by `ln 36` (DeepGaze stand-in, `deepgaze2022` reference only; heuristic) | constant 0.5 |
| `speechRate` | words / segment length, held over the segment | 0 |
| `newConcepts` | first occurrences of non-stopword tokens (len > 2), ×10 at the word's time, ±0.5 s box-smoothed ⇒ per second | 0 |
| `product` | 1 when a hashtag token (excluding fyp/viral/etc.) is spoken, at most once per 2 s | 0 |

Semantic events (Tier D unless noted): `hook` = first spoken line if it starts < 3 s (C); `open-loop`, `payoff`, `cta` from regex lexicons `CUES` (D); `product` (D); `cut` from frame-difference peaks (C).

## 2. Drivers — `computeDrivers` (features.ts)

Per step `i`, `dt = 0.1 s`. `DYNAMICS` constants are Tier D.

| Driver | Formula | Sources |
|---|---|---|
| novelty | `min(1, 0.55·perc + 0.45·sem)`; `perc = min(1, z/3)·0.7 + cut·0.3`, `z = |v − μ| / sqrt(σ² + 1e-4)`, running μ, σ² with rate 0.08; `sem = min(1, newConcepts / 1.4)`. Neutral: perc 0.3, sem 0.4 | itti2009 (Bayesian-surprise form) |
| salience | `sal = max(sal·e^(−dt/0.8), cut, 0.8·audioOnset, 0.9·product)` | lang2000, corbetta2002 |
| load | `0.5·speechRate/3.4 + 0.3·newConcepts/1.4 + 0.2·v` (can exceed 1). Neutral speech 0.35, concepts 0.3 | lang2000 |
| progression | `min(1, newConcepts/1.4)`, then 2 s trailing mean. Neutral 0.5 | cohen2017 |
| payoffDistance | open loop opened by `hook`/`open-loop`, closed by `payoff`/`product`; `min(1, secondsOpen / 7)` | tong2020, heuristics |
| staticness | seconds since `v > 0.12` or a cut, `/4`, clamped. 0 if no visual signal | madsen2021, bbbd2026 (direction) |
| habituation | `hab += dt·[(1−nov)(1−hab)/9 − nov·hab/1.6]`, clamped [0,1] | itti2009, heuristics |
| gazeConcentration | `1 − gazeDispersion` | deepgaze2022 (reference only) |
| productPulse | `max(prod·e^(−dt/2.5), product)` | heuristics |

Constants 0.55/0.45, 0.7/0.3, 0.5/0.3/0.2, decay times, `speechRef 3.4`, `conceptRef 1.4`, `payoffSaturation 7`, `staticSaturation 4`, `staticThreshold 0.12`, `tauHabituation 9`, `tauRecovery 1.6` are Tier D.

## 3. Population — `samplePopulation` (population.ts)

For each of `N` viewers:

1. Cohort `c` ~ Categorical(`AUDIENCE_CONTEXTS[context].mix`) (D).
2. Distracted ~ Bernoulli(`c.pDistracted`) (D).
3. `isc ~ Normal(median, IQR/1.349)` from `GAZE_ISC` — attentive 0.35 (IQR 0.12), distracted 0.12 (IQR 0.18); clamped to [−0.05, 0.75]. **Calibration: madsen2021 (B).**
4. `base = clamp01((isc − 0.12) / (0.35 − 0.12))`.
5. Every cohort weight `w.*`, `capacity`, `relevance` (capped 1.2), `productAffinity`, `hook` multiplied by `exp(N(0,1)·0.25)` (`VIEWER_JITTER`, D).
6. `exitU ~ U(0,1)`; layout coords for rendering.

Cohorts (`COHORTS`, all parameters D; direction motivations cited in `params.ts`):

| Cohort | pDistracted | hook | capacity | relevance | productAffinity |
|---|---|---|---|---|---|
| Cold Scroller | 0.62 | 1.00 | 0.62 | 0.35 | 0.10 |
| Intent Viewer | 0.20 | 0.35 | 0.95 | 0.90 | 0.35 |
| Visual-First Viewer | 0.45 | 0.75 | 0.50 | 0.50 | 0.20 |
| Category Enthusiast | 0.25 | 0.45 | 0.85 | 1.00 | 0.80 |

Mixtures: Broad feed 46/14/28/12, Category audience 25/25/20/30, Warm / retargeted 12/38/15/35 (cold/intent/visual/enthusiast %). Capacity and relevance are motivated by lang2000 / fisher2020; hook by tong2020. Cohorts are behavioral regimes, not demographics.

## 4. Attention and hazard — `simulate.ts`

Attention drive for viewer `i` at step `k` (`attentionDrive`, all coefficients D):

```
u = 0.9
  + 2.2·(base − 0.5)
  + 1.4·wNovelty·(novelty − 0.35)
  + 0.8·wSalience·salience
  + 1.2·wProgression·relevance·(progression − 0.35)
  − 2.0·wLoad·max(0, load − capacity)
  − 0.9·wFatigue·habituation
  − 1.1·wPayoff·payoffDistance
  − 1.2·wStatic·staticness
  + 1.2·productAffinity·productPulse
```

Dynamics (first-order lag, `tauAttention = 0.7 s`):

```
a_0 = σ(u_0);   a_k ← a_k + (σ(u_k) − a_k)·dt/0.7
```

Hazard (per second) and discrete-time survival:

```
λ_k = λmax · σ(β0 + βa·(1 − a_k) + βhook·hook·e^(−t_k/τhook))
      λmax 1.1, β0 −5.4, βa 5.2, βhook 3.6, τhook 1.1 s        (all D)
h_k = 1 − e^(−λ_k·dt)
S_i(t_k) = Π_{j<k} (1 − h_j) = exp(−Σ_{j<k} λ_j·dt)
```

Concrete exit time: first `k` with `Σλdt ≥ −ln exitU` ⇒ `exitTime = (k+1)·dt` (used to drop points in the audience field).

Population outputs (Tier C):

- `retention R(t_k) = mean_i S_i(t_k)`; per cohort over cohort members. `R[0] = 1`.
- `hazard(t_k) = Σ S_i·h_i / Σ S_i · hz` (expected hazard among survivors, /s).
- `attention(t_k) = Σ S_i·a_i / Σ S_i` (survival-weighted).

Sources: cohen2017 (retention as survival driven by latent engagement), madsen2021 / ki2016 (attentive vs distracted as the latent axis), tong2020 (opening window). Model structure and every coefficient: neurascopeHeuristics.

## 5. Readouts — `readouts()` (index.ts), shown in `Metrics.tsx`

| Readout | Value | Tier | Sources |
|---|---|---|---|
| Attention | `attention(t)` (cohort-specific if a cohort is selected) | C | madsen2021, ki2016, neurascopeHeuristics |
| Load / capacity | `min(1.5, load(t))` | C | lang2000 |
| Gaze-sync proxy (reliability) | `eeg.isc(t)` (see §7) | **C** (calibrated by madsen2021, ki2016) | madsen2021, ki2016 |
| Predicted survival | `R(t)` | C | cohen2017, neurascopeHeuristics |

Values are linearly interpolated with `sampleAt`.

## 6. Attention fractures — `detectFractures` (fractures.ts)

Thresholds `FRACTURE` are all Tier D.

1. `H` = population hazard, 3-tap moving mean.
2. Baseline `b_k` = median of `H` over `[max(hookWindow−0.2 s, t−3 s), max(hookWindow, t−0.2 s))`. `hookWindow = 2.0 s`; steps before it are never flagged.
3. Flag step `k` if `H_k − b_k > 0.03` **and** `> 0.3·b_k`.
4. Merge flagged runs separated by ≤ 0.5 s; extend windows to ≥ 0.3 s.
5. Excess loss `lossPts = 100·Σ_{k∈win} max(0, H_k − b_s)·R_k·dt`; discard if `< 0.4`.
6. Driver attribution: for each driver, `Δ = mean(window) − mean(3 s before)`; contribution uses the population-mean weights under the current audience mix (`meanWeights`) and the same signs/coefficients as `attentionDrive`:
   - novelty `−1.4·w̄·Δ`, progression `−1.2·w̄(w·relevance)·Δ`, salience `−0.8·w̄·Δ`
   - load `2.0·w̄·(mean relu(load − c̄) in window − before)`
   - payoff `1.1·w̄·Δ`, static `1.2·w̄·Δ`, habituation `0.9·w̄·Δ`
   Keep drivers with contribution `> 0.06`, top 4. **A window with no qualifying driver is not a fracture.**
7. Cohort impact: `lossShare = 1 − R_c(end + 1 s)/R_c(start)`; `lift = peak H_c / median H_c before`.
8. Observation (`observe`): static seconds, words in window / since last cut, new concepts, open-loop seconds, payoff status (`resolved`/`unresolved`/`none-open`), overlapping transcript.
9. Keep top 5 by `lossPts`, re-sort by time, ids `F1…`, `severity = lossPts / max lossPts`.

Driver provenance (`DRIVER_META`): novelty (C; itti2009, ki2016), progression (C; cohen2017, ki2016), load (C; lang2000, jensen2002), static (D; madsen2021, bbbd2026, itti2009, neurascopeHeuristics — hand-set staticness rule), salience (C; lang2000, corbetta2002), payoff (D; neurascopeHeuristics, tong2020), habituation (D; itti2009, neurascopeHeuristics). Each fracture also cites ki2016 and cohen2017.

## Synthetic reviewers — `src/components/reviewers/`

Visual encoding only (label: "Synthetic behavioral expression · CORTEX visualization · not measured emotion"). No emotion is inferred, labelled or measured.

Pipeline: `video → CORTEX run → cohort-conditioned state (reviewerState.ts) → behaviour targets (reviewerBehavior.ts) → springs → rig (rig.ts, ReviewerStage.tsx)`.

**Rig.** Four stylised characters ship in one asset, `public/models/reviewers.glb`. Each one has the same bone and shape-key contract: bones `Chest → Neck → Head → Eye_L/Eye_R`, and shape keys `blink_L/R, wide, browDown, browUp, mouthOpen` (plus optional `smile`). All four render in one shared R3F canvas, one scissored viewport and perspective camera per rail slot.

**CORTEX layer** (deterministic, from cohort state at the playhead `t`, all clamped to [0, 1]):

```
attention      = A_c(t)
survival       = R_c(t)
withdrawal     = log(H_c(t) / median_t H(t)) / log 6        (shared scale across cohorts, base run)
orienting      = (w_nov·novelty + w_sal·salience)/(w_nov + w_sal)
orientingOnset = (orienting(t) − orienting(t − 0.4 s)) / 0.15
tension        = (load(t) − capacity_c) / 0.6               (the model's load-penalty term)
fracture       = env(t) · lossShare_c / 0.15                 env ramps in 0.35 s before the window, decays 0.6 s after

disengage = clamp(0.65·withdrawal + 0.8·fracture)
head yaw   = −0.24 + 0.85·disengage − 0.08·orientingOnset   (toward content → turned away; plus a fixed −0.32 rad 3/4 bust turn)
head pitch = −0.02 + 0.22·disengage − 0.08·orientingOnset − 0.05·tension
torso lean = −0.08·attention + 0.10·disengage − 0.04·tension (forward engagement vs. sitting back)
eye aperture = 0.72 + 0.28·attention − 0.30·disengage + 0.20·orientingOnset
gaze (x, y)  = toward content when engaged, away/down with disengage; quick shift + lift on orientingOnset
               (eyes use a stiff spring and the head a soft one, so the eyes orient first and the head then corrects)
head drift amplitude   = 0.10·(1 − attention) rad
saccade amplitude gain = 0.15 + 0.85·(1 − attention)   (gaze stability)
blink-rate gain        = 0.8 + 1.4·(1 − attention)
brow lowering/narrowing = tension; brow lift = orientingOnset
mouth smile shape       = clamp(0.55 + 0.35·attention − 1.50·max(0, disengage − 0.35))  (engagement cue drawn from model state; not an emotion label)
presence (brightness)   = 0.70 + 0.30·survival (+ selection highlight)
```

**Idle layer** (separate, seeded mulberry32 per cohort, bounded): breathing, blink timing (occasional double blinks), saccade timing/direction, slow head sway, posture shifts and mouth micro-movement. It runs continuously so reviewers stay subtly alive. CORTEX only sets its gains: saccade amplitude, blink rate and head-drift amplitude. `prefers-reduced-motion` disables it.

**Model-state coupling** (`CouplingOverlay.tsx`): conduits run from the central CORTEX view to a port at the outer edge of each reviewer row, never over the avatar. Intensity = `(0.035 + 0.05·attention·survival)·dim + 0.42·selected + 0.6·fracture`; colour shifts toward the fracture hue with `fracture`; pulses are emitted only when `|Δattention| + |Δwithdrawal| + |Δfracture|` accumulates past 0.035 while the playhead moves. It depicts shared computed state, not a biological signal path.

Mapping gains are Tier D presentation choices; the inputs are Tier C. Nothing is scripted per cohort: a different video yields different reactions.

## 7. Synthetic EEG proxy — `eeg.ts`

Model-derived proxy (Tier C). Never measured EEG.

```
alpha_k = clamp01(1 − attention_k)       direction: bbbd2026, ki2016 (distraction → alpha ↑)
theta_k = clamp01(load_k)                direction: jensen2002 (load → frontal theta ↑)
isc_k   = 0.12 + (0.35 − 0.12)·attention_k   scale: madsen2021 gaze-ISC medians; ki2016 (ISC ↓ with distraction)
```

Display waveform (`eegSynth`, Tier D rendering): `0.9·(0.25+alpha)·sin(2π·10.1 t + φa + …) + 0.8·(0.2+theta)·sin(2π·5.9 t + φt + …) + 7 seeded background sinusoids`, `/2.2`. Phases seeded by channel name hash (`Pz-<seed>`). Amplitudes follow the envelopes; frequencies/phases are cosmetic. Alpha is shown only at population level because ki2016 found alpha not individually diagnostic.

## 8. Network state — `networks.ts`

Computational demand mapped onto Desikan–Killiany parcel groupings (grouping: yeo2011, corbetta2002 — B; intensity — C). Not measured or predicted activation; no voxel precision.

| Network | Formula |
|---|---|
| Visual (VIS) | `visualChange·(0.35 + 0.65a)` |
| Dorsal attention (DAN) | `a·(0.4 + 0.6·gazeConcentration)` |
| Ventral attention (VAN) | `salience` |
| Salience (SAL) | `min(1, 0.6·salience + 0.4·novelty)` |
| Auditory / language (LANG) | `min(1, speechRate/3.4)·(0.4 + 0.6a)` |
| Semantic (SEM) | `progression·a` |
| Control (CTRL) | `min(1, load)·(0.4 + 0.6a)` |

`a` = population attention. With a cohort selected, `BrainCanvas.tsx` scales values by `attention_c / max(0.05, attention)`. NEURAL mode renders `k = clamp01((isc − 0.12)/0.23)` as a uniform tint on every parcel: the proxy is a single global scalar on a gaze-ISC scale, not a neural or localized measure.

## 9. Interventions and counterfactuals — `interventions.ts`, `index.ts`

Proposed from the fracture's driver set (rules and magnitudes D). Window `w0 = start − 0.6 s`, `w1 = end + 0.4 s`.

| Trigger drivers | Op | Edit to the feature timeline |
|---|---|---|
| static / novelty / habituation / salience, and visual signal available | `insert-visual-change` | every 1.5 s in [w0, w1): `cut = 1`, `visualChange ≥ 0.7` for 0.4 s |
| load | `reduce-speech` | `speechRate ×= 0.7` in [w0, w1] |
| progression / habituation | `compress` | remove `clamp(0.6·len + 0.6, 0.6, 2.5)` s starting 0.3 s before the fracture; later events shift earlier |
| payoff | `move-payoff` | move next payoff/product event to `start − 0.5 s`, or insert a counterfactual payoff event |

`runCounterfactual` applies the op to a copy of the timeline (media is never edited), re-samples the **same seeded population** (common random numbers), reruns the full pipeline, and reports:

- `evalAt = min(duration, fracture.end + 3 s)` on the original clock (shifted by `remove` for `compress`);
- `deltaPts = 100·(R_cf(evalAt − shift) − R_orig(evalAt))`; end-of-video retention both ways.

Counterfactual outputs are Tier C model predictions, not guarantees.

## 10. Other components

- `newConcepts` / lexical features ignore language; the lexicons are English (D).
- `/api/analyst` (optional LLM) receives only the structured CORTEX state (`analystContext`, plus a descriptive corpus-evidence summary when a fracture with loaded corpus evidence is selected) and is instructed not to invent numbers; the deterministic analyst (`deterministicAnswer`) answers from CORTEX state with no LLM.

## 11. Corpus evidence — `oriane/fingerprint.ts`, `oriane/comparables.ts` (retrieval, not model)

Runs downstream of fracture detection and never feeds back into it.

- `FractureFingerprint`: fracture window (start/end/peak), top 3 drivers, transcript within ±`FINGERPRINT_WINDOW_PAD` = 3 s (≤600 chars), ≤6 content terms (frequency-ranked after stop-word removal; hashtags ×1.5, caption ×0.5), caption/hashtags/platform, nearest live Oriane keyframe ≤4 s before the peak (live sources only) or a 320 px local JPEG frame captured at the peak, and the fracture's existing structural observations. Speech density = words in window / window length; keyframe cadence = Oriane-indexed keyframes in window per 10 s (live only — locally detected cuts are a different measure and are not mixed in).
- Retrieval: ≤1 visual-similarity search (keyframe URL or uploaded frame asset), ≤1 fuzzy-transcript search (`transcript.includesFuzzy`, `or`), both constrained to the source platform and `video` format, run in parallel. Results merged, deduplicated, source video excluded, ranked (visual = mean matched-frame similarity; transcript = provider order), ≤6 items.
- Comparable measurement (`measureAtRelativePosition`): the same ±3 s window at the same *relative* position (fracture start / duration) inside each comparable, from its transcript chunks and frames.
- Benchmarks (`buildBenchmarks`): robust medians, shipped only when ≥3 comparables are measurable; at most two (speech density, keyframe cadence; duration only as a fallback). Reference points, not effect estimates — no significance is claimed.
- Views / engagement rate: medians shown as "distribution/performance context · not retention ground truth" (Tier: descriptive platform data, not a model quantity).
- Limitations: fuzzy transcript matching is lexical, not semantic; visual similarity is the provider's score; the retrieved set is the provider's top hits, not a random sample of the platform; comparables are not matched on topic beyond terms/visuals.

## Heuristics (Tier D)

Everything below is a chosen value, not fitted:

- Cohort definitions, `pDistracted`, all `w.*`, `capacity`, `relevance`, `productAffinity`, `hook`; audience mixtures.
- `VIEWER_JITTER = 0.25`.
- All `attentionDrive` coefficients (0.9, 2.2, 1.4, 0.35, 0.8, 1.2, 2.0, 0.9, 1.1, 1.2, 1.2).
- `DYNAMICS`: `tauAttention`, `tauHabituation`, `tauRecovery`, `lambdaMax`, `beta0`, `betaAttention`, `betaHook`, `tauHook`, `hookWindow`, `payoffSaturation`, `staticSaturation`, `staticThreshold`, `speechRef`, `conceptRef`.
- Driver mixing weights and decay constants in `computeDrivers`.
- `FRACTURE` thresholds and top-4 / top-5 limits.
- `CUES` lexicons, `STOPWORDS`, hashtag-as-product rule.
- Gaze-dispersion proxy (gradient-energy entropy).
- Network mixing formulas; EEG waveform synthesis.
- Intervention rules and magnitudes.
- Neutral priors used when a modality is missing.

Only `GAZE_ISC` (madsen2021) and `IQR_TO_SIGMA` (normal approximation) are literature values.

## Limitations

- Not fitted to any retention, watch-time, or EEG dataset; absolute levels are illustrative.
- Calibrating studies use instructional/narrative/TV content in lab or classroom settings, not short-form feeds; only effect directions and summary-statistic scales transfer.
- BBBD participant-level recordings are not used.
- Transcript semantics are lexical (new-word rate, regex cues), not semantic understanding.
- Without a local file, visual/audio/gaze terms are neutral constants; without a transcript, semantic terms are neutral. The UI marks unavailable modalities.
- Oriane keyframes are displayed but not used to compute visual signals in this build.
- Networks are parcel-level groupings; brain colouring is a visualization of model demand.
- The synthetic EEG waveform is a rendering of model envelopes; it is not a forward model of scalp potentials.
- Counterfactuals edit features, not pixels or audio; real edits change more than one feature.
- No live Oriane key has been tested yet; the live path is implemented against `docs/oriane/openapi.snapshot.json`.

## How this would be calibrated

Fit `DYNAMICS`, cohort weights, and mixtures to per-second retention curves of published videos (platform analytics supplied by the video owner; Oriane supplies transcript, keyframes and aggregate metrics, not retention curves), validate on held-out videos, and replace the gaze-dispersion proxy with a saliency model. Until then, tiers stay as above.
