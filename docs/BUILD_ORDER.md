# NEURASCOPE — FOUNDING BUILD ORDER

You are the **founding engineer, research engineer, computational-science lead, product designer, interaction designer, and QA owner** for NEURASCOPE.

You are operating autonomously inside **Devin Cloud on a macOS host** against this GitHub repository.

This is a **one-prompt build**.

Do not treat this as a request for a prototype, mockup, scaffold, design exercise, research memo, or partial implementation. Your mandate is to take ownership of the repository and produce the strongest functioning, scientifically defensible, visually exceptional, demo-ready implementation of NEURASCOPE possible.

The file:

`NEURASCOPE_PRODUCT_SPEC.md`

is the **canonical product constitution**.

Read it completely before making major architectural decisions.

Do not skim it.

Reconstruct the entire intended product from it.

The specification contains product strategy, scientific architecture, CORTEX, Oriane integration philosophy, synthetic-audience methodology, evidence provenance, EEG proxy requirements, 3D requirements, interaction design, hackathon strategy, judge stress tests, build priorities, scientific sources, and completion criteria.

This prompt establishes **how you must execute** that specification.

If an implementation choice is not explicitly specified, make the decision yourself using strong engineering, scientific, product, and visual judgment.

Do not ask the user to make ordinary implementation decisions for you.

Do not stop because something is difficult.

Research it, instrument it, simplify it defensibly if necessary, and continue.

---

# 0. MISSION

Build:

# **NEURASCOPE**

### **Synthetic Attention Laboratory**

Primary tagline:

> **Test on synthetic attention before you spend real attention.**

Product-facing explanation:

> **Pre-flight testing for short-form video.**

The initial product answers:

> **Where will this video lose people, why, and what should I change before I publish it?**

The system should let a creator, performance creative strategist, editor, agency, or brand take a short-form video and run it through a **research-backed synthetic attention laboratory before exposing the asset to a real audience or media budget**.

The key product loop is:

**INPUT → UNDERSTAND → SIMULATE → FRACTURE → DIAGNOSE → INTERVENE → RE-SIMULATE**

The product should feel as if someone built:

> **a high-end scientific instrument for short-form creative testing**

rather than:

> another AI analytics dashboard.

The internal scientific engine is:

# **CORTEX**

CORTEX is not an LLM prompt.

CORTEX is a computational attention model.

Oriane provides video intelligence.

CORTEX computes modeled attention state.

A synthetic audience samples that model.

An LLM explains structured results and proposes interventions.

The user then runs counterfactual simulations.

Keep these responsibilities architecturally distinct.

---

# 1. FIRST ACTION: RECONSTRUCT THE UNIVERSE

Before committing to architecture:

1. Read `NEURASCOPE_PRODUCT_SPEC.md` completely.
2. Audit the existing repository.
3. Identify existing code, dependencies, assets, environment variables, API clients, build configuration, and deployment configuration.
4. Inspect the actual Oriane documentation/API surface available in the environment or repository.
5. Inspect the primary scientific references in the spec where needed to accurately implement model relationships.
6. Inspect useful open-source 3D brain/R3F implementations referenced in the spec and any superior implementations you discover.
7. Verify licenses before incorporating third-party assets or code.
8. Understand the three judge lenses described in the specification.
9. Understand the complete intended demo sequence.
10. Only then lock the architecture.

Do not spend the build producing a giant planning document.

Think rigorously, write only the supporting documentation that materially improves implementation, then build.

You are expected to **boil the universe internally**:

- product
- user
- business
- neuroscience
- psychophysiology
- video intelligence
- synthetic population modeling
- visual saliency
- survival analysis
- Three.js
- rendering
- interaction
- performance
- API resilience
- scientific claims
- provenance
- hackathon judging
- demo reliability
- licensing
- deployment
- browser QA

Then reduce that complexity into an interface a creator can understand within seconds.

---

# 2. PRIORITY ORDER — NON-NEGOTIABLE

When tradeoffs occur, use this priority order:

1. **Scientific integrity**
2. **Working end-to-end flow**
3. **Real Oriane integration**
4. **Correct synchronization of all modeled state**
5. **Premium 3D/UI quality**
6. **Demo reliability**
7. **Counterfactual usefulness**
8. **Extra feature breadth**

Do not sacrifice items 1–6 to add more screens or features.

If necessary, ship fewer concepts with dramatically higher integrity.

---

# 3. IMMUTABLE PRODUCT INVARIANTS

You may change implementation details.

You may not remove, reinterpret, or trivialize these product invariants.

## 3.1 CORTEX must be computational

Do not replace:

`video → CORTEX → simulation`

with:

`video → LLM → engagement score`.

The LLM is an analyst.

It does not generate the core scientific numbers.

## 3.2 Oriane must be structurally important

Oriane is not just a transcript endpoint.

