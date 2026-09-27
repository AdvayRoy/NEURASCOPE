# NEURASCOPE

## Pre-flight testing for short-form video

> **Test on synthetic attention before you spend real attention.**

> **Scientific revision — September 27, 2026:** CORTEX is now specified as a research-backed synthetic attention laboratory using empirical priors from published EEG, gaze, physiology, and naturalistic-media studies. Synthetic EEG, retention, and audience outputs must be derived model outputs tied to cited evidence—not decorative or arbitrary signals.

---

## 1. Product Thesis

NEURASCOPE is a pre-flight testing system for short-form video.

Before a creator, agency, or brand publishes a Reel, TikTok, Short, or paid social creative, NEURASCOPE analyzes the video, runs it through a neuroscience-informed computational attention model, simulates thousands of synthetic viewers, identifies where attention is likely to fracture, explains why, and recommends specific edits.

The core loop is:

**UPLOAD → UNDERSTAND → SIMULATE → FRACTURE → DIAGNOSE → PATCH → RE-SIMULATE**

NEURASCOPE is **not** a generic AI engagement scorer, a creator analytics dashboard, or a literal biological brain simulator.

It is a **decision-intelligence system for media**.

The initial product answers one question:

> **Where will this video lose people, and what should I change before I publish it?**

Long term, NEURASCOPE becomes the evaluation layer between video creation and distribution—giving human creators and generative-video systems a computational test audience before real attention or media budget is spent.

---

## 2. YC-Style Wedge

### Primary ICP

Start narrower than “everyone who makes video.”

The primary user is:

> **A performance-creative strategist, editor, or social creative lead producing a high volume of short-form branded content and deciding which version is ready to publish or receive media spend.**

Typical environments:

- creator / influencer agencies
- performance creative teams
- brand social teams
- high-output professional creators

Secondary users can include creator managers and marketing strategists, but the first product must be optimized for the person directly reviewing or editing the asset.

The user is staring at version 17 of a 25-second video and asking:

> **Is this ready to publish, and where is it most likely to lose people?**

### Initial pain

Creative teams often learn that content failed **after** real people have already seen it.

Current loop:

**publish → spend distribution → receive performance data → diagnose → edit → publish again**

NEURASCOPE moves a meaningful part of that loop **before publication**:

**edit → simulate → diagnose → improve → publish**

The initial job-to-be-done is not “understand neuroscience.”

It is:

> **Catch likely attention failures before the asset goes live.**

### Commercial value hypothesis

NEURASCOPE is valuable if it can help a team:

- catch a weak segment before publication,
- choose between creative variants,
- prioritize which asset deserves media spend,
- explain *why* a segment is risky,
- create a concrete edit recommendation,
- rerun the candidate edit before shipping.

The signature brain interface makes the system memorable.

The workflow is what customers pay for.

---

## 3. Final One-Liner

> **NEURASCOPE lets short-form creative teams test where viewers will lose attention before they publish.**

Do not lead with:

> “AI neuroscience platform for optimizing engagement using multimodal agents.”

Lead with the problem and outcome. Explain the technology afterward.

---

# 4. System Architecture

```text
                         ORIANE
                  VIDEO PERCEPTION
                         │
                         ▼
              ┌────────────────────┐
              │   VIDEO ONTOLOGY   │
              │ scene / speech /   │
              │ object / event /   │
              │ semantic timeline  │
              └─────────┬──────────┘
                        │
                        ▼
                 ╔════════════╗
                 ║   CORTEX   ║
                 ║ attention  ║
                 ║ salience   ║
                 ║ load       ║
                 ║ novelty    ║
                 ║ relevance  ║
                 ╚══════╤═════╝
                        │
                 parameterize
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   COLD SCROLLER   INTENT VIEWER   ENTHUSIAST
        │               │               │
        └────── SYNTHETIC AUDIENCE ─────┘
                        │
                        ▼
               ATTENTION FRACTURES
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
       ORIANE EVIDENCE        AI ANALYST
              │                   │
              └─────────┬─────────┘
                        ▼
                  INTERVENTION
                        │
                        ▼
              COUNTERFACTUAL RUN
```

---

# 5. Oriane: The Perception Layer

Oriane should be structurally central to NEURASCOPE.

NEURASCOPE should **not** waste hackathon time rebuilding video perception.

Oriane provides the structured understanding of:

- what appears on screen
- people
- products
- objects
- scenes
- visual events
- spoken language
- transcript
- captions
- topic/context
- creator/account context
- available performance metadata
- semantically comparable videos

Conceptually:

```text
00:00.0  face appears
00:01.8  spoken hook begins
00:03.4  overlay appears
00:05.1  product appears
00:07.3  scene transition
00:09.8  semantic progression slows
00:11.3  no meaningful visual state change
00:13.2  payoff begins
```

Oriane acts as CORTEX's **eyes, ears, and corpus intelligence layer**.

## Second Oriane role: corpus evidence

After CORTEX identifies a possible attention fracture, Oriane can retrieve semantically comparable content.

Example:

```text
CORPUS EVIDENCE

Comparable videos: 42

Your product reveal:
12.4s

Comparison cohort median:
6.7s

Your major visual/semantic transition:
11.7s

Comparable cohort:
8.1s
```

Important scientific guardrail:

**Views, likes, and engagement are not retention ground truth.**

Label this:

> **Corpus evidence consistent with the model diagnosis**

Not:

> “Proof that humans drop here.”


## Oriane capability contract

The build agent must inspect the **actual hackathon API documentation and credentials** before assuming endpoint behavior.

### Required if supported by the provided API

Use Oriane for as much of the real perception layer as the API exposes:

- transcript / speech
- visual concepts
- objects / products / people
- scene or frame-level context
- creator/account metadata
- video metrics
- semantic search / retrieval

### Conditional

Corpus benchmarking and “comparable videos” are mandatory **only if the hackathon API exposes a legitimate retrieval/search path** that supports them.

If that capability is unavailable:

- do not invent an Oriane endpoint;
- do not fabricate retrieved videos;
- keep the `Evidence` architecture intact;
- use Oriane-derived evidence from the analyzed video itself;
- visibly mark corpus comparison as unavailable rather than faking it.

### Adapter rule

All Oriane data must flow through a typed internal adapter so downstream CORTEX code does not depend directly on unstable external response shapes.

Conceptual interface:

```ts
interface OrianeVideoOntology {
  source: "oriane";
  videoId?: string;
  durationMs: number;
  transcript: TranscriptSpan[];
  visualEvents: VisualEvent[];
  semanticEvents: SemanticEvent[];
  entities: EntityMention[];
  metrics?: VideoMetrics;
  creator?: CreatorContext;
  comparableVideos?: ComparableVideo[];
}
```

No downstream system may silently substitute fake Oriane data and still label it as Oriane output.

---


# 5A. FROZEN ORIANE ARCHITECTURE v1 — September 27, 2026

