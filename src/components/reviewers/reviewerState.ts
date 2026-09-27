import { COHORTS } from "@/lib/cortex/params";
import { sampleAt } from "@/lib/cortex/simulate";
import type { CortexRun } from "@/lib/cortex";

export interface ReviewerState {
  attention: number;
  survival: number;
  /** Cohort hazard on a scale shared by all cohorts (log-ratio to population median hazard), 0..1. */
  withdrawal: number;
  /** Cohort-weighted novelty + salience, 0..1. */
  orienting: number;
  /** Processing load in excess of cohort capacity (the model's load-penalty term), 0..1. */
  tension: number;
  /** Transient fracture response: window envelope × cohort loss share, 0..1. */
  fracture: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const RESPONSE_TAIL = 0.6;
const ONSET = 0.35;
const smooth = (a: number, b: number, x: number) => {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};

const WITHDRAWAL_RANGE = Math.log(6);

/** Median population hazard, the shared reference for every reviewer's withdrawal. */
export function hazardReference(run: CortexRun): number {
  const s = Array.from(run.sim.hazard).sort((a, b) => a - b);
  return Math.max(1e-4, s[Math.floor(s.length / 2)] ?? 1e-4);
}

/** Deterministic mapping from cohort CORTEX state at time t to the reviewer's visual encoding. */
export function reviewerState(run: CortexRun, c: number, t: number, hazardRef: number): ReviewerState {
  const hz = run.sim.hz;
  const spec = COHORTS[c];
  const d = run.drivers;
  const h = sampleAt(run.sim.hazardByCohort[c], hz, t);
  const nov = sampleAt(d.novelty, hz, t);
  const sal = sampleAt(d.salience, hz, t);
  const load = sampleAt(d.load, hz, t);
  let fracture = 0;
  for (const f of run.fractures) {
    if (t < f.start - ONSET || t > f.end + RESPONSE_TAIL) continue;
    const impact = f.cohorts.find((x) => x.cohort === spec.id);
    const env = smooth(f.start - ONSET, f.start + 0.1, t) * (1 - smooth(f.end, f.end + RESPONSE_TAIL, t));
    fracture = Math.max(fracture, env * clamp01((impact?.lossShare ?? 0) / 0.15));
  }
  return {
    attention: clamp01(sampleAt(run.sim.attentionByCohort[c], hz, t)),
    survival: clamp01(sampleAt(run.sim.retentionByCohort[c], hz, t)),
    withdrawal: clamp01(Math.log(Math.max(1e-6, h / hazardRef)) / WITHDRAWAL_RANGE),
    orienting: clamp01((spec.w.novelty * nov + spec.w.salience * sal) / Math.max(1e-3, spec.w.novelty + spec.w.salience)),
    tension: clamp01((load - spec.capacity) / 0.6),
    fracture,
  };
}