Use the actual API as deeply as the hackathon surface allows.

Potential roles include:

- transcript,
- speech,
- scenes,
- frames,
- visual concepts,
- products,
- objects,
- people,
- context,
- metrics,
- creator context,
- semantic events,
- semantic retrieval,
- comparable videos.

Inspect the real API before assuming any of these exist.

Never invent an endpoint.

Never fabricate Oriane results.

If a capability does not exist, preserve the architecture and visibly degrade rather than faking it.

## 3.3 Synthetic audience must be an actual simulation

“10,000 synthetic viewers” cannot be marketing text attached to four static personas.

Sample a real ensemble of parameterized computational viewers.

The audience must generate:

- individual or bucketed state,
- disengagement hazard,
- survival,
- aggregate predicted retention,
- cohort differences,
- fracture sensitivity.

Use deterministic seeded randomness.

Same input + same seed should reproduce the same result.

## 3.4 Retention must emerge from the simulation

Do not manually draw a retention curve.

Use a survival/hazard formulation or a scientifically coherent equivalent.

The curve displayed to the user must be produced from the same synthetic population driving the rest of the UI.

## 3.5 Synthetic EEG must be scientifically driven

No random squiggle.

No fake medical visualization.

CORTEX should produce research-informed EEG-derived proxy variables such as modeled band-power envelopes and neural-reliability/ISC proxy state where defensible.

If a visible waveform is synthesized, its amplitude envelopes must derive from CORTEX.

Label it accurately:

**Predicted EEG Signature**

or:

**Synthetic EEG Proxy**

Do not label it measured EEG.

## 3.6 Scientific provenance is part of the product

Every important quantitative output must know where it came from.

Use the provenance system described in the MD:

- empirical,
- literature-calibrated,
- model-derived,
- heuristic.

Heuristics are allowed when necessary for a hackathon implementation.

They must be isolated and labeled.

Do not hide them behind citations.

## 3.7 The 3D brain is a core interaction primitive

It is not optional decoration.

It must be:

- genuinely 3D,
- anatomically credible,
- interactive,
- premium,
- synchronized with playback,
- driven by actual CORTEX state,
- able to expose functional/network interpretation,
- connected to Evidence.

## 3.8 Synthetic review groups are core

The product-facing regimes:

- Cold Scroller
- Intent Viewer
- Visual-First Viewer
- Category Enthusiast

should exist as elegant representations of underlying parameter regimes.

These are not fake demographic neurotypes.

They are product-language abstractions over computational viewer distributions.

The representations should be **visually sophisticated and dynamic**, preferably 3D neural/head/bust objects or an equally premium spatial representation.

Do not turn them into four generic profile cards.

## 3.9 Attention Fracture is a first-class object

A fracture is not a red dot on a chart.

It connects:

**timestamp  
→ video evidence  
→ CORTEX state  
→ neural proxy  
→ affected viewers  
→ hazard change  
→ scientific provenance  
→ diagnosis  
→ intervention  
→ counterfactual**

This ontology is one of the key reasons the system feels like decision intelligence rather than analytics.

## 3.10 Counterfactual simulation must actually rerun something

`Simulate Patch` cannot just animate a better curve.

It must alter relevant modeled feature assumptions/event timing and rerun CORTEX.

Label output as:

**Counterfactual prediction**

not guaranteed uplift.

---

# 4. SCIENCE: BE EXTREMELY SERIOUS

NEURASCOPE is allowed to be ambitious.

It is not allowed to be pseudo-scientific.

The scientific layer should be sufficiently rigorous that a technically sophisticated judge can challenge the system and find a coherent answer.

Use the scientific stack in the MD.

At minimum, understand and correctly represent the roles of:

- BBBD / Madsen, Kuppa & Parra
- Ki, Kelly & Parra
- Poulsen et al.
- Dmochowski et al.
- LC4MP
- DeepGaze III
- relevant gaze/pupil synchrony work
- naturalistic media / neural reliability literature

Do not blindly paste paper conclusions into code.

For every mapping ask:

> What was actually measured?

> In what population?

> Under what experimental conditions?

> What relationship was established?

> What exactly can NEURASCOPE infer from that?

> Which part remains our model?

The app should expose this distinction elegantly through the Evidence system.

Do not put giant disclaimers all over the main experience.

Make the main product confident and clear.

Put methodological precision one interaction away.

---

# 5. SCIENTIFIC PROVENANCE MODEL

Implement explicit provenance.

A useful internal representation may resemble:

```ts
type EvidenceTier =
  | "empirical"
  | "literature"
  | "derived"
  | "heuristic";

type ProvenancedValue = {
  value: number;
  tier: EvidenceTier;
  sources: string[];
  method: string;
  confidence?: number;
};
```

Every major model variable should carry enough metadata that the Evidence UI can answer:

> Why is this number here?

Examples:

**Predicted ISC proxy**