> **Architecture status: FROZEN for the hackathon build.**
>
> This section is the canonical Oriane architecture for NEURASCOPE v1. Where earlier broad/conceptual Oriane language in this document conflicts with this section, **this section wins**. Reopen this architecture only if the live Oriane API materially differs from the checked-in OpenAPI contract in \`docs/oriane/openapi.snapshot.json\`.

## 5A.1 Product invariant

NEURASCOPE answers one question:

> **Where is this video likely to lose attention, why, and what should I change before I publish it?**

Canonical loop:

\`\`\`text
DRAFT / PUBLISHED VIDEO
        ↓
OBSERVE
        ↓
MODEL
        ↓
SIMULATE
        ↓
ATTENTION FRACTURE
        ↓
GROUND AGAINST REAL-WORLD CORPUS
        ↓
DIAGNOSE
        ↓
INTERVENE
        ↓
RE-SIMULATE
\`\`\`

The product division is:

> **CORTEX simulates the draft. Oriane grounds the simulation against the real content ecosystem.**

Oriane is not the attention model. It is the external content-intelligence and corpus layer around CORTEX.

---

## 5A.2 Two source modes

### Mode A — Draft preflight

This is the canonical long-term customer workflow.

\`\`\`text
UNPUBLISHED MP4
      │
      ├──────────────────────┐
      ▼                      ▼
LOCAL MEDIA            DRAFT FINGERPRINT
OBSERVATION                   │
      │                       │
      ▼                       ▼
VIDEO ONTOLOGY           ORIANE CORPUS
      │                       │
      ▼                       ▼
CORTEX                REFERENCE CONTENT
      │                       │
      ▼                       │
SYNTHETIC AUDIENCE           │
      │                       │
      └────────────┬──────────┘
                   ▼
               DIAGNOSIS
\`\`\`

The unpublished video is decoded locally. NEURASCOPE measures the source itself and may extract selected representative frames for corpus retrieval. The full unpublished MP4 is not required to be sent to Oriane.

Local observation includes the signals already implemented or explicitly added later:

- frame difference / visual change
- cuts
- luminance
- spatial entropy / gaze-dispersion proxy
- audio RMS / onsets
- duration and timing

For corpus grounding, NEURASCOPE may extract a small set of representative draft frames, encode them as image assets, and use Oriane to retrieve related indexed public content.

### Mode B — Published / hybrid analysis

When a TikTok or Instagram URL is available, Oriane can resolve the indexed source record.

Best hackathon demo input:

\`\`\`text
PUBLISHED URL + MATCHING MP4
\`\`\`

The URL supplies Oriane semantics/context; the MP4 supplies directly measured visual/audio signals.

\`\`\`text
PUBLISHED URL ──► ORIANE ──► transcript / keyframes / caption / hashtags /
                              creator / audio / aggregate metadata
                                      │
                                      ▼
                                VIDEO ONTOLOGY
                                      ▲
                                      │
MATCHING MP4 ──► LOCAL DECODER ──► measured visual/audio signals
\`\`\`

Do not throw one source away when both exist. Merge them with explicit provenance.

---

## 5A.3 Oriane has four responsibilities

Oriane owns exactly four roles in NEURASCOPE v1.

### A. Published-source resolution

For indexed TikTok/Instagram content, Oriane may provide:

- timed transcript chunks
- transcript language
- keyframes / frames
- caption
- hashtags
- duration
- creator/account context
- audio metadata
- aggregate content metrics
- request metadata / provenance

Only fields actually returned by the live API may be used. Do not invent missing perception capabilities.

### B. Draft/reference visual retrieval

For unpublished drafts, NEURASCOPE may extract selected representative frames locally and create Oriane image assets from those frames.

Recommended visual fingerprint:

\`\`\`text
HOOK FRAME
PRE-FRACTURE FRAME
FRACTURE-CENTER FRAME
POST-FRACTURE FRAME
PAYOFF / PRODUCT FRAME (when available)
\`\`\`

The API currently supports reusable image or text assets. Reuse assets where possible; do not recreate identical assets repeatedly.

### C. Fracture-conditioned multimodal corpus retrieval

After CORTEX identifies an Attention Fracture, construct a **Fracture Fingerprint** and use Oriane to retrieve relevant real-world content.

The retrieval problem is not simply:

> “find an image that looks like this frame.”

It is:

> “retrieve published content structurally, visually, and semantically relevant to this exact failure state.”

Candidate dimensions include, only where supported by the live API:

- visual similarity to one or more selected frames
- transcript exact/fuzzy relevance
- caption/category context
- hashtag overlap
- platform / format
- language
- creator scale
- publication recency
- audio context
- duration proximity (if available in the API contract)

Use nested queries when useful. Prefer broad candidate generation followed by transparent filtering/reranking over an overconstrained query that returns nothing.

### D. Corpus reference intelligence

Retrieved videos form a **CorpusReferenceSet** used as real-world context around a CORTEX diagnosis.

Oriane gives CORTEX a reference population of public content; it does **not** provide attention ground truth.

---

## 5A.4 Fracture Fingerprint — canonical bridge between CORTEX and Oriane

Every Attention Fracture should be representable as a machine-readable fingerprint.

Conceptual contract:

\`\`\`ts
interface FractureFingerprint {
  fractureId: string;

  time: {
    start: number;
    end: number;
    relativePosition: number;
  };

  structure: {
    duration: number;
    secondsSinceCut: number;
    wordsSinceCut: number;
    speechRate: number | null;
    openLoopSeconds: number;
    payoffState: string;
  };

  cortex: {
    topDrivers: string[];
    novelty: number;
    salience: number;
    load: number;
    progression: number;
    staticness: number;
    habituation: number;
  };

  source: {
    transcriptWindow?: string;
    caption?: string;
    hashtags?: string[];
    platform?: string;
  };

  assets: {
    beforeFrame?: string;
    fractureFrame?: string;
    afterFrame?: string;
  };
}
\`\`\`

Canonical bridge:

\`\`\`text
CORTEX
   ↓
ATTENTION FRACTURE
   ↓
FRACTURE FINGERPRINT
   ↓
ORIANE MULTIMODAL RETRIEVAL
   ↓
CORPUS REFERENCE SET
\`\`\`

This fingerprint is an internal retrieval/query object. Its CORTEX fields are model-derived; its source fields are observed/normalized source evidence.

---

## 5A.5 Corpus reference set and structural benchmarking

Do not reduce Oriane corpus evidence to “median views” or a generic creator-analytics panel.

The primary question is:

> **How is this draft structurally unusual relative to relevant real published content?**

A CorpusReferenceSet should prefer relevant content over merely top-performing content.

Potential structural benchmark features, only when defensibly measurable:

- video duration
- speech density
- timing of first semantic transition
- timing of payoff/product mention
- keyframe / visual-state transition timing
- opening-hook structure
- transcript progression
- category/caption alignment
- audio/category context

Example UI:

\`\`\`text
CORPUS EVIDENCE · ORIANE
23 related published videos

First major semantic transition
YOUR DRAFT        7.1 s
REFERENCE MEDIAN  3.9 s

Payoff / product mention
YOUR DRAFT        12.8 s
REFERENCE MEDIAN  7.0 s

18 / 23 matched visual fingerprint
14 / 23 matched semantic query
\`\`\`

The corpus median is **not** automatically an optimal edit target. It is reference evidence, not a causal prescription.

Performance metadata such as views or engagement rate may be displayed only as secondary descriptive context and must be labelled accordingly.

---

## 5A.6 Hard epistemic boundary

NEURASCOPE has three distinct evidence/truth layers.

### 1. Observed source/corpus evidence

Examples:

- transcript says X at 6.3 s
- source frame changes here
- creator has N followers
- comparable video duration is 23 s
- Oriane visual similarity score is Y

These come from Oriane or direct local observation.

### 2. CORTEX predictions

Examples:

- attention
- hazard
- synthetic survival / retention
- fracture severity
- cohort impact
- neural-reliability proxy
- network demand
- counterfactual delta

These remain **Tier C — model-derived**, even when calibrated by literature.

### 3. Real behavioral labels

Future calibration data:

- actual per-second retention
- actual watch time
- actual skip/drop-off behavior

These must come from platform analytics or the content owner.

Hard rule:

\`\`\`text
views ≠ attention
likes ≠ retention
engagement rate ≠ survival
\`\`\`

Oriane aggregate performance metadata must never be converted directly into CORTEX attention, survival, or retention ground truth.

---

## 5A.7 Which Oriane fields may enter CORTEX

### Allowed as source/context features when available

- timed transcript
- duration
- semantic timing derived from transcript
- caption/context
- hashtags/category context
- keyframe timing
- audio identity/context

Any mapping from these fields to a CORTEX variable must be explicit, documented, and correctly tiered.

### Not direct CORTEX attention features

Keep these outside the attention calculation:

- views
- likes
- shares
- comments
- engagement rate
- creator follower count
- verified status
- popular comments

These belong to **corpus context**, retrieval stratification, or future analysis—not direct attention prediction.

Follower count may be used to construct a more comparable reference set (creator-scale matching); it must not imply greater or lower attention.

---

## 5A.8 Canonical data separation

Keep source ontology and corpus intelligence separate.

\`\`\`ts
interface CorpusReferenceSet {
  id: string;
  provider: "oriane";
  requestIds: string[];

  sourceFractureId?: string;

  retrieval: {
    visualAssetIds: string[];
    textAssetIds: string[];
    filters: Record<string, unknown>;
  };

  results: CorpusReferenceVideo[];
  benchmark: CorpusBenchmark;
}
\`\`\`

\`\`\`ts
interface CorpusReferenceVideo {
  id: string;
  platform: "tiktok" | "instagram";
  matchedQueries: string[];

  creator: {
    handle: string;
    followers: number;
  };

  duration: number | null;
  transcriptChunks: TranscriptSegment[];
  frames: Keyframe[];

  metrics: {
    views: number;
    engagementRate: number | null;
  };

  similarity: {
    visual: number | null;
    transcript?: number | null;
  };
}
\`\`\`

\`\`\`ts
interface CorpusBenchmark {
  sampleSize: number;
  duration?: DistributionSummary;
  semanticTransition?: DistributionSummary;
  payoffTiming?: DistributionSummary;
  speechDensity?: DistributionSummary;
  limitations: string[];
}
\`\`\`

Do not stuff corpus results into \`VideoOntology\`. \`VideoOntology\` is the normalized source-video representation consumed by CORTEX; \`CorpusReferenceSet\` is external reference evidence.

---

## 5A.9 Provenance rules

Run-level source state remains:

\`\`\`text
oriane-live
dev-fixture
local-only
\`\`\`

Do not collapse these.

Field-level provenance should become more granular where useful:

\`\`\`text
origin: local-decoder
origin: oriane
origin: oriane-corpus
\`\`\`

Oriane request IDs should be preserved for live observations and corpus retrieval where available.

A development fixture may never be presented as live Oriane output.

---

## 5A.10 Retrieval strategy

### Stage 1 — build retrieval assets

For a fracture, prefer approximately:

- pre-fracture frame
- fracture-center frame
- post-fracture frame

Optionally add hook/payoff frames when they materially help retrieval.

Text assets may contain a concise semantic description or transcript window, subject to the API limits.

### Stage 2 — broad candidate generation

Prefer an OR-leaning multimodal retrieval strategy to avoid empty result sets.

Conceptually:

\`\`\`text
platform / format guardrails
AND
(
  visual similarity
  OR transcript/category relevance
)
\`\`\`

### Stage 3 — transparent local reranking

NEURASCOPE may rerank candidate references by a documented relevance score using factors such as:

- visual similarity
- semantic/category overlap
- duration proximity
- creator-scale proximity

If exposed, these weights are Tier D presentation/retrieval heuristics, not neuroscience.

### Stage 4 — structural benchmark

Compute only benchmark features that can be measured defensibly from the retrieved records.

Do not automatically select only top-performing content. That creates survivorship and distribution confounds.

---

## 5A.11 UI / Evidence Graph

Oriane corpus intelligence belongs inside the fracture diagnosis, not as a separate search dashboard.

Desired evidence chain:

\`\`\`text
SOURCE VIDEO EVENT
      ↓
OBSERVED SOURCE EVIDENCE
      ↓
CORTEX DRIVER
      ↓
AFFECTED COHORT
      ↓
SCIENTIFIC PROVENANCE
      ↓
ORIANE CORPUS EVIDENCE
      ↓
INTERVENTION
      ↓
COUNTERFACTUAL
\`\`\`

Conceptual fracture panel:

\`\`\`text
ATTENTION FRACTURE F2
4.5–5.4 s

MODEL CONSEQUENCE
Predicted hazard +0.037/s
Predicted survival cost −3.8 pts

CORTEX MECHANISMS
Processing load ↑       C · model-derived
Semantic progression ↓  C · model-derived
Payoff unresolved       D · heuristic

OBSERVED SOURCE
3.6 s since visual transition
27 spoken words since last cut
0 new concepts in window
payoff still open

CORPUS EVIDENCE · ORIANE
23 related published videos
semantic transition: draft 7.1 s / reference median 3.9 s
payoff: draft 12.8 s / reference median 7.0 s

Performance metadata is descriptive only.
Not retention ground truth.
\`\`\`

Do not build a generic Oriane advanced-search dashboard. Retrieval machinery remains behind the decision workflow.

---

## 5A.12 Brain, synthetic reviewers, EEG and Oriane

The visualization stack is downstream of CORTEX:

\`\`\`text
CORTEX state
    ├── brain network visualization
    ├── synthetic EEG proxy
    ├── retention / hazard
    └── synthetic reviewer animation
\`\`\`

Oriane does not directly:

- animate reviewers
- generate neural activity
- determine synthetic attention
- generate EEG
- calculate retention
- calculate hazard
- calculate counterfactual uplift

The thin connection from the brain to a synthetic reviewer represents **CORTEX state projection / model-state coupling**, not a biological neural transmission and not an Oriane signal.

---

## 5A.13 Intervention ownership

Interventions are generated from the CORTEX fracture and driver structure.

\`\`\`text
fracture
   ↓
driver attribution
   ↓
intervention hypothesis
   ↓
same-population counterfactual rerun
\`\`\`

Oriane corpus evidence may support or contextualize the reasoning, but Oriane does not directly define the optimal edit.

Example:

\`\`\`text
CORTEX:
payoff appears late / unresolved

ORIANE CORPUS:
related content tends to introduce comparable payoff earlier

INTERVENTION:
move payoff materially earlier

SIMULATE PATCH:
rerun identical seeded viewers
\`\`\`

Do not equate the reference median with a scientifically optimal target.

---

## 5A.14 LLM role

The optional LLM remains an explanation layer.

\`\`\`text
structured CORTEX state
+ source observations
+ Oriane corpus summary
+ scientific provenance
        ↓
      LLM
        ↓
natural-language explanation
\`\`\`

The LLM may not create or modify simulation numbers, invent provider evidence, or claim that Oriane proves retention.

---

## 5A.15 Client/API scope

Critical-path Oriane client methods:

- \`searchContents()\`
- \`createAsset()\`

\`searchProfiles()\` is not required for the hackathon critical path. Add it only if live corpus construction genuinely needs it.

Expand \`src/lib/oriane/types.ts\` only for fields/filters actually used by the frozen architecture. Do not mechanically mirror the entire OpenAPI schema.

The checked-in API contract currently exposes richer search filters than the initial TypeScript wrapper, including caption, transcript fuzzy matching, hashtags, profile/creator metadata, engagement fields, publication time, audio, location and visual similarity. Use only those that improve retrieval/reference quality.

Never invent unsupported endpoints.

---

## 5A.16 Cost, quota and caching

The real key is a limited provider resource.

Rules:

- keep \`ORIANE_API_KEY\` server-only;
- never use \`NEXT_PUBLIC_ORIANE_API_KEY\`;
- keep provider routes rate-limited;
- cache published URL → normalized ontology;
- hash image/text assets and reuse Oriane asset IDs where practical;
- cache fracture fingerprint/filter config → corpus results;
- never call Oriane continuously as the playhead moves;
- corpus calls happen on explicit evidence requests or bounded prefetch for the top fracture(s);
- generic upstream failures must not expose credentials or raw provider details.

Existing per-IP / route-wide protection and bounded caching should remain.

---

## 5A.17 Privacy

For an unpublished draft:

- decode the full video locally;
- do not require uploading the complete MP4 to Oriane;
- use only selected visual/text fingerprints needed for corpus retrieval;
- make the source/corpus provenance clear.

This is both technically aligned with the available API and a desirable product property.

---

## 5A.18 Failure architecture

Oriane enriches NEURASCOPE but must not be a single point of failure.

If Oriane fails:

\`\`\`text
CORTEX still runs
synthetic viewers still run
fractures still work
counterfactuals still work

Corpus Evidence:
Unavailable
\`\`\`

If published URL resolution fails but a local MP4 exists, continue local analysis and mark the source correctly.

No silent fixture substitution.

---

## 5A.19 Explicit non-goals

Do not turn NEURASCOPE into:

- a generic creator analytics dashboard
- influencer discovery
- a trend dashboard
- a social-listening product
- a comment-sentiment engine
- a viral score
- a dopamine score
- demographic neuroscience
- an arbitrary AI engagement score
- a giant Oriane search UI
- a full video editor

Do not infer emotion from synthetic reviewers. Do not fabricate provider records. Do not convert views/likes into retention.

---

## 5A.20 Long-term calibration moat

Hackathon architecture:

\`\`\`text
ORIANE
real content structure / corpus
        +
CORTEX
synthetic attention prediction
\`\`\`

Company architecture:

\`\`\`text
ORIANE PERCEPTION / CORPUS
          │
          ▼
VIDEO ─► CORTEX
          │
          ▼
      PREDICTION
          │
          ▼
        PUBLISH
          │
          ▼
ACTUAL PLATFORM RETENTION
          │
          ▼
   PREDICTION ERROR
          │
          ▼
    CALIBRATE CORTEX
          │
          └────► BETTER PREDICTION
\`\`\`

Oriane provides the world/content model. Actual creator/platform analytics provide behavioral labels. CORTEX learns the mapping.

The long-term moat is:

> **prediction → real outcome → calibration → better prediction**

---

## 5A.21 Frozen division of labor

### Oriane — “What exists in the content ecosystem?”

Provides:

- indexed published-source intelligence
- visual/semantic retrieval
- creator/context metadata
- reference content
- corpus evidence

### CORTEX — “What may happen to attention?”

Provides:

- attention
- hazard
- survival
- synthetic audience
- attention fractures
- network state / neural proxy
- counterfactual predictions

### Scientific literature — “Why are these model relationships plausible?”

Provides:

- effect directions
- priors
- calibration anchors
- limitations

### Platform analytics — future — “What actually happened?”

Provides:

- actual retention
- watch time
- skip/drop-off behavior

### LLM — “How do we communicate the structured result?”

Provides:

- explanation
- summarization
- grounded interaction

---

## 5A.22 Canonical full architecture

\`\`\`text
                         ┌────────────────────────────┐
                         │         USER INPUT         │
                         │ Draft MP4 and/or URL       │
                         └─────────────┬──────────────┘
                                       │
                 ┌─────────────────────┴──────────────────────┐
                 │                                            │
                 ▼                                            ▼
      ┌─────────────────────┐                     ┌─────────────────────┐
      │ LOCAL MEDIA         │                     │ ORIANE SOURCE       │
      │ OBSERVATION         │                     │ RESOLUTION          │
      │                     │                     │ if published        │
      │ frame change        │                     │ transcript          │
      │ cuts                │                     │ keyframes           │
      │ luminance           │                     │ caption             │
      │ entropy             │                     │ hashtags            │
      │ audio RMS           │                     │ creator / audio     │
      └──────────┬──────────┘                     └──────────┬──────────┘
                 │                                           │
                 └──────────────────┬────────────────────────┘
                                    ▼
                          ┌──────────────────┐
                          │ VIDEO ONTOLOGY   │
                          └────────┬─────────┘
                                   │
                                   ▼
                   ╔════════════════════════════╗
                   ║          CORTEX            ║
                   ║ novelty / salience         ║
                   ║ progression / load         ║
                   ║ relevance / habituation    ║
                   ╚─────────────┬──────────────╝
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ 10,000 SYNTHETIC       │
                    │ VIEWERS                 │
                    │ attention / hazard      │
                    │ survival                │
                    └────────────┬────────────┘
                                 │
                                 ▼
                     ╔══════════════════════╗
                     ║ ATTENTION FRACTURE   ║
                     ╚──────────┬───────────╝
                                │
                                ▼
                     ┌──────────────────────┐
                     │ FRACTURE FINGERPRINT│
                     │ frames / transcript │
                     │ structure / drivers │
                     └──────────┬───────────┘
                                │
                                ▼
                  ╔════════════════════════════╗
                  ║          ORIANE            ║
                  ║     CORPUS INTELLIGENCE    ║
                  ║ assets / visual similarity ║
                  ║ transcript / category      ║
                  ╚────────────┬───────────────╝
                               │
                               ▼
                  ┌────────────────────────────┐
                  │ CORPUS REFERENCE SET       │
                  │ related real content       │
                  │ structural benchmarks      │
                  │ descriptive performance    │
                  └────────────┬───────────────┘
                               │
             ┌─────────────────┴─────────────────┐
             │                                   │
             ▼                                   ▼
      CORTEX DIAGNOSIS                  CORPUS EVIDENCE
             │                                   │
             └─────────────────┬─────────────────┘
                               ▼
                     ┌────────────────────┐
                     │ INTERVENTION       │
                     └─────────┬──────────┘
                               │
                               ▼
                     ┌────────────────────┐
                     │ SIMULATE PATCH     │
                     │ same viewers       │
                     └─────────┬──────────┘
                               │
                               ▼
                     ORIGINAL vs PATCH
\`\`\`

Canonical sentence:

> **Local/Oriane source observation → CORTEX → synthetic audience → Attention Fracture → Fracture Fingerprint → Oriane multimodal corpus retrieval → structural corpus evidence → intervention → same-population counterfactual.**

Hard scientific boundary:

> **Oriane observes and retrieves. CORTEX predicts. Platform analytics later validate.**

---

## 5A.23 Hackathon implementation priorities

### MUST SHIP

- real \`ORIANE_API_KEY\` authentication works server-side
- published URL resolution works against real Oriane
- \`ORIANE LIVE\` provenance is visible
- image/text asset creation works
- fracture → Oriane comparable-content retrieval works
- real corpus results appear as Corpus Evidence
- no views/likes → retention misuse
- request IDs / provenance retained
- caching and rate limiting remain active

### SHOULD SHIP

- multiple fracture image assets
- multimodal / nested retrieval
- reference-set filtering
- structural benchmark
- matched-query provenance
- cached real-analysis replay for demo resilience

### DO NOT LET BLOCK THE DEMO

- profile-search integration
- popular-comment analysis
- complex reranking
- perfect category classification
- advanced reference-set segmentation

---

## 5A.24 Pitch language

Canonical short explanation:

> **NEURASCOPE pre-tests short-form video before publication. CORTEX simulates 10,000 synthetic viewers and finds attention fractures; Oriane grounds those predictions against relevant real-world content; then NEURASCOPE simulates an edit before spending real attention.**

Canonical Oriane explanation:

> **Oriane gives CORTEX both a published-content perception layer and a real-world reference corpus. CORTEX remains the attention model.**

Canonical analogy:

> **Software has unit tests. Movies have test audiences. NEURASCOPE is the test environment for video.**


# 6. CORTEX — Scientific Attention Engine

CORTEX is the core scientific engine of NEURASCOPE.

It is **not** a hand-wavy “engagement score” and it is **not** a literal neuron-by-neuron brain simulation. It is a multimodal computational viewer whose state variables, priors, and mappings are grounded in published neuroscience, psychophysiology, eye-tracking, and media-processing research.

The model should use three evidence classes:

### A. Empirical distributions

Where public datasets expose participant-level measurements, derive priors and variability from real distributions.

Primary substrate:

**The Brain, Body, and Behavior Dataset (BBBD), Madsen, Kuppa & Parra, 2026**

- 178 participants
- five experiments
- about 110 hours of recordings
- EEG
- EOG
- ECG
- respiration
- pupil size
- gaze position
- saccades
- blinks
- fixations
- head motion
- all time-aligned to video
- attentive and distracted viewing paradigms

Source: https://www.nature.com/articles/s41597-026-07215-1

This dataset gives NEURASCOPE a real empirical substrate for attention-state variability rather than invented “persona coefficients.”

### B. Published effect directions and relationships

Where raw participant-level data is not practical to integrate during the hack, use effect directions and relationships supported by peer-reviewed work.

Examples:

- EEG inter-subject correlation (ISC) is strongly modulated by attentional state during naturalistic audiovisual narratives.
- Neural engagement / reliability has been associated with behavioral engagement and time commitment to videos.
- Neural reliability across viewers has predicted population-level preference and viewership in naturalistic-media studies.
- Limited-capacity media-processing research supports explicit modeling of cognitive load, resource allocation, motivation, and memory.
- Human fixation scanpaths can be predicted computationally from image content and fixation history.

These should shape priors, features, and causal hypotheses—not be misrepresented as universal biological constants.

### C. NEURASCOPE-derived predictions

CORTEX combines the evidence above with features extracted from the current video.

At each timestep \(t\), construct a multimodal feature vector:

\[
X_t =
[
V_t,
S_t,
N_t,
L_t,
P_t,
R_t,
G_t,
A_t,
F_t,
C_t
]
\]

Where:

- \(V_t\) = visual-state change
- \(S_t\) = salience / event relevance
- \(N_t\) = perceptual + semantic novelty
- \(L_t\) = modeled processing load
- \(P_t\) = semantic / narrative progression
- \(R_t\) = audience relevance
- \(G_t\) = gaze / fixation proxy features
- \(A_t\) = audio-state change
- \(F_t\) = fatigue / habituation
- \(C_t\) = contextual state from Oriane + language reasoning

CORTEX maintains a latent viewer state:

\[
Z_t = f(X_t, Z_{t-1}, \theta_i)
\]

for synthetic viewer \(i\).

The viewer state should contain at minimum:

\[
Z_t =
[
attention,
salience,
load,
novelty,
relevance,
neural\ reliability\ proxy,
gaze\ concentration,
fatigue
]
\]

## Synthetic EEG / Neural Proxy

The product should render a scientifically informed **predicted neural proxy**, not a random EEG squiggle.

Define a model output:

\[
E_t =
[
\hat{\alpha}_t,
\hat{\theta}_t,
\hat{\beta}_t,
\widehat{ISC}_t
]
\]

These are **predicted EEG-derived features**, not measured electrical potentials.

The mapping must be documented in the Evidence Graph.

Examples of scientifically defensible mappings:

- attention state ↔ predicted EEG ISC / neural reliability
- distracted-state prior ↔ BBBD attentive-vs-distracted distributions
- oscillatory-band proxies ↔ only where a cited study supports the direction/context
- gaze concentration / divergence ↔ eye-tracking attention literature

Do not generate arbitrary oscillations and label them EEG.

The visible EEG trace may be synthesized for interpretability, but the displayed band-power / ISC state should be controlled by the actual CORTEX variables.

## Retention as survival

For each synthetic viewer, estimate instantaneous disengagement hazard:

\[
h_i(t)
=
\sigma(
\beta_0 +
\beta^\top Z_i(t)
)
\]

Then compute survival:

\[
S_i(t)
=
\prod_{\tau \le t}
(1-h_i(\tau))
\]

Synthetic-audience retention is:

\[
\hat R(t)
=
\frac{1}{N}
\sum_{i=1}^{N} S_i(t)
\]

The visible retention curve therefore emerges from the simulation rather than being manually drawn.

Label it:

> **Predicted Retention — Synthetic Audience**

or:

> **Synthetic Audience Retention**

## Attention Fractures

A fracture is not simply “the score went down.”

A fracture should require a meaningful change in modeled disengagement hazard plus an interpretable change in the underlying state.

Conceptually:

\[
\Delta h(t) > \tau_h
\]

and at least one supporting mechanism such as:

- novelty collapse
- semantic stagnation
- processing-load spike
- gaze dispersion
- unresolved payoff
- relevance loss
- salience decay
- excessive repetition

This gives every fracture:

1. a timestamp,
2. a predicted behavioral consequence,
3. a neural/attention-state explanation,
4. observable video evidence,
5. scientific provenance.

## Calibration

Hackathon version:

**empirical priors + published effects + transparent prototype mappings**

Company version:

fit CORTEX against real creator retention curves and observed outcomes:

\[
\theta^\* =
\arg\min_{\theta}
\sum_i
\mathcal{L}
(
\hat R_i(t;\theta),
R_i^{actual}(t)
)
\]

The long-term system improves by comparing:

**predicted attention → real post-publication retention → model update**


## Evidence-tier provenance

Every quantitative output must carry provenance metadata.

Use four tiers:

### Tier A — Empirical

Directly estimated, summarized, or sampled from an accessible participant-level dataset.

Example:

> BBBD attentive/distracted distribution.

### Tier B — Literature-calibrated

A relationship or direction comes from a peer-reviewed study, but NEURASCOPE applies it to the current video through its own mapping.

Example:

> neural reliability / ISC as an attentional-engagement proxy.

### Tier C — Model-derived

A value is mathematically derived from CORTEX using Tier A/B inputs and current video features.

Example:

> disengagement hazard or synthetic retention.

### Tier D — Heuristic

A temporary engineering assumption is required because no calibrated mapping exists yet.

Tier D is allowed for the hackathon only when:

- it is isolated,
- it is documented,
- it is not presented as an empirical finding,
- the Evidence Graph visibly labels it as heuristic.

This provenance should be attached to model values in code, for example:

```ts
type EvidenceTier = "empirical" | "literature" | "derived" | "heuristic";

