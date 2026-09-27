import type { Counterfactual, CortexRun } from "../cortex";
import type { Fracture, FractureDriver } from "../cortex/fractures";
import type { Intervention } from "../cortex/interventions";
import { COHORTS } from "../cortex/params";
import type { CorpusResult } from "../oriane/comparables";

/**
 * Pre-flight Brief: a creator-facing composition of quantities CORTEX, the source
 * observation, Oriane corpus retrieval and the counterfactual engine already expose.
 * Nothing here is a new score; every field is a projection of existing run state.
 */
export interface ObservedFact {
  label: string;
  value: string;
}

export interface PreflightBrief {
  /** The fracture with the largest excess survival loss (CORTEX severity 1.0); ids F1…Fn are chronological. */
  primary: Fracture | null;
  why: string | null;
  observed: ObservedFact[];
  recommended: Intervention | null;
}

const s1 = (t: number) => `${t.toFixed(1)} s`;

/** Same quantity CORTEX ranks and normalises severity by; no new score. */
export function primaryFracture(run: CortexRun): Fracture | null {
  if (!run.fractures.length) return null;
  return run.fractures.reduce((a, b) => (b.lossPts > a.lossPts ? b : a));
}

const PHRASE: Record<FractureDriver["key"], { up: string; down: string }> = {
  payoff: { up: "the opening promise stays unresolved", down: "the payoff lands" },
  progression: { up: "new meaning arrives quickly", down: "semantic progression stalls" },
  novelty: { up: "visual/semantic novelty spikes", down: "visual and semantic novelty fade" },
  static: { up: "the frame stays static", down: "the frame starts changing" },
  habituation: { up: "viewers habituate to a repeated state", down: "habituation resets" },
  load: { up: "information density exceeds viewer capacity", down: "information density drops" },
  salience: { up: "orienting cues spike", down: "orienting cues disappear" },
};

/** One plain-language sentence composed from the top two CORTEX drivers and their measured direction. */
export function whyLine(fr: Fracture): string {
  const [a, b] = fr.drivers;
  if (!a) return "CORTEX found a hazard rise without a single dominant driver.";
  const pa = PHRASE[a.key][a.direction];
  if (!b) return cap(`${pa}.`);
  const pb = PHRASE[b.key][b.direction];
  return cap(`${pa} while ${pb}.`);
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Objective observations from the decoded source in the fracture window; only measurable channels are listed. */
export function observedFacts(fr: Fracture, availability: CortexRun["timeline"]["availability"]): ObservedFact[] {
  const o = fr.observed;
  const out: ObservedFact[] = [];
  if (availability.visual) out.push({ label: "since last major visual transition", value: s1(o.staticSeconds) });
  if (availability.transcript) {
    out.push({ label: "spoken words since last cut", value: String(o.wordsSinceCut) });
    if (o.newConcepts > 0) out.push({ label: "new concepts in window", value: String(o.newConcepts) });
    if (o.payoff.status === "unresolved") out.push({ label: "open loop unresolved for", value: s1(o.openLoopSeconds) });
    else if (o.payoff.status === "resolved") out.push({ label: "payoff resolves at", value: s1(o.payoff.at) });
  }
  return out;
}

/** The intervention that addresses the fracture's leading driver; otherwise the first one proposed for it. */
export function recommendedIntervention(run: CortexRun, fr: Fracture): Intervention | null {
  const ivs = run.interventions.filter((i) => i.fractureId === fr.id);
  if (!ivs.length) return null;
  for (const d of fr.drivers) {
    const hit = ivs.find((i) => i.addresses.includes(d.key));
    if (hit) return hit;
  }
  return ivs[0];
}

export function buildBrief(run: CortexRun): PreflightBrief {
  const primary = primaryFracture(run);
  if (!primary) return { primary: null, why: null, observed: [], recommended: null };
  return {
    primary,
    why: whyLine(primary),
    observed: observedFacts(primary, run.timeline.availability),
    recommended: recommendedIntervention(run, primary),
  };
}

export function mostAffectedLabel(fr: Fracture): string {
  const top = fr.cohorts[0];
  const c = top && COHORTS.find((x) => x.id === top.cohort);
  return c ? `${c.label}s most affected · ${Math.round(top.lossShare * 100)}% of those still watching` : "";
}

/** Descriptive-only decision state for the analyst: recommendation and any simulated result. Never a CORTEX input. */
export function decisionSummary(run: CortexRun, counterfactuals: Record<string, Counterfactual>, corpus: Record<string, CorpusResult | "pending">) {
  const b = buildBrief(run);
  if (!b.primary) return { primaryRisk: null, note: "No high-confidence Attention Fracture detected in this run." };
  const cf = b.recommended ? counterfactuals[b.recommended.id] : undefined;
  const ev = corpus[b.primary.id];
  return {
    primaryRisk: { id: b.primary.id, start: b.primary.start, end: b.primary.end, lossPts: b.primary.lossPts, why: b.why },
    observed: b.observed,
    corpusComparables: ev && ev !== "pending" && ev.available ? ev.items.length : null,
    recommended: b.recommended ? { id: b.recommended.id, title: b.recommended.title, instruction: b.recommended.instruction } : null,
    simulated: cf ? { deltaPts: cf.deltaPts, evalAt: cf.evalAt, endOriginal: cf.endOriginal, endCounterfactual: cf.endCounterfactual, note: "counterfactual model prediction on the same seeded population · Tier C · not a guaranteed uplift" } : null,
  };
}