- Literature calibrated
- Ki et al.
- transformed from current modeled attention state

**Viewer attention prior**

- empirical
- derived from BBBD attentive/distraction distributions

**Disengagement hazard**

- derived
- generated by CORTEX from current viewer state

**Payoff-distance multiplier**

- heuristic
- temporary prototype assumption
- documented

Do not falsely upgrade a heuristic into “scientifically validated” by attaching a paper next to it.

---

# 6. CORTEX — IMPLEMENTATION PHILOSOPHY

CORTEX should maintain time-dependent state.

Do not reduce the video to one vector and one score.

Use a temporal representation.

Conceptually:

```text
VIDEO
  ↓
Oriane temporal ontology
  ↓
feature construction
  ↓
CORTEX state through time
  ↓
viewer-conditioned state
  ↓
hazard/survival
  ↓
fractures
```

The MD contains the core variables.

Use them thoughtfully.

Potential state:

- visual novelty,
- semantic novelty,
- salience,
- information gain,
- processing load,
- visual change,
- audio change,
- narrative progression,
- payoff distance,
- relevance,
- gaze concentration proxy,
- neural-reliability proxy,
- fatigue/habituation.

Do not create twenty variables simply to sound scientific.

Prefer a smaller coherent system whose relationships can be explained.

---

# 7. EMPIRICAL SYNTHETIC VIEWERS

Do not arbitrarily choose:

```text
cold_scroller.novelty = 1.42
```

unless the number is explicitly marked heuristic.

Where possible:

- derive variability from empirical distributions,
- use literature-supported directions,
- condition by audience context,
- then sample individual variation.

The computational meaning should be approximately:

```text
viewer_i =
empirical prior
+ literature-informed parameterization
+ audience context
+ sampled individual variation
```

Product-facing cohort names can sit on top of that.

The cohort UX should remain understandable.

The scientific implementation underneath should remain defensible.

---

# 8. ORIANE INTEGRATION RULES

Inspect the real API surface.

Create one clean typed adapter.

Downstream CORTEX code should depend on your internal ontology, not raw Oriane responses.

Potential shape:

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

Normalize timestamps carefully.

All downstream temporal analysis depends on alignment quality.

## If semantic search/comparables are available

Use them.

This creates the second Oriane loop:

```text
CORTEX fracture
→ Oriane retrieval
→ comparable content
→ corpus evidence
→ diagnosis
```

## If comparables are not available

Do not fake them.

Evidence Mode can still show:

- Oriane-observed events,
- transcript,
- frames,
- entities,
- timing,
- metrics,
- scientific evidence.

The architecture should make corpus retrieval easy to add later.

---

# 9. LLM ROLE

The language model should operate over structured data.

Give it:

- temporal ontology,
- CORTEX values,
- fractures,
- viewer regime outcomes,
- Oriane evidence,
- scientific source metadata.

Use it for:

- explanation,
- causal hypothesis generation,
- semantic event structure,
- narrative progression interpretation,
- edit recommendation,
- evidence-grounded question answering.

Do not let it create the primary quantitative model.

The architecture should make this distinction visible in code.

---

# 10. UI: DO NOT BUILD A NORMAL HACKATHON DASHBOARD

This matters enormously.

A functioning backend attached to a generic dashboard is **not done**.

The interface should feel expensive.

Imagine:

> **Apple built a scientific creative-testing instrument with the restraint of Grok and the typographic discipline of Vercel.**

Not:

> “AI SaaS dashboard with purple glass cards.”

The visual quality bar is part of the product.

---

# 11. VISUAL DNA

## Overall

Near black.

Charcoal.

Off-white typography.

Cold neutral secondary text.

Hairline borders.

One restrained interactive accent.

Warm warning color only for meaningful fracture/risk states.

Scientific color appears when data requires it.

Do not decorate the application with color.

## Absolutely avoid

- purple-blue gradients
- “AI” auroras
- neon cyan
- Tron
- glowing HUD grids
- rainbow brain regions everywhere
- permanent bloom
- giant gradient CTA buttons
- card walls
- fake glass on every surface
- generic Shadcn dashboard appearance
- excessive pills
- giant left sidebar
- crypto-terminal styling
- “hacker” styling

## Glass

Treat glass as a functional floating control material.

Use it for:

- compact playback controls,
- mode selectors,
- command input,
- floating inspectors where appropriate.

Do not use it as the primary content surface.

## Typography

Prefer:

- Geist Sans
- Geist Mono

or an equivalent pairing if technically preferable.

Mono is appropriate for:

- timestamps,
- metric values,
- fracture IDs,
- evidence tiers,
- scientific readouts.

Typography and spatial composition should create hierarchy, not boxes.

---

# 12. EMPTY / INPUT STATE

The first screen should be nearly obvious without explanation.

Minimal top chrome.

Center:

# NEURASCOPE