interface ProvenancedValue {
  value: number;
  tier: EvidenceTier;
  sources: string[];
  method: string;
  confidence?: number;
}
```

## Synthetic EEG waveform generation

The displayed EEG must not be random decoration.

Recommended implementation:

1. CORTEX predicts band-power envelopes or neural-reliability proxy values over time.
2. A deterministic waveform synthesizer generates band-limited components whose **amplitudes are driven by those envelopes**.
3. The components are summed only for visualization.
4. The UI clearly labels the waveform **Predicted EEG Signature** or **Synthetic EEG Proxy**.

Conceptually:

\[
EEG_{vis}(t)
=
a_\theta(t)\sin(2\pi f_\theta t+\phi_\theta)
+
a_\alpha(t)\sin(2\pi f_\alpha t+\phi_\alpha)
+
a_\beta(t)\sin(2\pi f_\beta t+\phi_\beta)
+
\epsilon(t)
\]

where the amplitude envelopes \(a_\theta, a_\alpha, a_\beta\) come from CORTEX.

Use a seeded deterministic noise term so identical analyses reproduce identical results.

The waveform itself is representational.

The scientifically meaningful outputs are the model's band-power envelopes, neural-reliability proxy, gaze proxy, hazard, and retention state.

---

# 7. Scientific Claim Discipline

NEURASCOPE should be **aggressively scientific**, not timid—but scientific means every claim has a provenance.

The product may confidently say:

- neuroscience-informed computational attention model
- synthetic audience
- predicted retention
- predicted neural proxy
- modeled salience-network demand
- modeled attentional reorientation
- neural-reliability proxy
- predicted gaze concentration
- attention fracture
- research-backed parameter prior
- empirical distribution sampled from BBBD
- counterfactual prediction

The product should **not** say:

- measured EEG, unless real EEG was actually measured
- “your ACC is 84% active”
- “dopamine score”
- “this is exactly what a human brain does”
- “we simulated every neuron”
- “this guarantees retention”
- “likes are retention”
- demographic claims about neurobiology that are not supported by data

Canonical methodology disclosure:

> **CORTEX is a research-backed computational attention model. Neural visualizations and synthetic EEG are model predictions derived from published neuroscience, gaze, psychophysiology, and naturalistic-media findings; they are not direct recordings from the viewer.**

This should not be hidden as legal fine print. It should be accessible from the scientific evidence layer because transparency increases credibility.

---

# 8. Scientific Evidence Stack

The research basis must be a first-class product feature.

Every major model variable should be linked to evidence.

## 8.1 Core evidence matrix

| Product construct | Scientific evidence | What it supports | What it does **not** prove |
|---|---|---|---|
| **Attention / neural reliability** | Ki, Kelly & Parra (2016), *Attention Strongly Modulates Reliability of Neural Responses to Naturalistic Narrative Stimuli* | EEG inter-subject correlation is strongly modulated by attentive vs distracted viewing of naturalistic narratives | Does not give a universal TikTok retention equation |
| **Behavioral engagement / time commitment** | Poulsen et al. (2017), *Engaging narratives evoke similar neural activity and lead to similar time perception* | EEG neural engagement / ISC relates to behavioral engagement with narratives | Does not imply that ISC alone determines watch time |
| **Population response** | Dmochowski et al. (2014), *Audience preferences are predicted by temporal reliability of neural processing* | Neural reliability predicted population preference and viewership in the studied naturalistic media | Does not mean every content category shares identical coefficients |
| **Video time allocation / online engagement** | *Brain activity forecasts video engagement in an internet attention market* (2020) | Specific neural responses predicted individual and aggregate video-viewing duration/frequency in that experiment | fMRI effects cannot be converted directly into arbitrary EEG values |
| **Multimodal attention priors** | Madsen, Kuppa & Parra (2026), BBBD | Participant-level EEG, gaze, pupil, fixations, blinks, ECG, respiration, head motion, attentive/distracted conditions | Educational-video subjects are not automatically identical to short-form social audiences |
| **Cognitive load / resource allocation** | LC4MP research + 2020 meta-analysis (142 articles, 683 effects) | Supports explicit modeling of limited processing capacity, load, motivation, and memory | Does not specify one universal “load score” |
| **Visual fixation prediction** | Kümmerer et al. (2022), DeepGaze III | Demonstrates computational prediction of human free-viewing fixation scanpaths from visual input + fixation history | DeepGaze III is trained on static images; it is not directly a video-retention model |
| **Eye movement synchrony** | Madsen et al. (2021), *Synchronized eye movements predict test scores in online video education* | Gaze and pupil synchrony decrease with distraction and carry attention information | Educational attention ≠ creator-platform retention |

## 8.2 Primary references

### BBBD — empirical multimodal substrate

**Madsen, J., Kuppa, N., & Parra, L. C. (2026). The Brain, Body, and Behavior Dataset (BBBD): Multimodal Recordings during Educational Videos. Scientific Data, 13, 920.**

https://www.nature.com/articles/s41597-026-07215-1

Use for participant-level variability, attentive-vs-distracted state priors, EEG, gaze, pupil, blinks, saccades, fixations, physiology, and synchronized video alignment.

### Attention and EEG reliability

**Ki, J. J., Kelly, S. P., & Parra, L. C. (2016). Attention Strongly Modulates Reliability of Neural Responses to Naturalistic Narrative Stimuli. Journal of Neuroscience, 36(10), 3092–3101.**

https://pmc.ncbi.nlm.nih.gov/articles/PMC6601758/

Use for attentional-state ↔ EEG ISC relationships and neural reliability during naturalistic narratives.

### Neural engagement and behavioral engagement

**Poulsen et al. (2017). Engaging narratives evoke similar neural activity and lead to similar time perception.**

https://pmc.ncbi.nlm.nih.gov/articles/PMC5496904/

Use for neural engagement ↔ behavioral engagement and narrative viewing.

### Population-level response

**Dmochowski, J. P. et al. (2014). Audience preferences are predicted by temporal reliability of neural processing. Nature Communications, 5, 4567.**

https://www.nature.com/articles/ncomms5567

Use for neural reliability, population preference, viewership, naturalistic television, and advertisements.

### Video engagement in an internet attention market

**Brain activity forecasts video engagement in an internet attention market (2020).**

https://pmc.ncbi.nlm.nih.gov/articles/PMC7104008/

Use for neural activity, video-viewing duration, online attention allocation, and individual-vs-population forecasting.

### LC4MP meta-analysis

**Limited Capacity Model of Motivated Mediated Message Processing: Meta-Analytically Summarizing Two Decades of Research (2020).**

https://academic.oup.com/anncom/article-abstract/44/4/322/7906639

Use for cognitive load, motivation, memory, and limited-capacity message processing.

### DeepGaze III

**Kümmerer et al. (2022). DeepGaze III: Modeling free-viewing human scanpaths with deep learning.**

https://pmc.ncbi.nlm.nih.gov/articles/PMC9055565/

Use for visual fixation probability, scanpath modeling, and human gaze prediction.

### Eye movement synchrony

**Synchronized eye movements predict test scores in online video education (2021).**

https://pmc.ncbi.nlm.nih.gov/articles/PMC7865179/

Use for gaze synchrony, pupil dynamics, and attentive-vs-distracted viewing.

## 8.3 Evidence Graph UI

The product should expose a button such as:

> **Evidence · 7 studies**

Clicking it opens a graph:

```text
VIDEO
  │
  ├── Visual fixation model
  │      └── DeepGaze III
  │
  ├── Cognitive load
  │      └── LC4MP meta-analysis
  │
  ├── Attention state
  │      ├── Ki et al. 2016
  │      └── BBBD 2026
  │
  ├── Neural engagement
  │      └── Poulsen et al. 2017
  │
  └── Population / retention evidence
         ├── Dmochowski et al. 2014
         └── Internet attention market 2020
