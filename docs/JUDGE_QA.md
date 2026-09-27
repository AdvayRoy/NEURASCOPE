# NEURASCOPE — Judge Q&A

Short, defensible answers. Details and formulas: `docs/SCIENCE_LEDGER.md`.

**Is this real EEG?**
No. The EEG lane is a synthetic proxy computed from CORTEX state: alpha = 1 − attention, theta = load, ISC mapped onto Madsen 2021's gaze-ISC scale. The waveform is rendered from those envelopes and labelled "PREDICTED EEG · SYNTHETIC PROXY". It is Tier C, model-derived.

**Is this an LLM?**
No. CORTEX is a deterministic, seeded numerical simulation (`src/lib/cortex`). The Ask bar answers from CORTEX state with rules first; an LLM (Anthropic or OpenAI) is optional, only rephrases the structured state, and is told not to invent numbers. Without a key the app is fully functional.

**How is retention computed?**
Each of 10,000 synthetic viewers has a latent attention that relaxes toward sigmoid(drive), where drive combines novelty, salience, progression, load over capacity, habituation, unresolved open loops, staticness and product pulses with viewer-specific weights. Hazard λ = λmax·sigmoid(β0 + β·(1 − a) + hook term); survival S = Π(1 − h) = exp(−Σλdt). Retention is the mean of S across viewers.

**Why these cohorts?**
Four behavioral regimes — Cold Scroller, Intent Viewer, Visual-First Viewer, Category Enthusiast — that differ in distraction probability, hook sensitivity, capacity, relevance and product affinity. The attentive/distracted split and its ISC distributions come from Madsen 2021 and Ki 2016; the cohort parameters and mixtures are Tier D heuristics, marked as such in the UI. They are not demographics.

**What does Oriane provide vs what do you compute?**
Oriane provides perception of published TikTok/Instagram content: transcript chunks, keyframes, caption, hashtags, creator and aggregate metrics. NEURASCOPE computes everything else: features, drivers, the synthetic population, attention, hazard, survival, fractures, interventions, network state and the EEG proxy. Each run is badged `oriane-live`, `dev-fixture` or `local-only`; the fixture is hand-authored and never Oriane output, and no live Oriane key has been tested yet.

**What if the video isn't indexed?**
Oriane returns no record and the app shows `NOT_INDEXED` — it never silently substitutes fixture data. Upload the MP4: visual change, cuts, audio onsets and a gaze-dispersion proxy are measured in the browser, and the run is labelled `local-only` (no transcript, so semantic terms sit at neutral priors).

**How do you validate?**
Today: unit tests for determinism, cohort mix, ISC sampling against Madsen medians, monotone retention, exit-time/survival agreement, fracture detection and counterfactual reruns, plus an end-to-end Playwright test. The model is not yet fitted to real retention curves, so absolute levels are illustrative; the next step is fitting to per-second retention of published videos and testing on held-out ones.

**What's a fracture?**
A window after the 2-second hook where the smoothed population hazard exceeds its rolling 3-second median by > 0.03/s and > 30%, costs ≥ 0.4 survival points, and has at least one driver whose change explains it. Windows with no interpretable driver are discarded, so every fracture names a mechanism and shows what was observed in the source.

**Are counterfactuals guarantees?**
No. A patch edits the feature timeline (e.g. insert visual change, slow speech, compress, move payoff) and reruns the same seeded population, so the delta isolates the edit. It is a Tier C model prediction; real edits change more than one feature.

**Did you use BBBD data?**
We use BBBD 2026's published effect directions (e.g. distraction raises alpha, reduces ISC). We do not ingest participant-level BBBD recordings. Madsen 2021 contributes summary statistics (gaze-ISC median/IQR).

**What are the faces?**
Synthetic reviewers: one 3D figure per cohort, driven by that cohort's CORTEX state. They are labelled "Synthetic behavioral expression · CORTEX visualization · not measured emotion". Nothing measures anyone's face or emotion.

**What is the brain showing?**
Computational demand from CORTEX mapped onto Desikan–Killiany parcels grouped into seven networks (Yeo 2011, Corbetta & Shulman 2002 for the grouping). It is not measured or predicted biological activation and has no voxel precision.

**What is "neural reliability"?**
Population attention mapped linearly onto the gaze-ISC scale (distracted 0.12 → attentive 0.35). It is a Tier C model output calibrated by Madsen 2021 and Ki 2016, not a measured inter-subject correlation.

**Any dopamine / emotion claims?**
None. CORTEX models attention and drop-off hazard only.

**Is it deterministic?**
Yes. Seed 20260926 and the same input give identical results; counterfactuals reuse the same population (common random numbers).