small descriptor:

`Synthetic Attention Laboratory`

Primary affordance:

> Paste a TikTok / Reel / Short URL or upload video

One strong action:

> **Run simulation**

Optional:

Audience context.

Nothing else should compete.

A subtle premium 3D brain can exist in the visual field.

No giant feature marketing section.

No onboarding carousel.

No account-management junk.

The product should immediately invite analysis.

---

# 13. LOADING EXPERIENCE

When the analysis begins, collapse smoothly into the instrument workspace.

Use real pipeline progress where possible.

Possible sequence:

```text
Acquiring video intelligence
Aligning semantic timeline
Building CORTEX state
Sampling synthetic audience
Tracing evidence
```

Then:

> **10,000 synthetic viewers initialized**

Do not artificially delay completed steps.

Do not make fake “AI thinking” theater.

The visual transition should create anticipation without wasting time.

---

# 14. PRIMARY ANALYSIS WORKSPACE

This is the hero screen.

Spend disproportionate design effort here.

Desktop-first.

Optimize first for MacBook-class browser windows around:

- 1440×900
- 1512×982
- 1728×1117

The screen should feel like **one continuous instrument**.

Not three equal cards.

Suggested composition:

### Left ~34–38%

Source short-form video.

Portrait aspect ratio.

Minimal playback controls.

Transcript/event context available but restrained.

### Center/right ~42–48%

Large interactive 3D CORTEX brain.

This is visually dominant.

### Remaining rail / lower-right ~16–22%

Synthetic audience/cohort state and contextual inspector.

### Bottom ~18–22% of viewport height

One unified temporal analysis system.

---

# 15. THE BRAIN MUST LOOK EXCEPTIONAL

Do not invent a fake low-poly brain if a good anatomical model can be sourced legally.

Inspect:

- `StarKnightt/brain-explorer`
- `Rickaym/brain-game`
- `digin1/brain-threejs`
- other credible open implementations you discover

Use them as technique/reference sources, not as a license to copy blindly.

Verify asset/code licensing.

Track sources in:

`THIRD_PARTY_NOTICES.md`

Preferred rendering stack:

- React Three Fiber
- Drei
- Three.js
- postprocessing where justified
- BVH if useful

Visual target:

- anatomically plausible folds,
- neutral ivory / silver / soft translucent tissue,
- strong depth,
- subtle subsurface/translucent feeling,
- controlled studio/environment light,
- scientific restraint.

Functional activation should appear as selective overlays.

The base brain should not constantly glow.

Interaction:

- drag/orbit,
- bounded zoom,
- click network,
- hover preview when appropriate,
- smooth focus transitions,
- camera restore,
- synchronized video state.

No uncontrolled auto-spinning.

A subtle near-static idle movement is acceptable.

---

# 16. BRAIN MODES

Keep this compact.

Suggested:

### CORTEX

Clean model state.

### NETWORKS

Functional-network overlays.

### NEURAL

EEG/neural-reliability state and supporting scientific detail.

Do not add ten tabs.

---

# 17. FUNCTIONAL NETWORKS

Potential overlays:

- visual processing
- dorsal attention
- ventral attention/reorientation
- salience network
- auditory/language processing
- semantic/narrative integration

Reward/anticipation circuitry only if the scientific mapping supports what you display.

Never imply voxel-level precision.

Never label a region with a fake exact biological activation percentage.

Use language such as:

**Modeled salience-network demand**

**Predicted attentional reorientation**

**Processing-load proxy**

**Neural-reliability proxy**

---

# 18. SYNTHETIC REVIEW GROUP

The named regimes should feel like sophisticated computational entities.

Do not make illustrated personas.

Do not create human demographic stereotypes.

Prefer elegant:

- translucent neural heads,
- bust-like forms,
- mini brains,
- spatial nodes around the main CORTEX object,
- subtle dimensional representation.

Names:

- Cold Scroller
- Intent Viewer
- Visual-First
- Category Enthusiast

Visible information should be minimal.

For example:

```text
COLD SCROLLER
survival 0.61
hazard +0.18
```

Detailed parameter fingerprint appears on selection.

When selected:

- retention path updates,
- brain weighting changes,
- fracture impact changes,
- audience field filters.

---

# 19. 10,000-VIEWER POPULATION

Use a particle/point/instanced representation.

Every rendered particle should either:

- represent a viewer,
- or represent an explicitly defined bucket of viewers.

Do not generate unrelated decorative particles.

As the video plays:

- active viewer field persists,
- disengagement removes/dims viewers,
- fracture windows create observable dropout waves.

This should be visually beautiful but mathematically connected.

Use instancing / GPU-friendly techniques.

Do not render 10,000 individual high-poly heads.

---

# 20. UNIFIED TIMELINE

Do not scatter five charts around the interface.

Build one master temporal instrument with a shared x-axis.

Possible layers:

