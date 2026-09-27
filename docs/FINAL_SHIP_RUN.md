# NEURASCOPE — Final Ship Run

**Status:** Queued final integration run  
**Date:** September 27, 2026  
**Time budget:** ~2 hours hard cap  
**Canonical architecture:** `NEURASCOPE_PRODUCT_SPEC.md` → **FROZEN ORIANE ARCHITECTURE v1**

> This file is the execution brief for the final Devin run. It does not replace the canonical product/science architecture. If this file conflicts with the frozen architecture or science ledger, the canonical architecture/science files win.

---

## Objective

Ship a finished, judge-demoable NEURASCOPE product within approximately two hours.

The final product should support the canonical demo:

```text
real video
→ real Oriane intelligence
→ CORTEX
→ 10,000 synthetic viewers
→ live synthetic reviewer reactions
→ Attention Fracture
→ real Oriane corpus evidence
→ scientifically grounded diagnosis
→ counterfactual edit simulation
```

No new architecture. No speculative feature expansion. No broad redesign.

---

## Priority stack

### P0 — must work

- current synthetic reviewer task lands cleanly
- `ORIANE_API_KEY` works server-side
- real Oriane source resolution works
- fracture → real Oriane corpus evidence works
- URL + matching MP4 combined analysis works
- canonical demo path survives end-to-end
- no demo-breaking visual/runtime failures

### P1 — ship if robust

- structural corpus benchmark
- multi-frame fracture fingerprint
- stronger multimodal retrieval
- cached real-analysis replay / demo resilience

### P2 — do not let these block demo

- profile search integration
- popular-comment analysis
- complex reranking
- advanced reference-set segmentation
- perfect category classification
- unrelated redesigns

---

# MASTER DEVIN PROMPT

## FINAL NEURASCOPE SHIP RUN — HARD 2-HOUR PRODUCT DEADLINE

Do not interrupt or degrade the synthetic-reviewer task currently in progress. Finish that task to a high visual and functional standard first, integrate it cleanly, and then treat this message as the **final product-completion mission**.

We need a **finished, judge-demoable product within approximately 2 hours**.

From this point forward:

**NO new architecture.  
NO speculative feature expansion.  
NO broad redesign.  
NO science rewrites unless correcting an actual error.**

The canonical architecture is now frozen in:

`NEURASCOPE_PRODUCT_SPEC.md`

specifically:

**`FROZEN ORIANE ARCHITECTURE v1 — September 27, 2026`**

Read that entire frozen section before implementing anything.

Also reconcile it with:

`docs/BUILD_ORDER.md`

`docs/SCIENCE_LEDGER.md`

`docs/DEMO.md`

`docs/JUDGE_QA.md`

`docs/PROVENANCE_AUDIT.md` if present

`docs/oriane/openapi.snapshot.json`

`README.md`

and the current implementation under:

`src/lib/oriane/`

`src/lib/cortex/`

`src/lib/state/`

`src/components/`

`src/app/api/`

The goal is now to **ship**, not explore.

---

## 0. Operating mode

You have permission to use **as many subagents / child sessions as useful** to maximize engineering quality and wall-clock speed.

Parallelize aggressively where work is separable:

- live Oriane integration
- corpus retrieval
- structural benchmark
- reviewer completion
- browser QA
- security / quota review
- visual QA
- demo rehearsal

The parent session owns:

- architecture
- merge/integration
- conflict resolution
- final verification

Do not let multiple agents modify the same files destructively.

Optimize for **finished product quality per minute**, not token conservation.

---

## 1. Finish current reviewer work first

Complete the synthetic reviewer upgrade already underway.

The supplied stylized-character reference remains canonical.

Acceptance:

- visually substantially better than the prior primitive-head failure state
- four distinct stylized characters
- continuously alive
- CORTEX-driven reaction layer
- correct Emirati reviewer
- smooth animation
- no coupling lines through faces
- performant alongside the brain
- real browser visual inspection completed

Do not spend excessive time chasing perfect 3D art once the result clearly passes the professional-demo threshold.

