# NEURASCOPE

**Synthetic Attention Laboratory** — pre-flight testing of short-form video on a seeded synthetic audience.

NEURASCOPE takes a short-form video (published TikTok/Instagram URL via Oriane, a local file, or a development fixture), simulates 10,000 synthetic viewers with a deterministic attention/hazard model (CORTEX), locates attention fractures, names their drivers, and reruns counterfactual edits. Every displayed value carries an evidence tier. It does not measure EEG, emotion, or brain activation.

## Pipeline

```
INPUT      InputScreen.tsx                    URL | local file | development fixture
UNDERSTAND src/lib/oriane/*, media/extract.ts VideoOntology (src/lib/ontology.ts)
SIMULATE   src/lib/cortex/features.ts         10 Hz features → drivers
           src/lib/cortex/population.ts       10,000 seeded viewers, 4 cohorts
           src/lib/cortex/simulate.ts         attention → hazard → survival → retention
FRACTURE   src/lib/cortex/fractures.ts        hazard excess over rolling baseline + driver attribution
DIAGNOSE   Inspector.tsx, src/lib/analyst     deterministic analyst (+ optional LLM phrasing)
INTERVENE  src/lib/cortex/interventions.ts    feature edits → counterfactual rerun (index.ts)
PROXIES    src/lib/cortex/eeg.ts, networks.ts synthetic EEG proxy, network demand
```

CORTEX runs in a Web Worker (`cortex.worker.ts`, `client.ts`); orchestration in `src/lib/state/pipeline.ts`.

## File map

| Path | Contents |
|---|---|
| `src/app/page.tsx`, `src/components/Lab.tsx` | Entry; restores last run |
| `src/components/` | `InputScreen`, `LoadingScreen`, `Workspace`, `VideoPane`, `Timeline`, `Metrics`, `CohortRail`, `Inspector`, `EvidenceDrawer`, `AskBar`, `NetworkLegend`, `Tier`, `useKeyboard` |
| `src/components/brain/` | `BrainCanvas` (React Three Fiber; CORTEX / NETWORKS / NEURAL modes), `AudienceField`, brain mesh loader/material |
| `src/lib/cortex/` | Model: `params`, `features`, `population`, `simulate`, `fractures`, `interventions`, `networks`, `eeg`, `rng`, `index` |
| `src/lib/oriane/` | Oriane client, adapter (`resolveLive`, `resolveFixture`), URL parser, normalizer, comparables, dev fixture |
| `src/lib/media/extract.ts` | In-browser frame difference, luminance, spatial entropy, audio RMS, cuts |
| `src/lib/evidence/` | `sources.ts` (citations), `provenance.ts` (tiers) |
| `src/lib/state/` | Zustand store, pipeline, persistence (localStorage + IndexedDB) |
| `src/lib/server/rateLimit.ts` | Per-IP token bucket, bounded TTL cache |
| `src/app/api/` | `status`, `analyst`, `oriane/resolve`, `oriane/comparables`, `oriane/fixture` |
| `scripts/build-brain.mjs` | Builds `public/models/cortex.bin` from Desikan–Killiany meshes |
| `docs/oriane/openapi.snapshot.json` | Oriane API snapshot the client is written against |

## Perception modes

Every run is badged with its `PerceptionSource`:

| Source | From | Provides |
|---|---|---|
| `oriane-live` | `POST /api/oriane/resolve` with a TikTok/Instagram URL (needs `ORIANE_API_KEY`) | Transcript chunks, keyframes, caption, hashtags, creator, aggregate metrics. Not indexed ⇒ `NOT_INDEXED` error; never falls back to the fixture. |
| `dev-fixture` | `GET /api/oriane/fixture` | Hand-authored record in Oriane wire shape. **Not Oriane output.** Transcript only; metrics zeroed. |
| `local-only` | Uploaded file | Measured visual/audio signals; no transcript (Oriane has no upload endpoint). |

A local file can be combined with a URL or the fixture to add measured signals. Missing modalities are listed as "Unavailable" and held at neutral priors. No live Oriane key has been tested yet.