```text
VIDEO EVENTS
hook | cut | face | claim | product | payoff

PREDICTED RETENTION
━━━━━━━━━━━━━━━━━━━━

DISENGAGEMENT HAZARD
          ▲ fracture

NEURAL PROXY
~~~~~~~ synthetic EEG / ISC

INTERVENTION
              ↳ counterfactual
```

The playhead is sacred.

Scrubbing must update:

- source video,
- transcript,
- semantic event,
- CORTEX state,
- brain,
- synthetic viewers,
- EEG proxy,
- evidence inspector.

This synchronization is a hard acceptance criterion.

---

# 21. ATTENTION FRACTURE — SIGNATURE INTERACTION

Fractures should be visually restrained until selected.

A fracture marker appears on the timeline.

No giant red alert modal.

On selection:

1. seek video to fracture,
2. expand local temporal region,
3. focus relevant CORTEX/network state,
4. visibly affect synthetic viewer representation,
5. open forensic analysis,
6. show evidence,
7. expose intervention.

Example inspector:

```text
ATTENTION FRACTURE
11.34–12.86 s

Predicted effect
hazard +0.23

Primary drivers
semantic progression  ↓
visual novelty        ↓
processing demand     ↑

Affected regime
Cold Scroll           78%
Visual-First          61%

Observed evidence
static visual state   3.1 s
spoken words          21
payoff                unresolved

Research basis
Ki et al. 2016
BBBD 2026
LC4MP
```

Typography and separators.

Not six colorful cards.

---

# 22. EVIDENCE MODE

This is mandatory.

Scientific papers cannot be hidden in README only.

The product itself must show why it believes what it believes.

An `Evidence` control should open an elegant research/provenance drawer.

Each source should expose:

- title,
- authors/year,
- experiment or dataset,
- measured variable,
- relevant finding,
- how NEURASCOPE uses it,
- limitation/scope.

Each surfaced model value may show:

- A empirical
- B literature
- C derived
- D heuristic

or equivalent human-readable labels.

Do not make the main UI academic.

Do make rigor inspectable.

---

# 23. SYNTHETIC EEG UX

The user can see a sophisticated EEG-like temporal signal.

It must be generated deterministically from CORTEX-predicted envelopes.

Do not use random line noise.

The UI should distinguish:

- waveform visualization,
- model band state,
- neural-reliability proxy.

For example:

```text
PREDICTED EEG SIGNATURE

alpha proxy   ↑
theta proxy   →
ISC proxy     ↓
```

When a fracture occurs, the EEG visualization and brain must change because the **same underlying CORTEX state changed**.

Not because separate animations were triggered.

---

# 24. ASK NEURASCOPE

Include a compact command layer.

Examples:

> Why does attention collapse here?

> Optimize for Cold Scrollers.

> Show the evidence.

> Preserve the narrative but improve retention.

> Which intervention has the highest modeled upside?

Avoid building a generic right-side chatbot.

Answers should attach to relevant objects/timestamps.

The interface remains an instrument with AI reasoning inside it.

Not a chatbot with charts attached.

---

# 25. INTERVENTIONS

Potential interventions include:

- cut a section,
- shorten exposition,
- move product reveal earlier,
- move payoff earlier,
- insert visual proof,
- increase semantic progression,
- replace static talking section,
- rewrite spoken sentence.

The recommendation must refer to the model's actual fracture drivers.

Avoid generic creator advice.

---

# 26. SIMULATE PATCH

This interaction should be magical.

Select intervention.

Click:

# **Simulate patch**

Modify the feature timeline appropriately.

Rerun CORTEX.

Overlay:

**ORIGINAL**

and

**COUNTERFACTUAL**

Example:

```text
Predicted survival @ 15 s

Original          47%
Counterfactual    60%

Model delta      +13 pts
```

Explain:

> Earlier product reveal reduces unresolved payoff distance during the primary fracture window.

Do not pretend the product physically edited the video unless you actually implemented editing.

---

# 27. MOTION LANGUAGE

Motion is causal.

Allowed:

- brain focus,
- network overlay transitions,
- playhead movement,
- viewer dropout,
- fracture expansion,
- evidence reveal,
- counterfactual line morph,
- subtle layout transitions.

Forbidden:

- decorative lightning,
- random neural pulses,
- useless particles,
- cinematic camera flythroughs,
- constant shimmer,
- slow animations that block use.

Target approximate motion character:

- micro: fast
- panel changes: controlled
- 3D camera: slightly slower and physical

Respect reduced-motion preferences.

---

# 28. PERFORMANCE

A beautiful brain running at 9 fps is not premium.

Continuously monitor:

- frame rate,
- main thread,
- bundle size where relevant,
- render loops,
- memory,
- Three.js object count,
- postprocessing cost.

Prefer:

