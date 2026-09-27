# NEURASCOPE — Judge Demo (~3 min)

Uses only the shipped UI. Every step below maps to a real control.

## Setup

```
pnpm install
pnpm dev            # http://localhost:3000
```

| Variant | Env | What the input screen shows | Perception source badge |
|---|---|---|---|
| No keys (default) | none | "Oriane not configured" + **Run on development fixture** | `dev-fixture` |
| Oriane configured | `ORIANE_API_KEY` in `.env.local` | "Oriane live"; fixture button hidden | `oriane-live` |
| Local MP4 | none needed | **Upload video** or drag-and-drop | `local-only` (or `dev-fixture` if combined with the fixture button) |
| TikTok / Instagram URL | `ORIANE_API_KEY` | paste into "Paste a TikTok or Instagram Reel URL" | `oriane-live` |

Notes:
- The fixture is hand-authored in Oriane wire shape. **It is not Oriane output.** It carries a transcript only; add the matching clip ("Run on development fixture + this file") to get measured visual/audio signals.
- A URL-only run gets Oriane transcript chunks + keyframes but no decoded pixels; visual terms sit at neutral priors (shown under "Unavailable"). Best demo: **URL + the same MP4** — Oriane semantics, locally measured visuals.
- No live Oriane key has been tested yet. Rehearse the fixture path as the primary path.
- Before the demo: open the app once so the last analysis is saved (refresh restores it).

## Sequence

**0:00 — Input (InputScreen).** Pick audience ("Broad feed"), then Run simulation / Run on development fixture.
> "NEURASCOPE is a synthetic attention laboratory: we test a short-form video on a simulated audience before spending real attention. Oriane — or here a clearly labelled development fixture — gives us what's in the video; everything after that is our model."

**0:15 — Loading.** Steps: acquire → extract → simulate.
> "10,000 seeded synthetic viewers across four behavioral cohorts. Same seed, same answer."

**0:25 — Workspace overview.** Point at the provenance badge, video/transcript pane, Metrics strip (Attention, Load/capacity, Neural reliability, Predicted survival), each with a tier chip.
> "Every number carries an evidence tier. A is empirical data, B literature, C model-derived, D heuristic. All the outputs you see are C — computed by CORTEX, calibrated by literature where possible."

**0:40 — Timeline.** Press Space (play) or scrub; arrow keys step 0.1 s (Shift = 1 s).
> "Retention is the mean survival of 10k viewers. Hazard is the per-second drop-off risk. The bottom lane is a predicted EEG signature — explicitly a synthetic proxy, not a measurement."

**1:00 — Cohorts / synthetic reviewers (right rail).** Click **Cold Scroller**, then **All viewers**.
> "Selecting a cohort filters everything — brain, timeline, audience field, inspector. Cohorts are behavioral regimes, not demographics." 

Each cohort is shown as a live 3D synthetic reviewer, labelled "Synthetic behavioral expression · CORTEX visualization · not measured emotion". Select a reviewer to filter; say: "These figures are a visualization of each cohort's CORTEX state — head pose follows hazard, presence follows survival. Not measured emotion."

**1:20 — Fracture.** Click the first fracture marker on the timeline, or press `1`.
> "A fracture is a window where hazard rises well above its recent baseline and costs real survival points, and CORTEX can name the driver." Point at Mechanism, Observed in source (static seconds, words since last cut, new concepts, open loop) and per-cohort impact. Say: "During a fracture all four reviewers respond from their own cohort state — the Cold Scroller turns away while the Intent Viewer stays forward."

**1:45 — Evidence.** Click any tier chip in the Mechanism list → EvidenceDrawer.
> "Here's the study, what it measured, what we use from it, and its limitation. We use BBBD effect directions and Madsen's gaze-ISC summary statistics; we don't ingest participant recordings."

**2:05 — Intervene.** In Inspector, **Simulate patch** on the top intervention.
> "The patch edits the feature timeline, not the video, and reruns the same seeded population. The delta is a model prediction, not a guarantee." Toggle Show/Hide to compare curves.

**2:25 — Brain modes.** Header tabs **CORTEX → NETWORKS → NEURAL**. In NETWORKS click a network in the legend.
> "CORTEX and NETWORKS map computational demand onto Desikan–Killiany parcels — not measured activation, no voxel precision. NEURAL shows the neural-reliability proxy: attention mapped onto the gaze-ISC scale."

**2:45 — Ask.** Click a suggestion in the AskBar, e.g. "Is the EEG measured?"
> "Answers are computed deterministically from CORTEX state; an LLM, if configured, only phrases that state and can't invent numbers."

**3:00 — Close.** Refresh the page.
> "The last analysis restores locally, with its original provenance."

## Fallbacks

| Failure | What happens | What to do / say |
|---|---|---|
| No `ORIANE_API_KEY` | `/api/status` reports Oriane not configured; URL resolve returns an error | Use **Run on development fixture** (optionally + MP4). Say "labelled development fixture, not Oriane output." |
| Oriane `NOT_INDEXED` | Loading screen shows the error + **Back** (never falls back to fixture) | Back → upload the MP4 (optionally keep the URL: with a file attached, a failed resolve is skipped and the run continues `local-only`). |
| WebGL unavailable | No dedicated fallback is implemented; the brain canvas will not render | Enable hardware acceleration in Chrome (check `chrome://gpu`) before the demo; if it still fails, narrate from Timeline, CohortRail, Inspector and Metrics, which are DOM/SVG. |
| Network down | Fixture, upload, CORTEX (Web Worker) and deterministic analyst are all local | Use fixture or MP4. Refresh-restore works offline (saved ontology + media in IndexedDB). Oriane and LLM calls fail. |
| Refresh | `loadRun()` restores the saved input, media blob, ontology and audience, and reruns CORTEX without re-calling Oriane | — |
| 429 | Provider routes rate-limit per IP only when a key is configured: resolve 10 burst / 6 per min, comparables 6 / 4, analyst 8 / 6 | Resolve 429: error shown with "Retry in N s" — wait or use fixture/MP4. Analyst 429: the deterministic answer stays on screen. |
| New analysis | Click the NEURASCOPE wordmark | — |