## Quick start

Node 24, pnpm.

```
pnpm install
pnpm dev          # http://localhost:3000
```

Runs fully without any keys: **Run on development fixture**, or upload an MP4.

Environment (`.env.local`; see `.env.example`):

| Variable | Used in | Default |
|---|---|---|
| `ORIANE_API_KEY` | `src/lib/oriane/client.ts`, resolve/comparables/status routes | unset ⇒ Oriane disabled |
| `ORIANE_BASE_URL` | `client.ts` | `https://connect.oriane.xyz` |
| `ORIANE_AUTH_HEADER` | `client.ts` | `Authorization` (sent as `Bearer <key>`; any other header gets the raw key) |
| `ANTHROPIC_API_KEY` | `/api/analyst` (preferred) | unset |
| `ANTHROPIC_MODEL` | `/api/analyst` | `claude-sonnet-4-5` |
| `OPENAI_API_KEY` | `/api/analyst` (fallback) | unset |
| `OPENAI_MODEL` | `/api/analyst` | `gpt-4.1` |

Without an LLM key `/api/analyst` returns 501 and the deterministic analyst answers.

## Scripts

| Command | Runs |
|---|---|
| `pnpm dev` / `build` / `start` | `next dev` / `next build` / `next start` |
| `pnpm lint` | `eslint .` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | `vitest run` (CORTEX, rate limit) |
| `pnpm e2e` | `playwright test` (`e2e/canonical.spec.ts`, installed Chrome channel) |
| `pnpm assets:brain` | `node scripts/build-brain.mjs` |

Verification:

```
npx tsc --noEmit && npx eslint . && npx vitest run && npx next build && npx playwright test
```

## Provenance

Tiers (`src/lib/evidence/provenance.ts`): **A** empirical, **B** literature, **C** derived / model-derived, **D** heuristic. Tier chips open the Evidence drawer on the cited sources (`src/lib/evidence/sources.ts`).

- All displayed CORTEX outputs — attention, survival/retention, hazard, neural-reliability proxy, network state, EEG proxy, cohort outputs, counterfactual deltas — are Tier C, even where literature calibrates them.
- Model structure, coefficients, cohorts and thresholds are Tier D (`neurascopeHeuristics`).
- BBBD 2026 contributes published effect directions only; participant-level recordings are not ingested. Madsen 2021 contributes gaze-ISC summary statistics.
- The EEG lane is a synthetic proxy; brain colouring is computational demand on atlas parcels, not measured or predicted activation.

Formulas and constants: [docs/SCIENCE_LEDGER.md](docs/SCIENCE_LEDGER.md).

## Rate limiting

`/api/oriane/resolve`, `/api/oriane/comparables` and `/api/analyst` apply an in-memory per-IP token bucket (`src/lib/server/rateLimit.ts`, keyed on `x-forwarded-for` / `x-real-ip`, max 5,000 keys) only when the corresponding provider key is configured. Exhaustion returns `429` with `Retry-After` and `{ error: { code: "RATE_LIMITED" } }`.

| Route | Burst | Refill / min |
|---|---|---|
| `/api/oriane/resolve` | 10 | 6 |
| `/api/oriane/comparables` | 6 | 4 |
| `/api/analyst` | 8 | 6 |

Comparables responses are cached (200 entries, 30 min TTL). Limits are per process; they are not shared across instances.

## Docs

- [docs/SCIENCE_LEDGER.md](docs/SCIENCE_LEDGER.md) — implemented formulas, tiers, heuristics, limitations
- [docs/DEMO.md](docs/DEMO.md) — 3-minute judge demo and fallbacks
- [docs/JUDGE_QA.md](docs/JUDGE_QA.md) — short answers to likely questions
- [docs/BUILD_ORDER.md](docs/BUILD_ORDER.md), [NEURASCOPE_PRODUCT_SPEC.md](NEURASCOPE_PRODUCT_SPEC.md) — canonical spec
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) — third-party assets and licenses