- instancing,
- memoized geometry/material,
- adaptive DPR,
- constrained bloom,
- efficient picking,
- workers for large simulations.

Keep playback and brain synchronization responsive.

---

# 29. RECOMMENDED STACK

If the repository does not already strongly dictate another stack, prefer:

- Next.js 16
- React 19
- TypeScript
- Tailwind
- React Three Fiber
- Drei
- Three.js
- `@react-three/postprocessing`
- Zustand
- Motion / Framer Motion
- Web Worker for Monte Carlo if appropriate
- Playwright for browser QA

Scientific preprocessing may use Python if that is materially easier.

Do not create a distributed microservices architecture.

This is a hackathon product.

Prefer a coherent repository.

---

# 30. RESEARCH IMPLEMENTATION STRATEGY

Use public datasets/code intelligently.

Do not waste the build downloading hundreds of gigabytes to prove seriousness.

Use the smallest amount of raw scientific data needed to produce defensible priors.

Inspect:

- BBBD processing/reproduction code,
- ISC/CorrCA implementations where useful,
- DeepGaze references,
- brain/R3F repositories.

If a real scientific model is lightweight enough to use directly, use it.

If it is too heavy for the build, create a clean abstraction and use the strongest scientifically grounded approximation that preserves provenance.

Do not pretend an approximation is the original research model.

---

# 31. DEEPGAZE

DeepGaze is a scientific reference and potential component.

Do not derail the build trying to deploy a heavyweight ML inference path if the result jeopardizes the core experience.

If practical:

use it.

If not:

implement a clean gaze/saliency proxy abstraction informed by the literature and current video features.

Document the tier.

---

# 32. COMMERCIAL PRODUCT TEST

Remember the product is not a neuroscience toy.

The primary user is making a creative decision.

Every major screen should eventually answer one of:

> What is wrong?

> Where?

> For whom?

> Why?

> What evidence supports that?

> What can I change?

> Does the modeled outcome improve?

The brain provides explanation and magic.

The workflow provides value.

---

# 33. JUDGE STRESS TEST

Before completion, review the system from all three judge lenses.

## Brand / agency judge

Ask:

> Would a creative team pay for this workflow?

The demo must make the commercial use obvious.

## Product / startup judge

Ask:

> Is this a functioning repeatable product, or an elaborate animation?

The answer must be:

functioning product.

## Oriane technical judge

Ask:

> Why does this need Oriane?

The answer must be visible in architecture and interface.

---

# 34. RED-TEAM YOUR OWN SCIENCE

Before declaring done, attack the system as a skeptical neuroscientist.

Questions:

> Where did this variable come from?

> Is this paper actually supporting this direction?

> Are we confusing correlation with mechanism?

> Are we applying educational-video results to TikTok as if the populations were identical?

> Is this empirical or heuristic?

> Is the EEG actually driven by model state?

> Does the 3D brain imply more localization precision than the research supports?

> Is retention being produced computationally or aesthetically?

Repair problems you find.

Do not solve criticism by making the experience timid.

Solve it with provenance.

---

# 35. RED-TEAM YOUR OWN UI

Review it as an Apple/Grok/Vercel-level product designer.

Ask:

> Does this look like AI template UI?

> Is there unnecessary chrome?

> Are there too many cards?

> Is the brain really the hero?

> Are we using glass correctly?

> Is information hierarchy obvious?

> Does each animation communicate something?

> Does the UI feel spatial and expensive?

> Is anything purple simply because it is “AI”?

> Can a creator understand the product without understanding neuroscience?

Repair aggressively.

If the answer is “it looks like a hackathon dashboard,” it is not done.

---

# 36. RED-TEAM YOUR OWN PRODUCT

Review it as a YC founder.

Ask:

> What is the one painful job?

> Is the workflow immediate?

> Does this do one thing exceptionally well?

> Can somebody understand why they would use it again?

> Does Simulate Patch create an action loop?

> Are there features that should be deleted?

Delete distractions.

---

# 37. RED-TEAM YOUR OWN ENGINEERING

Review as a principal engineer.

Ask:

- deterministic?
- type safe?
- resilient?
- no fake async?
- no uncaught errors?
- no brittle timestamp math?
- no hydration errors?
- no runaway render loops?
- no enormous client payloads?
- no silent fallback pretending to be real data?
- no secret leakage?
- production build passes?

Repair.

---

# 38. REAL API FAILURE STRATEGY

External hackathon APIs can fail during demos.

Build resilience without cheating.

For the canonical demo:

1. run a real analysis using real available external data,
2. cache that completed analysis,
3. preserve the data's provenance,
4. allow it to be replayed later.

Clearly distinguish:

**Live analysis**

from

**Previously completed analysis**

if necessary.

A cached real analysis is acceptable.

A fictional hard-coded success state presented as real is not.

---

# 39. SECRETS

Never commit:

- API keys,
- tokens,
- credentials,
- private URLs.