```

Every brain/network state, EEG proxy, fracture, and retention conclusion should be inspectable back to this graph.

## 8.4 CoComelon / distraction-testing inspiration

The conceptual inspiration is traditional audience distraction testing: show people content, instrument when attention leaves, and revise the media around those breakpoints.

The reported CoComelon/Moonbug “Distractatron” is an inspiration for the **problem framing**, not the scientific basis of CORTEX.

NEURASCOPE computationalizes the broader laboratory idea:

> **Instead of waiting for a physical test audience to look away, run a research-backed computational test audience before publication.**

Do not frame the product as “copying CoComelon,” and do not make children the target market.

---

# 9. 3D Brain: Signature Product Primitive

The brain is not optional polish.

It is one of NEURASCOPE's signature interfaces and must look like a premium scientific visualization, not a hackathon prop.

## Visual target

> **Apple industrial design × high-end neuroscience instrumentation × Grok restraint**

The brain should read as an expensive object under controlled studio/scientific lighting.

It should **not** read as:

- neon cyberpunk,
- a gaming HUD,
- a glowing purple wireframe,
- a generic AI “brain icon,”
- a procedural blob with fake gyri.

## Anatomical source

Prefer an anatomically derived GLB / mesh with reproducible provenance and an open license.

Strong implementation references include:

- `StarKnightt/brain-explorer` — premium museum-style R3F brain using OpenNeuro-derived anatomy, cinematic focus transitions, provenance, BVH picking, and measured performance.
- `Rickaym/brain-game` — React Three Fiber brain assembled from region meshes derived from BodyParts3D.
- `digin1/brain-threejs` / NeuroSphere — Desikan-Killiany anatomical regions and interactive network/activity ideas.

The build agent may inspect these and other appropriate repositories for techniques, model pipelines, camera behavior, mesh organization, and performance patterns.

Do **not** blindly clone their UI.

Track all third-party model/assets in `THIRD_PARTY_NOTICES.md` with licenses and source URLs.

## Rendering requirements

Preferred stack:

- Three.js
- React Three Fiber
- Drei
- `@react-three/postprocessing`
- `three-mesh-bvh` if useful for dense picking

Target behavior:

- physically plausible tissue material,
- neutral ivory / silver / soft translucent tissue rather than saturated color,
- subtle depth and edge definition,
- restrained translucency,
- environment/studio lighting,
- selective emissive overlays only when functional activity needs to be shown,
- no permanent glow.

Performance target for the demo machine:

- interactive orbit remains smooth,
- strive for 50–60 fps during normal playback,
- dynamically reduce DPR / post-processing rather than dropping interaction quality,
- no expensive visual effect may block video synchronization.

## Brain modes

Keep modes small and meaningful:

### CORTEX
Clean anatomical brain with subtle modeled state.

### NETWORKS
Overlay functional-network proxies.

### NEURAL
Expose predicted neural / EEG-derived state and evidence.

Do not add modes simply because they look impressive.

## Functional overlays

Potential modeled systems include:

- visual processing,
- dorsal attention / sustained attention,
- ventral attention / reorientation,
- salience network,
- auditory/language processing,
- narrative / semantic integration,
- anticipatory-affect / reward circuitry **only where the evidence chain justifies it**.

The overlays may group anatomical regions for interpretation, but they must not imply voxel-level precision.

Example live label:

```text
MODELED SALIENCE-NETWORK DEMAND
↑ 0.18