Then move immediately to Oriane.

---

## 2. Real Oriane activation

The credential will be configured as:

`ORIANE_API_KEY`

Never print, log, expose, or commit its value.

Verify **presence only**.

Keep it server-side.

Never create:

`NEXT_PUBLIC_ORIANE_API_KEY`

Before using the provider heavily, verify:

- auth scheme
- base URL
- real response shape
- rate-limit behavior
- checked-in OpenAPI assumptions

Make the **smallest possible authenticated request first**.

If the real API differs from `docs/oriane/openapi.snapshot.json`, adapt the implementation to observed reality and document the discrepancy.

Do not reopen the product architecture unless the real API contract materially forces it.

---

## 3. Must-ship Oriane path

Implement the frozen architecture's critical path:

```text
Local/Oriane source observation
→ CORTEX
→ synthetic audience
→ Attention Fracture
→ Fracture Fingerprint
→ Oriane corpus retrieval
→ corpus evidence
→ intervention
→ same-population counterfactual
```

### Published URL

Real TikTok / Instagram indexed content can resolve through Oriane and create:

`source = "oriane-live"`

Preserve:

- transcript chunks
- frames/keyframes
- caption
- hashtags
- creator context
- audio metadata
- aggregate metrics
- requestId

only where actually returned.

The UI must visibly show:

**ORIANE LIVE**

Fixture output must remain visibly distinct.

### URL + MP4

This is the preferred judge-demo path.

When both are supplied:

**Oriane** provides semantic/published-content intelligence.

**Local decoding** provides directly measured visual/audio signals.

Merge them into the existing `VideoOntology` with correct provenance.

Do not discard either source.

---

## 4. Fracture → Oriane corpus evidence

Replace the existing narrow comparable-search behavior with the strongest version that can be completed reliably inside the time limit.

Build a real `FractureFingerprint`.

Minimum fingerprint:

- fracture start/end
- relative video position
- top CORTEX drivers
- transcript window if available
- caption/category context
- hashtags if available
- platform
- relevant source frame/keyframe
- source structural observations already calculated by CORTEX

Then use Oriane to retrieve **relevant real published content**.

Start with reliable functionality:

- image asset
- and/or text asset
- visual similarity
- transcript/category constraints
- platform/format constraints

Use nested/multimodal queries if the API supports them reliably.

Prefer useful results over overconstrained empty searches.

Do not add endpoints that are not in the actual API.

---

## 5. Draft MP4 → Oriane reference corpus

If implementable safely inside the deadline, support the true preflight architecture:

```text
unpublished MP4
→ locally extract selected frames
→ server-side Oriane asset creation
→ search indexed public corpus
```

Do **not** upload the entire private MP4 to Oriane.

Selected frame fingerprints are enough.

Prefer approximately:

- pre-fracture
- fracture center
- post-fracture

Do not let this feature block the published URL + MP4 demo path.

---

## 6. Corpus evidence UI

Put Oriane corpus evidence **inside the fracture decision workflow**.

Do not build a generic search dashboard.

Desired structure:

```text
ATTENTION FRACTURE F1

Predicted consequence

CORTEX mechanism

Observed in source

Scientific evidence

CORPUS EVIDENCE · ORIANE
[real related content / structural benchmark]

Intervention

Simulate Patch
```

A judge should immediately understand:

**CORTEX predicts the fracture. Oriane grounds it against real content.**

---

## 7. Structural benchmark — only if robust

If the retrieved Oriane records provide enough data, compute a compact structural benchmark.

High-value candidates:

- duration
- speech density
- semantic-transition timing
- payoff/product-mention timing
- keyframe/visual-transition timing

Example:

```text
CORPUS EVIDENCE
23 related videos

Product/payoff mention
Draft              12.8s
Reference median    7.0s
```

Every benchmark must be based on real returned data or transparent local derivation.

If a benchmark cannot be measured robustly, omit it.

**Do not fake sophistication.**

---

