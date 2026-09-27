# Provenance-tier audit (visible UI)

Rule: a displayed value's tier reflects how the displayed number is produced, not whether literature inspired the mechanism.

- **A · Empirical** — observed source data (Oriane-live metrics, locally measured frame/audio signals).
- **B · Literature** — a published constant or effect direction shown as published.
- **C · Model-derived** — computed by CORTEX from video features. Literature that calibrates the mechanism stays attached as a *calibration source*.
- **D · Heuristic** — hand-set NEURASCOPE constant or rule.

Note: the spec's Tier B wording ("NEURASCOPE applies it to the current video through its own mapping") is looser than this rule. This audit follows the stricter rule; applied CORTEX mappings are Tier C.

| Item (location) | Old | New | Reason |
|---|---|---|---|
| Metrics · Neural reliability (`readouts().reliability`, cortex/index.ts) | B | C | CORTEX attention linearly mapped onto the Madsen 2021 gaze-ISC scale; not a published value. Madsen 2021 / Ki 2016 retained as calibration sources. |
| Metrics · Attention, Load/capacity, Predicted survival | C | C | CORTEX outputs; unchanged. Now covered by a unit test. |
| Inspector · Novelty (surprise) | B | C | CORTEX driver computed from visual change + transcript with NEURASCOPE weights; Itti & Baldi 2009 defines the mechanism only. Added `neurascopeHeuristics` source. |
| Inspector · Orienting salience | B | C | CORTEX driver from cuts/audio onsets/product events. Sources: Lang 2000, Corbetta 2002, heuristics (DeepGaze removed — this build does not run DeepGaze and salience does not use the gaze proxy). |
| Inspector · Processing load | B | C | CORTEX weighted sum of speech rate, new concepts and visual change relative to a hand-set reference. Lang 2000 / Fisher & Weber 2020 calibrate. |
| Inspector · Semantic progression | C | C | Unchanged; added heuristics source (concept reference constant). |
| Inspector · Staticness, Habituation | D | D | Hand-set saturation / time-constant rules. Unchanged. |
| Inspector · Hazard (state header) | none | C | Added chip: viewer-level simulation output. |
| Inspector · Intervention / counterfactual deltas | none | C | Added chip on section header: CORTEX rerun on an edited feature timeline; the edit rules are heuristic. |
| Fracture mechanism · novelty, progression, load, salience (fractures.ts) | C | C | Unchanged; consistent with Inspector drivers. |
| Fracture mechanism · Static visual state | C | D | Same hand-set staticness rule the Inspector labels D; now consistent. Added heuristics source. |
| Fracture mechanism · Unresolved payoff, Habituation | D | D | Cue-lexicon / time-constant rules. Unchanged. |
| Network legend (NetworkLegend.tsx) | B | C | Bars are CORTEX computational demand; Yeo 2011 / Corbetta 2002 inform only the parcel grouping. Added heuristics source (parcel→network assignment and weights). |
| Timeline · EEG proxy chip | C | C | Unchanged; context text now states "never measured EEG". |
| Timeline · Survival chip | D | C | The survival/hazard curves are CORTEX outputs; hazard-link parameters are D and remain attached as calibration. Sources now Cohen 2017, Tong 2020, heuristics. |
| Timeline · event tooltips | raw `(derived)` | `C · Model-derived` / `D · Heuristic` | Letter + label for readability; event tiers unchanged. |
| Evidence source · BBBD 2026 (sources.ts) | A | B | Participant-level BBBD recordings are not ingested; only published effect directions are used. Tier A would imply accessible participant data. |
| Tier chip tooltip (Tier.tsx) | tier only | tier + meaning + "calibrated by: …" | Distinguishes a value's tier from its calibration sources. Tooltip still contains "open evidence". |
| Tier label B (provenance.ts) | "Literature-calibrated" | "Literature" | "Literature-calibrated" described CORTEX outputs, which are C. |
| Evidence drawer | per-source tier only | value tier in header + note; per-source letter labeled "source tier"; "Measured variable" → "Measured in the study" | Makes clear the source tier is not the value tier and what was measured refers to the cited study. |
| Analyst (analyst.ts) evidence & EEG answers | — | — | States displayed numbers are Tier C model outputs calibrated by the cited studies, no participant-level BBBD data, EEG is model-derived. |

## Not edited (outside file scope) — for the lead

- `CohortRail.tsx`: header chip is D ("Cohort regimes and mixture") — correct for the mixture/weights, but the per-cohort retention % and sparklines shown in the same rail are CORTEX outputs (C). Suggest either a C chip for the values or context text "values Tier C; mixture Tier D".
- `VideoPane.tsx` (no-media placeholder): when source is `local-only` and the media URL is gone (e.g. after refresh restore), it shows "Oriane returned no keyframes for this record." — implies an Oriane record exists. Suggest branching on `ontology.source`.
- `Workspace.tsx`, `brain/*`: no tier issues found; existing copy already says "model-derived, not measured" / "not measured activation".
- `src/app/api/analyst/route.ts` system prompt lists tiers as "B literature" — consistent; could add "CORTEX outputs are C even when literature-calibrated".