Drivers
camera transition
new face
semantic topic shift

Provenance
Literature-calibrated
```

Never present the visualization as measured fMRI or measured neural activation.

## Interaction

The brain must support:

- drag/orbit,
- bounded zoom,
- click/select network,
- hover preview on fine-pointer devices,
- keyboard-accessible network list,
- smooth camera focus when a network is selected,
- camera restore on deselection,
- synchronized activation with the video timestamp.

When the user selects an Attention Fracture:

1. the timeline locks to the fracture,
2. the relevant network overlay becomes legible,
3. the brain camera may shift subtly toward the relevant region/network,
4. the evidence inspector exposes why the model changed.

The motion must clarify causality, not create spectacle for its own sake.

---

# 10. Synthetic Review Group — Empirical Viewer States

There is one central CORTEX architecture.

Synthetic viewers are **samples from research-informed parameter distributions**, not arbitrary fictional people.

Conceptually:

\[
\theta_i
\sim
P(\theta \mid D_{empirical}, L_{published}, C_{audience})
\]

Where:

- \(D_{empirical}\) = public participant-level data such as BBBD
- \(L_{published}\) = effect directions and relationships from literature
- \(C_{audience}\) = current audience/context settings

## Scientific viewer states

### Attentive / Intent State

Derived from attentive-viewing priors and high-relevance assumptions.

Possible characteristics:

- higher neural-reliability prior
- more concentrated gaze
- lower baseline disengagement hazard
- greater tolerance for exposition when semantic progression remains strong

### Distracted / Cold-Scroll State

Derived from distracted-viewing evidence plus short-form platform context.

Possible characteristics:

- lower neural-reliability prior
- higher baseline disengagement hazard
- lower tolerance for novelty loss
- greater sensitivity to processing-load spikes

### Visual-Salience-Sensitive State

Emphasizes fixation changes, perceptual novelty, scene transitions, motion, and salient object/face changes.

### High-Relevance / Category-Expert State

Emphasizes semantic relevance, information gain, sustained progression, and higher willingness to tolerate lower visual novelty.

## Product-facing names

For the UI, these can still be presented as:

- **Intent Viewer**
- **Cold Scroller**
- **Visual-First Viewer**
- **Category Enthusiast**

But these are **named parameter regimes**, not claims that every real person fits into one of four biological types.

## 3D review group

These remain core graphics.

Each cohort should have:

- a high-quality translucent 3D head / bust / brain representation
- its own CORTEX parameter fingerprint
- live predicted neural state
- predicted retention trace
- visible response when an attention fracture occurs

The visual group is the product-language layer.

The distribution underneath is the science.

---

# 11. 10,000 Synthetic Viewers

“10,000 viewers” should mean an actual computational ensemble.

For each synthetic viewer:

1. sample parameters from the relevant empirical / research-informed distribution,
2. apply audience-context conditioning,
3. run the synchronized video state through CORTEX,
4. calculate predicted neural proxy variables,
5. calculate disengagement hazard,
6. integrate survival over time,
7. aggregate the audience.

Conceptually:

\[
\theta_i \sim P(\theta)
\]

\[
Z_i(t) = f(X_t, Z_i(t-1), \theta_i)
\]

\[
h_i(t) = \sigma(g(Z_i(t)))
\]

\[
S_i(t)=\prod_{\tau \le t}(1-h_i(\tau))
\]

\[
\hat R(t)=\frac{1}{N}\sum_i S_i(t)
\]

## Output

Example:

```text
SYNTHETIC AUDIENCE · N = 10,000