## 8. Scientific boundary — non-negotiable

Preserve:

**Oriane observes/retrieves.  
CORTEX predicts.  
Platform analytics later validate.**

Never use:

- views
- likes
- shares
- comments
- engagement rate
- follower count

as direct CORTEX attention/retention labels.

These may only be:

- descriptive corpus context
- retrieval/reference-set stratification

Label performance information:

**Distribution/performance context · not retention ground truth**

All CORTEX outputs remain Tier C/model-derived.

Do not alter the CORTEX mathematics merely to make Oriane results appear more correlated.

---

## 9. Quota / security / cache

Keep the real credential safe.

Finish/retain:

- server-only provider access
- per-IP rate limiting
- route-wide protection
- bounded request sizes
- provider timeouts
- generic external errors
- comparables/corpus caching

Add simple deduplication of Oriane assets if practical.

Do not send repeated provider calls as the playhead moves.

Provider calls should happen on:

- initial URL resolution
- bounded corpus prefetch
- explicit evidence request

not every render/timestamp.

---

## 10. Demo resilience

We need the live demo to survive bad internet/provider behavior.

Once one real Oriane analysis succeeds, preserve enough of the normalized result locally so refresh/replay can restore it with its original:

`oriane-live`

provenance.

Do not convert it into fixture provenance.

Best fallback ladder:

```text
1. Real live URL + MP4
2. Cached prior real Oriane analysis + MP4
3. MP4 local-only
4. clearly labelled development fixture
```

Never silently substitute one for another.

---

## 11. Canonical demo flow

Make this exact path work:

```text
INPUT
real URL + matching MP4

↓

ORIANE LIVE

↓

CORTEX
10,000 viewers

↓

PLAY
brain + synthetic reviewers respond

↓

F1
reviewers visibly react differently

↓

CLICK FRACTURE

↓

mechanism
observed source evidence
scientific evidence
Oriane corpus evidence

↓

SIMULATE PATCH

↓

original vs counterfactual
```

Optimize the app for this sequence.

---

## 12. Hard QA gate

Before declaring completion, run:

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm e2e
```

Then manually/browser-test:

- launch
- input
- URL-only
- MP4-only
- URL + MP4
- live Oriane
- playback
- scrub
- cohort selection
- brain animation
- reviewer animation
- fracture selection
- evidence
- Oriane corpus evidence
- counterfactual
- refresh/restore
- WebGL failure resilience
- provider failure
- rate limiting

Check at:

**1440×900**

and if time permits:

**1512×982**

Run a final screenshot-driven visual review.

---

## 13. Black-flag review

Use independent subagents at the end.

### Scientific reviewer

- are any claims overstated?
- any Tier mislabelling?
- any implication that Oriane metrics equal attention?

### Product reviewer

- is the main question obvious?
- is Oriane genuinely central?
- does the fracture workflow make sense?

### Visual reviewer

- anything visibly prototype/cheap?
- reviewer quality?
- clipping?
- density?

### Engineering reviewer

- secrets?
- race conditions?
- provider failures?
- rendering performance?
- stale state?

Fix only material issues.

Do not begin another broad refactor.

---

## 14. Time management

This is a hard shipping run.

Use roughly:

**0–30 min**  
finish reviewers + authenticate/validate Oriane

**30–80 min**  
real source integration + fracture corpus evidence

**80–105 min**  
structural benchmark / resilience / UI integration

**105–120 min**  
black-flag QA + fixes + final browser rehearsal

Adjust dynamically if a critical path takes longer.

If something threatens the demo deadline, cut lower-priority functionality rather than destabilizing the core.

---

# Definition of done

At completion I should be able to open NEURASCOPE and demonstrate, without explaining around broken functionality:

> **a real video → real Oriane intelligence → CORTEX → 10,000 synthetic viewers → live synthetic reviewer reactions → Attention Fracture → real Oriane corpus evidence → scientifically grounded diagnosis → counterfactual edit simulation.**

That is the finished hackathon product.

**Ship that. Nothing broader.**