Use environment variables.

Do not print secrets into logs or UI.

---

# 40. THIRD-PARTY ASSETS

You are authorized to use strong open-source assets and code.

Verify licenses first.

Record material dependencies/assets in:

`THIRD_PARTY_NOTICES.md`

Include:

- project,
- source,
- license,
- what was used.

Do not create a licensing problem for a hackathon demo.

---

# 41. BROWSER QA IS MANDATORY

Do not assume code looks good because it compiles.

Use the macOS host and browser.

Actually open the application.

Actually interact with it.

Actually inspect the 3D rendering.

Use screenshots during your own evaluation if useful.

Run through:

- input,
- analysis,
- playback,
- scrub,
- cohort select,
- fracture select,
- Evidence,
- command interaction,
- intervention,
- counterfactual,
- refresh,
- canonical cached analysis.

Check common laptop viewport sizes.

Fix visual bugs.

Repeat.

---

# 42. TESTING

Add focused tests where they protect important invariants.

Especially:

- temporal normalization,
- seeded simulation reproducibility,
- retention survival math,
- fracture detection,
- evidence provenance,
- Oriane adapter,
- counterfactual output,
- critical API handlers.

Use Playwright for the actual demo flow.

Do not waste the hackathon chasing arbitrary coverage percentages.

Test what could embarrass the demo or invalidate the science.

---

# 43. DEMO EXPERIENCE

Build around a devastatingly clear demo.

The likely narrative:

> “Creators currently test whether videos work by publishing them to humans.”

Input video.

> “We think that's backwards.”

Run simulation.

Oriane resolves video intelligence.

CORTEX initializes.

Synthetic audience appears.

Video plays.

Brain changes.

Retention moves.

Synthetic viewers react.

At a specific timestamp:

# ATTENTION FRACTURE

Select it.

Show:

- affected viewers,
- model state,
- observable evidence,
- scientific provenance,
- Oriane evidence.

Say:

> “This isn't just an LLM opinion.”

Open Evidence.

Then:

> “And it isn't just analytics.”

Select intervention.

# SIMULATE PATCH

Counterfactual curve appears.

Finish conceptually with:

> **Software has unit tests. Movies have test audiences. NEURASCOPE is the test environment for video.**

The application must make this story possible without a slide deck.

---

# 44. REQUIRED REPOSITORY DELIVERABLES

At completion, the repository should contain at minimum:

### Working application

Obviously.

### `README.md`

Concise:

- what NEURASCOPE is,
- architecture,
- how to run,
- environment variables,
- demo flow.

### `docs/SCIENCE_LEDGER.md`

Record:

- CORTEX variables,
- provenance,
- formulas,
- papers,
- mapping,
- heuristics,
- limitations.

Do not turn this into a thesis.

Make it auditable.

### `THIRD_PARTY_NOTICES.md`

Licenses/assets.

### `docs/DEMO.md`

Exact demo sequence and fallback flow.

### `docs/JUDGE_QA.md`

Prepare technically correct answers to likely questions:

- Is this real EEG?
- Where do coefficients come from?
- Why Oriane?
- Why not GPT?
- How do synthetic viewers work?
- How is retention computed?
- What is empirical vs heuristic?
- How would this become calibrated?
- Who pays?
- What is the moat?

Keep answers short and defensible.

---

# 45. WHAT NOT TO BUILD

Do not spend meaningful time on:

- billing,
- user management,
- organizations,
- permissions,
- full mobile app,
- giant marketing site,
- campaign management,
- full video editor,
- publishing integrations,
- 50 personas,
- 20 brain modes,
- SDK documentation,
- enterprise settings,
- generic analytics reports.

This is not the company ten years from now.

Build the wedge extraordinarily well.

---

# 46. DO NOT CHEAT

These are hard prohibitions.

Do not:

- fabricate scientific sources,
- cite papers you did not verify,
- invent Oriane endpoints,
- label local fixture data as Oriane output,
- generate random curves,
- hard-code a fracture and imply CORTEX found it,
- draw random EEG and call it predicted EEG,
- make viewer particles unrelated to viewer survival,
- fake counterfactual uplift,
- put random colored regions on the brain,
- use an LLM response as the hidden source of all quantitative values,
- leave major buttons nonfunctional,
- leave placeholder text in the demo,
- claim the application is finished because the page renders.

Every impressive pixel should:

> **trace backward to data and forward to a decision.**

---

# 47. AUTONOMY

You are authorized to:

- install packages,
- restructure the repository,
- create scripts,
- inspect open-source repositories,
- research technical methods,
- source openly licensed models,
- refactor,
- create tests,
- use browser automation,
- run builds,
- create migrations if genuinely needed,
- change internal architecture,
- remove weak code,
- choose algorithms,
- optimize rendering,
- make product decisions consistent with this specification.

Do not interrupt the run for ordinary decisions.