Predicted survival @ 15 s

All viewers          62%
Cold Scroll regime   39%
Intent regime        78%
Visual-First         48%
High-Relevance       82%

Primary fracture
11.34–12.86 s
```

Values must come from the actual simulation.

## Visualization

Represent the audience as an elegant particle field or point cloud.

Each point = one sampled computational viewer.

As video playback progresses:

- active viewers remain visible,
- disengaged viewers leave the active population,
- fractures create visible dropout waves,
- cohort colors / shapes may differ subtly,
- selecting one cohort filters both the viewer cloud and retention curve.

The point cloud must be synchronized with the same survival state used to calculate the chart.

No decorative fake audience motion.

---

# 12. Attention Fracture Ontology

The system should feel closer to Palantir than a generic SaaS analytics dashboard.

Core ontology:

```text
VIDEO
contains
SEGMENTS

SEGMENTS
contain
STIMULI / EVENTS

EVENTS
modify
CORTEX STATE

CORTEX STATE
differs across
AUDIENCE COHORTS

FRACTURES
have
CONTRIBUTING FACTORS

CONTRIBUTING FACTORS
are supported by
EVIDENCE

FRACTURES
can be addressed through
INTERVENTIONS

INTERVENTIONS
produce
COUNTERFACTUAL SIMULATIONS
```

An **Attention Fracture** is a first-class object.

Example:

```text
FRACTURE AF-0037

11.34s → 12.86s

Affected population

Cold Scroller        78%
Visual-First Viewer  61%
Intent Viewer        19%
Category Enthusiast  24%

State change

Novelty              -0.37
Semantic progression -0.29
Processing load      +0.24
Payoff distance      +1.9s

Evidence

- static visual state
- 21 consecutive spoken words
- no new semantic proposition
- payoff unresolved
```

Clicking a fracture should connect:

**timestamp → video frame → transcript → CORTEX state → brain network proxy → affected audience → corpus evidence → intervention**

---

# 13. AI Analyst / LLM Layer

The LLM should not be CORTEX.

Otherwise the system becomes:

> video → LLM → vibes

Instead:

- Oriane observes
- CORTEX calculates
- synthetic audience simulates
- LLM reasons over structured state

The AI analyst receives:

- video ontology
- temporal states
- fracture events
- audience results
- Oriane corpus evidence
- research basis

Then produces grounded diagnostics.

Example:

> Between 11.34 and 12.86 seconds, semantic progression slows while processing demand remains elevated. The effect is strongest among low-intent viewers.

And intervention:

> Move the product reveal approximately 1.7 seconds earlier and replace the static explanatory segment with visual evidence supporting the spoken claim.

---

# 14. Ask NEURASCOPE

The interface should include one floating command layer.

Examples:

- Why does attention collapse here?
- Optimize this for Cold Scrollers.
- Show me the evidence.
- Preserve the narrative but improve retention.
- Compare this against similar videos.
- Which edit has the highest predicted upside?
- What changes preserve information while reducing processing load?

Do not make it a generic chatbot sidebar.

Answers should attach spatially to the relevant object:

- timestamp question → timeline
- brain question → brain
- cohort question → audience model
- fracture question → fracture object

---

# 15. Interventions and Counterfactuals

Analytics products describe reality.

NEURASCOPE should let users act.

At a fracture:

### Intervention A
Cut 1.2 sec.

### Intervention B
Move product reveal from 13.2s to 10.6s.

### Intervention C
Insert visual demonstration.

### Intervention D
Rewrite spoken sentence.

Then:

> **SIMULATE INTERVENTION**

CORTEX runs a counterfactual.

Example:

```text
BEFORE

Predicted 15-second survival
47%

AFTER

Predicted 15-second survival
60%

MODEL DELTA
+13 pts
```

Always label this as a **model prediction**, never a guaranteed performance increase.

---

# 16. Startup Moat

The brain is not the moat.

The UI is not the moat.

The LLM is not the moat.

Oriane is not the moat.

The potential moat is the **calibration feedback loop**:

```text
pre-publish simulation
        ↓
content edited
        ↓
content published
        ↓
actual retention / performance
        ↓
predicted behavior vs real behavior
        ↓
CORTEX calibration
        ↓
better future predictions
```

Over time, each video can become a calibration event.

The long-term asset becomes:

> **a proprietary model of media attention**

---

# 17. API Direction

The hackathon interface should sit on top of internal primitives such as:

```text
POST /analyze
POST /simulate
GET  /fractures
POST /interventions
POST /compare
```

Potential response:

```json
{
  "retention_curve": [],
  "fractures": [],
  "network_state": [],
  "cohorts": [],
  "diagnosis": {},
  "benchmark": {}
}
```

Do not waste hackathon time polishing SDKs or Swagger.

The API matters because NEURASCOPE can later become infrastructure.

Future integrations:

- CapCut
- Premiere
- agency creative systems
- social scheduling platforms
- AI video generators
- generative ad pipelines

Future loop:

```text
generate 500 videos
        ↓
NEURASCOPE
        ↓
rank / diagnose
        ↓
regenerate top candidates
        ↓
NEURASCOPE
        ↓
publish strongest candidates
```

---

# 18. UI / Visual System — Canonical Design Contract

The build agent must treat this section as a **visual acceptance contract**, not loose inspiration.

The final product should feel like a serious scientific instrument built by a top-tier AI company.

## Reference blend

### Grok / xAI
Borrow:

- restraint,
- low-chrome interfaces,
- progressive disclosure,
- product-specific primitives instead of exposing implementation jargon,
- sophisticated AI interaction without “AI dashboard” clichés.

Do not copy Grok's chat layout.

### Apple
Borrow:

- spatial depth,
- physical-feeling motion,
- excellent material hierarchy,
- legibility,
- content-first composition,
- restrained Liquid-Glass-like controls.

Apple's current guidance explicitly treats glass as a **functional control/navigation layer above content**. Follow that principle:

> glass for controls; solid/quiet surfaces for scientific content.

Do not make every panel glass.

### Vercel / Geist
Borrow:

- disciplined grid,
- strong typography hierarchy,
- high contrast,
- Geist Sans + Geist Mono style pairing,
- precise hairline separators,
- compact instrumentation.

### Oriane
Borrow:

- video/content-first presentation,
- search-first directness,
- emphasis on what is actually inside the video.

## Global aesthetic

Desktop-first.

The main analysis surface should be designed first for approximately **1440×900 to 1728×1117** laptop/desktop windows.

It must remain usable at narrower laptop widths, but mobile polish is not a hackathon priority.

### Palette

Use:

- near-black / charcoal background,
- off-white primary text,
- cool neutral secondary text,
- extremely subtle borders,
- one restrained interactive accent,
- functional scientific color only when data requires it.

Reserve warm warning color for genuine fractures or risk.

Avoid:

- purple-to-blue AI gradients,
- rainbow heatmaps everywhere,
- cyan HUD lines,
- permanent neon edge glows,
- decorative auroras,
- loud gradient cards.

### Typography

Preferred:

- Geist Sans or equivalent for product text,
- Geist Mono or equivalent for timings, values, IDs, evidence tiers, and model readouts.

Hierarchy should be driven by size, weight, spacing, and alignment—not boxes.

Scientific values should look instrument-like:

```text
11.34 s
hazard +0.23
ISC proxy 0.71
Tier B · literature
```

### Surfaces

Avoid a traditional SaaS card grid.

Use:

- one continuous canvas,
- hairline dividers,
- localized inspectors,
- floating controls,
- edge-to-edge 3D/video content,
- one or two transient glass surfaces.

Never wrap every metric in a rounded rectangle.

## Product navigation

Keep top-level navigation minimal.

Recommended primitives:

- **Analyze**
- **CORTEX**
- **Audience**
- **Evidence**

Do not expose implementation primitives like “Models,” “Agents,” “Prompts,” “Pipelines,” or “Vector DB.”

## Empty / input state

The first screen should feel extremely simple.

Center:

**NEURASCOPE**

small descriptor:

> `Synthetic Attention Laboratory`

Primary interaction:

> Paste a TikTok / Reel / Short URL or upload a video

One main action:

> **Run simulation**

Optional audience control stays secondary.

A faint, slow, premium 3D brain may exist as background context, but it must not distract from the input.

No marketing-site hero carousel.

No giant feature grid before the user can analyze.

## Loading transition

After Analyze:

The input surface collapses into the working canvas.

Show a short sequence:

```text
Acquiring video intelligence
Aligning semantic timeline
Building CORTEX state
Sampling synthetic audience
Tracing evidence
```

Use subtle spatial transitions.

Do not fake long “AI thinking” theater.

If the pipeline is already complete, advance immediately.

---

# 19. Analysis Workspace — Exact Composition

This is the primary screen and the most important visual artifact in the project.

## Desktop composition

Use one edge-to-edge workspace divided approximately as:

- **left 34–38%:** source video + transcript context,
- **center/right 42–48%:** large interactive 3D CORTEX brain,
- **right/bottom rail 16–22%:** synthetic review cohort + evidence/metric inspector,
- **bottom 18–22% of height:** unified temporal analysis strip.

The brain should be visually dominant.

The interface should **not** look like three equal cards.

### Header

Thin top bar.

Left:
- NEURASCOPE wordmark.

Center:
- analyzed asset name / source,
- subtle status.

Right:
- `Evidence`
- brain mode selector
- compact overflow only if truly needed.

No full-height sidebar.

### Video zone

Vertical short-form video should preserve native portrait ratio.

Overlay only minimal controls.

On hover / active playback, show:

- play/pause,
- time,
- audio,
- scrub affordance.

Transcript should not permanently consume large space.

It may appear as a synchronized narrow text rail or contextual overlay.

### Brain zone

The 3D brain gets the largest uninterrupted visual field.

Around it, use minimal scientific annotations.

Maximum four live summary values should be visible at once, for example:

```text
ATTENTION   0.78
SALIENCE    0.83
LOAD        0.46
ISC PROXY   0.71
```

More detailed metrics live behind selection/evidence.

### Synthetic review group

The four named viewer regimes should appear as **premium mini 3D neural/head models**, not avatar cards.

Default row / cluster:

- Cold Scroller
- Intent Viewer
- Visual-First
- Category Enthusiast

Each shows only:

- name,
- current survival / attention indicator,
- one defining parameter if needed.

Selecting a cohort:

- changes the active retention curve,
- changes brain-state weighting,
- filters the audience particle field,
- updates fracture impact.

### Unified timeline

The timeline is the main quantitative instrument.

It must combine:

- predicted retention curve,
- current-playhead cursor,
- hazard / fracture markers,
- semantic/video event ticks,
- optional synthetic EEG band strip,
- selected intervention counterfactual.

Do not create five disconnected charts.

The user should understand the video temporally from one shared x-axis.

Possible layers:

```text
VIDEO EVENTS     ·  hook | cut | face | product | payoff
RETENTION        ━━━━━━━━━━━━━━━━━━━━━━━━━
HAZARD                   ▲ fracture
NEURAL PROXY     ~~~~~~~ predicted EEG / ISC
```

Scrubbing the timeline must update:

- video,
- brain state,
- cohort state,
- transcript,
- evidence inspector.

This synchronization is a non-negotiable acceptance test.

---

# 20. Attention Fracture Experience

A fracture is the signature interaction.

When CORTEX identifies a fracture:

- place a precise marker on the timeline,
- use restrained warning color,
- briefly pulse the relevant state,
- do not cover the screen with an alert.

On selection:

1. seek the video to the fracture start,
2. expand the temporal region,
3. focus the relevant brain/network overlay,
4. highlight the affected cohort(s),
5. open a forensic inspector.

Forensic inspector:

```text
ATTENTION FRACTURE
11.34–12.86 s

Predicted effect
hazard +0.23

Primary drivers
semantic progression  ↓
visual novelty        ↓
processing demand     ↑

Most affected
Cold Scroll regime    78%
Visual-First regime   61%

Observed evidence
static visual state   3.1 s
spoken words          21
payoff                unresolved

Research basis
Ki et al. 2016
BBBD 2026
LC4MP
```

The inspector should use typography and dividers, not a rainbow dashboard.

## Evidence interaction

Every scientific row may expose a small provenance indicator:

- `A` empirical
- `B` literature
- `C` derived
- `D` heuristic

Clicking a source opens the Evidence drawer.

The Evidence drawer must explain:

- source,
- experiment / dataset,
- measured variable,
- finding being used,
- mapping into CORTEX,
- limitation.

That makes the citations part of the product.

---

# 21. Motion, 3D, and Interaction Language

Motion must communicate model state.

## Allowed motion

- slow brain idle drift only when not interacting,
- orbit / focus transitions,
- network activation emerging from the current CORTEX state,
- timeline cursor synchronized to playback,
- cohort particle dropout when survival changes,
- inspector expansion from the selected fracture,
- before/after counterfactual line morph.

## Forbidden motion

- random constant particles,
- decorative neural lightning,
- unrelated glow pulses,
- autoplay camera spins,
- heavy parallax on every panel,
- cinematic transitions that delay the user's action.

## Timing

Favor fast, physical motion:

- micro interactions roughly 120–220 ms,
- panel / layout transitions roughly 220–420 ms,
- camera focus transitions roughly 450–800 ms when necessary.

Use spring/easing curves that feel physical rather than theatrical.

Respect `prefers-reduced-motion`.

## 3D audience visualization

The aggregate 10,000-viewer simulation may be shown as a subtle particle field / constellation.

Rules:

- each particle must correspond to a sampled viewer or aggregated bucket,
- dropout motion must correspond to survival state,
- do not render 10,000 expensive individual meshes if instancing / aggregation is visually equivalent,
- use GPU instancing where appropriate,
- no decorative particles unrelated to the simulation.

## Simulate Patch interaction

After the user selects an intervention:

Button:

> **Simulate patch**

The counterfactual should not pretend to literally edit the video unless NEURASCOPE actually does so.

Instead:

- modify the relevant feature assumptions / timeline event,
- rerun CORTEX,
- overlay a second predicted-retention path,
- display model delta,
- explain which state changed.

Example:

```text
ORIGINAL        47% @ 15s
COUNTERFACTUAL  60% @ 15s
DELTA           +13 pts
```

Use a toggle / scrub to compare.

Always label the second curve:

> `Counterfactual prediction`

---

# 22. Build Program — One-Prompt, ~10-Hour, Startup-Quality Build

This repository is intended for a **single long autonomous build run**.

The coding agent owns the implementation outcome.

Do not stop after scaffolding, planning, wireframes, TODOs, or a partially connected frontend.

## Priority hierarchy

When tradeoffs occur, obey this order:

1. **Scientific integrity and provenance**
2. **Working end-to-end analysis loop**
3. **Oriane integration depth**
4. **Premium 3D/UI quality**
5. **Demo reliability**
6. **Breadth / extra features**

Never sacrifice 1–5 to add feature breadth.

## Recommended application stack

Prefer a coherent TypeScript web stack unless a scientific dependency materially requires Python:

- Next.js 16 / React 19
- TypeScript
- Tailwind CSS
- React Three Fiber
- Drei
- Three.js
- `@react-three/postprocessing`
- Zustand or equivalent minimal state store
- Motion / Framer Motion for UI transitions
- custom SVG / D3-style timeline rendering where needed
- Web Worker for Monte Carlo simulation if main-thread work risks jank
- Playwright for browser-level verification

Optional:

- Python scripts for preprocessing empirical priors or research datasets
- `three-mesh-bvh` for brain picking
- GPU instancing for audience particles

Do not introduce a heavyweight backend architecture unless needed.

## DeepGaze rule

DeepGaze III is a scientific reference and optional implementation component.

Do **not** burn the build budget attempting to deploy a heavyweight gaze model if it threatens the core flow.

If runtime integration is practical, use it.

Otherwise implement the gaze-proxy abstraction cleanly and ground it in literature / available video features.

## Non-negotiable vertical slice

1. Input one real short-form video.
2. Use real Oriane output wherever supported.
3. Build a synchronized temporal video ontology.
4. CORTEX produces timestep-level scientific state.
5. Predicted neural / EEG-derived proxy variables update over time.
6. Sample a real synthetic audience distribution.
7. Generate predicted retention from viewer survival.
8. Render the real 3D brain and drive it from CORTEX.
9. Render synthetic viewer cohorts and/or aggregate particle audience from the same state.
10. Detect at least one Attention Fracture from the actual simulation.
11. Fracture inspection exposes behavior, neural proxy, video evidence, affected regimes, and scientific provenance.
12. LLM analyst explains the structured state and proposes an intervention.
13. `Simulate Patch` reruns a counterfactual and changes the predicted curve.
14. Evidence drawer links the state to the scientific evidence stack.
15. The full flow is browser-tested and visually inspected.

## Build phases

### Phase 1 — Research + architecture reconstruction

Before coding deeply:

- read this entire spec,
- inspect the actual Oriane API surface,
- inspect the referenced scientific sources,
- inspect useful open-source brain / R3F references,
- establish the internal typed ontology,
- document any unavoidable Tier D heuristics.

Do not spend hours writing a new planning document.

Move into implementation.

### Phase 2 — Data / CORTEX spine

Implement the data path before visual polish:

`input → Oriane adapter → temporal ontology → CORTEX → viewer ensemble → retention → fractures`

Create deterministic fixtures/tests for the simulation.

### Phase 3 — Premium analysis workspace

Build the final screen, not a disposable prototype.

The brain, timeline, video, cohorts, and evidence inspector should be connected to real state immediately.

### Phase 4 — Analyst + counterfactual

Wire the LLM only after structured state exists.

The LLM may:

- summarize,
- diagnose,
- explain evidence,
- propose interventions.

The LLM may **not** fabricate the core attention/retention numbers.

### Phase 5 — QA / polish loop

Repeatedly:

- run app,
- open in browser,
- analyze the demo video,
- inspect visual state,
- inspect console,
- test scrub synchronization,
- test brain interactions,
- test fracture selection,
- test Evidence drawer,
- test counterfactual,
- fix,
- rerun.

Do not declare completion without visual/browser verification.

## Performance / reliability gates

- video playback and timeline remain synchronized,
- 3D brain interaction remains responsive,
- main-thread simulation does not visibly freeze the UI,
- no NaN / undefined / placeholder scientific values,
- all model outputs are deterministic for the same seed/input,
- all citations resolve to real sources,
- no fake Oriane result is labeled as real Oriane data,
- no broken controls visible in the demo,
- no layout clipping at common Mac laptop widths.

## Demo resilience

Prepare one **canonical demo analysis**.

After successfully analyzing it using the real pipeline:

- cache the analysis result locally or in the app,
- preserve its provenance,
- clearly allow replay as a cached prior analysis.

This is not fake data; it is a reliability measure.

If a live external API fails during judging, the team should be able to open the previously completed, real analysis and demonstrate every downstream interaction.

Never hard-code a fictional “successful” result and present it as a live analysis.

---

# 23. Loading Sequence

Keep the loading sequence short and cinematic.

Possible copy:

```text
Acquiring visual stream
Aligning semantic timeline
Indexing video events
Initializing CORTEX
Sampling synthetic audience
Retrieving corpus evidence
```

Then:

> **10,000 synthetic viewers initialized**

---

# 24. Hackathon Demo Narrative

Open NEURASCOPE.

Say:

> “Right now, creators test videos on humans by publishing them.”

Drop in the video.

> “We think that's backwards.”

Click **Analyze**.

CORTEX brain initializes.

Synthetic audience appears.

Video plays.

At ~11 seconds:

> **ATTENTION FRACTURE · 11.34s**

A visible wave of synthetic viewers disengages.

Brain changes.

Say:

> “NEURASCOPE uses Oriane to understand what happens throughout the video, then models attention through CORTEX and runs a synthetic audience over that timeline.”

Click fracture.

Show:

- why
- who
- brain-network representation
- corpus evidence

Then intervention.

Click:

> **SIMULATE PATCH**

Show before / after.

Final pitch line:

> **“Software has unit tests. Products have simulations. Movies have test audiences. NEURASCOPE is the test environment for video.”**

---

# 25. Customer Discovery During the Hackathon

Talk to creators and agency people in the room.

Do not over-pitch.

Ask:

> “When you're editing a short-form video, how do you decide it's ready to publish?”

Then:

> “When a video underperforms, what usually tells you why?”

Then:

> “Do you have any way to test retention before publishing?”

Then show NEURASCOPE.

Watch what they click and what they ask.

The strongest validation would be:

> several creators ran their own drafts through NEURASCOPE and changed an edit because of what they saw

Do not fabricate validation.

Earn it.

---

# 26. What Not to Build Tomorrow

Do not waste time on:

- billing
- authentication polish
- team management
- publishing integrations
- creator discovery
- campaign management
- generic analytics dashboards
- full video editing
- mobile app
- SDK documentation
- fifty audience cohorts
- twenty neuroscience models
- huge landing page
- unnecessary settings

Optimize only for:

### Utility
Does the user want this?

### Magic
Does the demo create a memorable moment?

### Oriane depth
Is Oriane indispensable to the product?

---

# 27. Product Expansion

## Wedge

Short-form pre-flight testing.

## Expansion

- creator optimization
- agency creative QA
- performance advertising
- UGC campaign evaluation
- brand social testing
- video-generation evaluation
- generative ad optimization
- creative ranking infrastructure

Long-term thesis:

> **NEURASCOPE becomes the evaluation layer between video generation and distribution.**

---

# 28. Final Product Statement

> **NEURASCOPE is a pre-flight testing system for short-form video. Before a creator, agency, or brand publishes, NEURASCOPE uses Oriane to understand what happens throughout the video, then runs that temporal model through CORTEX—a neuroscience-informed computational attention engine—and thousands of synthetic viewers.**
>
> **As the video plays, an interactive 3D brain visualizes modeled functional engagement while 3D synthetic audience cohorts react in real time. NEURASCOPE detects attention fractures, identifies which viewer types are most affected, grounds its diagnosis in comparable video evidence from Oriane, and uses an AI analyst to recommend specific edits. Teams can then simulate those interventions before putting the content in front of a real audience.**
>
> **The initial product answers one question: _where will this video lose people, and what should I change before I publish it?_**
>
> **Long term, NEURASCOPE becomes the evaluation layer between video creation and distribution—giving human creators and generative-video systems a computational test audience before real attention or media budget is spent.**

---

# 29. Brand

## NEURASCOPE

**Synthetic Attention Laboratory**

Primary tagline:

> **Test on synthetic attention before you spend real attention.**

Alternate pitch line:

> **Pre-flight testing for short-form video.**

Internal model:

> **CORTEX**

Core primitives:

- CORTEX
- Synthetic Audience
- Attention Fracture
- Corpus Evidence
- Intervention
- Counterfactual Simulation

---


# 30A. Judge Stress Test

## Amal Jeljeli / brand-agency lens

Question:

> **Would a brand or agency pay for this?**

Commercial wedge:

> A creative team wants to know whether a short-form asset contains likely attention failure points **before** publishing or spending distribution budget.

The brain is the signature interface.

The workflow is the business.

## Abdulrahman Aldhalaan / product lens

Question:

> **Is this a working product or a hackathon animation?**

The answer must be visible in real video input, real Oriane data, a real simulation, deterministic provenance, repeatable output, clean interaction, and a working counterfactual.

One finished vertical slice beats five half-built pages.

## Thibaut Hadjean / Oriane-technical lens

Question:

> **How deeply did this push the video-intelligence layer?**

Oriane must be indispensable in two directions:

### Perception

```text
Oriane
→ scene / speech / object / product / person / semantic event
→ CORTEX
```

### Evidence retrieval

```text
CORTEX fracture
→ Oriane comparable-video search
→ corpus evidence
→ analyst / intervention
```

If Oriane is used only to obtain a transcript, the integration is too thin.

---

# 30B. Core Technical Challenges and Answers

## “Is the synthetic brain fake?”

Every displayed state must be one of:

1. directly extracted video evidence,
2. sampled empirical prior,
3. literature-backed model variable,
4. derived prediction.

Nothing important should be random decoration.

## “Why isn't this just GPT analyzing a video?”

LLM:

> explains the state.

CORTEX:

> generates the state.

Oriane:

> observes the video and retrieves evidence.

## “How does the EEG work?”

The visible EEG is a **synthetic visualization of predicted EEG-derived features**, whose band-power / ISC state is controlled by CORTEX and tied to studies in the Evidence Graph.

## “How do you know it works?”

The product argument is evidence-chain based:

1. published naturalistic-media studies establish measurable relationships among attention, neural reliability, gaze, engagement, and video-viewing behavior;
2. BBBD provides multimodal participant-level distributions during attentive/distracted video viewing;
3. CORTEX operationalizes these relationships into a transparent simulator;
4. Oriane gives the simulator structured knowledge of the current video;
5. post-publication retention data becomes the future calibration loop.

If possible during the hack, obtain a creator video with an existing retention curve and perform a blinded comparison between NEURASCOPE's predicted fracture and the real curve.

---

# 30C. Scientific UI Requirements

At any fracture, show a compact evidence-backed state such as:

```text
ATTENTION FRACTURE · 11.34 s