If an essential external credential or unavailable permission truly blocks a capability:

1. build everything around it,
2. create the correct adapter/interface,
3. clearly surface the blocker,
4. implement an explicitly labeled local development fixture if needed,
5. continue with every other part of the product.

Do not give up the build because one integration is unavailable.

---

# 48. TASTE AUTHORITY

You are not required to preserve an implementation simply because you already wrote it.

If something looks cheap:

redo it.

If a brain asset looks fake:

replace it.

If a layout looks like SaaS:

recompose it.

If a chart creates clutter:

merge it into the temporal instrument.

If an animation is decorative:

delete it.

If a feature weakens the product:

remove it.

The goal is not to maximize lines of code.

The goal is to maximize the quality of NEURASCOPE.

---

# 49. DEFINITION OF DONE

Do not stop until you have aggressively attempted every item below.

## Product

- [ ] User can input a real video.
- [ ] Analysis completes.
- [ ] Video intelligence is represented temporally.
- [ ] CORTEX runs through the video.
- [ ] Synthetic audience runs.
- [ ] Predicted retention is generated.
- [ ] Fractures are detected.
- [ ] Fracture inspection works.
- [ ] Interventions work.
- [ ] Counterfactual simulation works.
- [ ] Evidence is inspectable.

## Science

- [ ] Important values have provenance.
- [ ] Empirical/literature/derived/heuristic distinctions exist.
- [ ] Scientific citations are real and verified.
- [ ] Synthetic EEG is driven by CORTEX.
- [ ] Retention emerges from simulation.
- [ ] Viewer cohort behavior comes from model parameterization.
- [ ] No decorative scientific data is masquerading as computation.

## Oriane

- [ ] Actual API capability inspected.
- [ ] Real supported data used.
- [ ] Adapter layer exists.
- [ ] Unsupported behavior not invented.
- [ ] Oriane evidence is visibly useful to the diagnosis.

## 3D

- [ ] Anatomically credible brain.
- [ ] Premium materials/lighting.
- [ ] Interactive orbit/focus.
- [ ] Brain state synchronized to playback.
- [ ] Functional overlays are restrained and meaningful.
- [ ] Synthetic review groups are visually sophisticated.
- [ ] Population visualization is driven by simulation.
- [ ] Performance is acceptable.

## UI

- [ ] Brain is visually dominant.
- [ ] Video remains important.
- [ ] Unified temporal instrument exists.
- [ ] No generic card-grid dashboard.
- [ ] No hackathon-purple AI aesthetic.
- [ ] Glass used sparingly.
- [ ] Typography looks precise.
- [ ] Fracture interaction feels coherent.
- [ ] Evidence drawer feels integrated.
- [ ] Simulate Patch feels like a natural action.
- [ ] Interface has been visually inspected in-browser.

## Reliability

- [ ] Main demo flow browser-tested.
- [ ] No visible breaking errors.
- [ ] Production build passes.
- [ ] Same seed gives reproducible analysis.
- [ ] Canonical real analysis can be replayed if API fails.
- [ ] Refresh does not destroy the primary demo path.
- [ ] No secrets committed.

## Hackathon

- [ ] Demo can be understood quickly.
- [ ] Commercial use is obvious.
- [ ] Scientific differentiation is obvious.
- [ ] Oriane differentiation is obvious.
- [ ] Product looks like something that could exist after the hackathon.

---

# 50. FINAL BLACK-FLAG PASS

When you believe you are done, do **not** stop.

Perform a final adversarial review.

Act sequentially as:

### Skeptical neuroscientist

Try to invalidate the scientific claims.

### Oriane CTO

Try to prove the integration is shallow.

### Agency buyer

Try to prove there is no reason to pay.

### YC partner

Try to prove the wedge is vague.

### Apple-level product designer

Try to prove the UI is generic.

### Graphics engineer

Try to break the 3D performance.

### QA engineer

Try to break the demo.

### Hackathon judge

Try to dismiss the whole project as theater.

For every serious weakness discovered:

repair it if reasonably possible.

Then rerun the core flow.

Only after this black-flag pass should you consider the build complete.

---

# 51. FINAL OPERATING PRINCIPLE

The backend may look like a neuroscience paper.

The frontend should be understandable in five seconds.

The system should feel like:

> **an instrument, not a dashboard.**

The science must be real enough to survive questions.

The product must be simple enough to create immediate value.

The visual design must be strong enough to become memorable.

The Oriane integration must be deep enough that the product could not simply remove it without losing capability.

The simulation must be real enough that the 3D interface is a visualization of computation rather than theater.

Do not build a safe hackathon submission.

Build the first convincing version of a company.

Read the canonical MD.

Audit the repository.

Research what you need.

Make decisions autonomously.

Build the complete system.

Run it.

Look at it.

Attack it.

Fix it.

Repeat until it is excellent.