Behavior
Predicted hazard          +0.23

CORTEX
Neural reliability proxy  ↓
Visual novelty            ↓
Processing load           ↑
Gaze concentration        ↓

Evidence
Static shot               3.1 s
Spoken words              21
Semantic progression      low

Research basis
Ki et al. 2016
BBBD 2026
LC4MP
DeepGaze III
```

The judge should be able to click any research-basis item and see:

- study title,
- what was measured,
- what finding is being used,
- how NEURASCOPE maps that finding into the model,
- limitation / scope.

Scientific citations are part of the interface, not bibliography decoration.

---

# 30D. Build Rule

> **Every impressive pixel must trace backward to data and forward to a decision.**

Examples:

3D brain highlight  
→ CORTEX state  
→ evidence source  
→ fracture diagnosis

Audience particle dropout  
→ viewer survival state  
→ predicted retention

Synthetic EEG change  
→ neural-proxy variable  
→ literature mapping

Intervention  
→ changed video-state assumption  
→ counterfactual rerun

That is what makes NEURASCOPE feel like a real company rather than hackathon theater.

---


# 30E. Autonomous Agent Completion Contract

The build agent is authorized to make implementation decisions autonomously.

It may:

- inspect additional GitHub repositories,
- choose appropriate open-source packages,
- use or adapt openly licensed 3D assets,
- choose internal data structures,
- restructure code,
- create scripts and tests,
- research implementation details,
- use browser automation for QA.

It must preserve the product and scientific invariants in this spec.

## Definition of done

Do **not** declare the build done until all of these are true:

### Product
- [ ] A user can input a real video.
- [ ] A full analysis completes.
- [ ] At least one real fracture can be inspected.
- [ ] A counterfactual simulation works.
- [ ] Evidence is inspectable.

### Science
- [ ] Every quantitative metric has provenance.
- [ ] Tier D assumptions are explicitly labeled internally and in Evidence when surfaced.
- [ ] Synthetic EEG is driven by CORTEX envelopes.
- [ ] Retention is generated from the viewer simulation.
- [ ] No random decorative signal is presented as scientific output.

### Oriane
- [ ] Actual provided Oriane capability has been inspected.
- [ ] Real Oriane fields are used where available.
- [ ] Unsupported endpoints/capabilities are not invented.
- [ ] Oriane-derived data is distinguishable from local/model-derived data.

### 3D / UI
- [ ] The central brain is anatomically credible and premium.
- [ ] Brain state is synchronized with playback.
- [ ] Synthetic viewer graphics are genuinely 3D/dynamic or a deliberate high-quality aggregate representation.
- [ ] The UI does not resemble a generic card dashboard.
- [ ] No purple-neon/cyberpunk default styling.
- [ ] Glass is reserved for controls/navigation.
- [ ] Timeline, video, brain, and audience respond to the same playhead.
- [ ] Fracture selection creates a coherent spatial response.
- [ ] The interface has been visually inspected in-browser.

### Reliability
- [ ] No visible console-breaking errors.
- [ ] Primary flow survives refresh.
- [ ] Canonical demo result can be replayed from a previously completed real analysis.
- [ ] App builds successfully for production.

---

# 31. Build Principle

> **The backend can look like a neuroscience paper. The frontend should be understandable in five seconds.**

And:

> **The system should feel like an instrument, not a dashboard.**
