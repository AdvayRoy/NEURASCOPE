import type { EvidenceTier } from "../evidence/provenance";
import type { TranscriptSegment } from "../ontology";
import type { CortexDrivers, FeatureTimeline } from "./features";
import type { NetworkId } from "./networks";
import { AUDIENCE_CONTEXTS, COHORTS, DYNAMICS, FRACTURE, type AudienceContextId, type CohortId } from "./params";
import type { SimResult } from "./simulate";

export type DriverKey = "novelty" | "progression" | "load" | "payoff" | "static" | "habituation" | "salience";

export interface FractureDriver {
  key: DriverKey;
  label: string;
  direction: "up" | "down";
  /** Change of the driver in the window versus the preceding baseline. */
  delta: number;
  /** Estimated contribution to the attention drive deficit (population-weighted). */
  contribution: number;
  tier: EvidenceTier;
  sources: string[];
}

export interface CohortImpact {
  cohort: CohortId;
  /** Share of the cohort's remaining viewers lost across the fracture (+1 s). */
  lossShare: number;
  /** Peak hazard relative to the cohort's own baseline. */
  lift: number;
}

export interface FractureObservation {
  staticSeconds: number;
  words: number;
  wordsSinceCut: number;
  newConcepts: number;
  openLoopSeconds: number;
  payoff: { status: "resolved"; at: number } | { status: "unresolved" } | { status: "none-open" };
  transcript: string;
}

export interface Fracture {
  id: string;
  index: number;
  start: number;
  end: number;
  peak: number;
  baselineHazard: number;
  peakHazard: number;
  hazardExcess: number;
  /** Survival points lost in excess of baseline hazard. */
  lossPts: number;
  retentionStart: number;
  retentionEnd: number;
  severity: number;
  drivers: FractureDriver[];
  cohorts: CohortImpact[];
  observed: FractureObservation;
  networks: NetworkId[];
  sources: string[];
}

export const DRIVER_META: Record<DriverKey, { label: string; sources: string[]; tier: EvidenceTier; networks: NetworkId[] }> = {
  novelty: { label: "Visual / semantic novelty", sources: ["itti2009", "ki2016"], tier: "derived", networks: ["visual", "salience"] },
  progression: { label: "Semantic progression", sources: ["cohen2017", "ki2016"], tier: "derived", networks: ["semantic"] },
  load: { label: "Processing demand", sources: ["lang2000", "jensen2002"], tier: "derived", networks: ["control", "language"] },
  payoff: { label: "Unresolved payoff", sources: ["neurascopeHeuristics", "tong2020"], tier: "heuristic", networks: ["semantic", "control"] },
  static: { label: "Static visual state", sources: ["madsen2021", "bbbd2026", "itti2009", "neurascopeHeuristics"], tier: "heuristic", networks: ["visual", "dorsal"] },
  habituation: { label: "Habituation", sources: ["itti2009", "neurascopeHeuristics"], tier: "heuristic", networks: ["salience"] },
  salience: { label: "Orienting salience", sources: ["lang2000", "corbetta2002"], tier: "derived", networks: ["ventral", "salience"] },
};

function mean(a: ArrayLike<number>, i0: number, i1: number) {
  let s = 0;
  let c = 0;
  for (let i = Math.max(0, i0); i < Math.min(a.length, i1); i++) { s += a[i]; c++; }
  return c ? s / c : 0;
}

function smooth(a: Float32Array, half: number) {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = mean(a, i - half, i + half + 1);
  return out;
}

function median(a: ArrayLike<number>, i0: number, i1: number) {
  const s: number[] = [];
  for (let i = Math.max(0, i0); i < Math.min(a.length, i1); i++) s.push(a[i]);
  s.sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

/** Population-mean driver weights under the audience context. */
function meanWeights(context: AudienceContextId) {
  const mix = AUDIENCE_CONTEXTS[context].mix;
  const w = { novelty: 0, salience: 0, progression: 0, load: 0, fatigue: 0, payoff: 0, static: 0, capacity: 0 };
  for (const c of COHORTS) {
    const m = mix[c.id];
    w.novelty += m * c.w.novelty;
    w.salience += m * c.w.salience;
    w.progression += m * c.w.progression * c.relevance;
    w.load += m * c.w.load;
    w.fatigue += m * c.w.fatigue;
    w.payoff += m * c.w.payoff;
    w.static += m * c.w.static;
    w.capacity += m * c.capacity;
  }
  return w;
}

export function detectFractures(
  f: FeatureTimeline,
  d: CortexDrivers,
  sim: SimResult,
  transcript: TranscriptSegment[],
  context: AudienceContextId,
): Fracture[] {
  const { n, hz } = f;
  const H = smooth(sim.hazard, 1);
  const base = new Float32Array(n);
  const bw = Math.round(FRACTURE.baselineWindow * hz);
  const start0 = Math.round(DYNAMICS.hookWindow * hz);
  for (let k = 0; k < n; k++) base[k] = median(H, Math.max(start0 - 2, k - bw), Math.max(start0, k - 2));
  const flags = new Uint8Array(n);
  for (let k = start0; k < n; k++) {
    const ex = H[k] - base[k];
    if (ex > FRACTURE.minAbsExcess && ex > FRACTURE.minRelExcess * base[k]) flags[k] = 1;
  }
  // Collect windows, merging small gaps.
  const wins: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    if (!flags[k]) continue;
    let e = k;
    while (e + 1 < n && flags[e + 1]) e++;
    const last = wins.at(-1);
    if (last && k - last[1] <= FRACTURE.mergeGap * hz) last[1] = e;
    else wins.push([k, e]);
    k = e;
  }
  const w = meanWeights(context);
  const out: Fracture[] = [];
  for (const [s, e0] of wins) {
    const e = Math.min(n - 1, Math.max(e0, s + Math.round(FRACTURE.minDuration * hz) - 1));
    if (e - s + 1 < FRACTURE.minDuration * hz) continue;
    // Loss in excess of baseline: integrate (H - base) * R over the window.
    let loss = 0;
    let peakK = s;
    for (let k = s; k <= e; k++) {
      loss += Math.max(0, H[k] - base[s]) * sim.retention[k] / hz;
      if (H[k] > H[peakK]) peakK = k;
    }
    const lossPts = loss * 100;
    if (lossPts < FRACTURE.minLossPts) continue;
    const b0 = Math.max(0, s - bw);
    const dm = (a: Float32Array) => mean(a, s, e + 1) - mean(a, b0, s);
    const loadRelu = (a: Float32Array, i0: number, i1: number) => {
      let acc = 0, c = 0;
      for (let i = Math.max(0, i0); i < Math.min(n, i1); i++) { acc += Math.max(0, a[i] - w.capacity); c++; }
      return c ? acc / c : 0;
    };
    const raw: Record<DriverKey, { delta: number; contribution: number }> = {
      novelty: { delta: dm(d.novelty), contribution: -1.4 * w.novelty * dm(d.novelty) },
      progression: { delta: dm(d.progression), contribution: -1.2 * w.progression * dm(d.progression) },
      load: { delta: dm(d.load), contribution: 2.0 * w.load * (loadRelu(d.load, s, e + 1) - loadRelu(d.load, b0, s)) },
      payoff: { delta: dm(d.payoffDistance), contribution: 1.1 * w.payoff * dm(d.payoffDistance) },
      static: { delta: dm(d.staticness), contribution: 1.2 * w.static * dm(d.staticness) },
      habituation: { delta: dm(d.habituation), contribution: 0.9 * w.fatigue * dm(d.habituation) },
      salience: { delta: dm(d.salience), contribution: -0.8 * w.salience * dm(d.salience) },
    };
    const drivers: FractureDriver[] = (Object.keys(raw) as DriverKey[])
      .filter((k) => raw[k].contribution > FRACTURE.driverThreshold)
      .sort((a, b) => raw[b].contribution - raw[a].contribution)
      .slice(0, 4)
      .map((k) => ({
        key: k,
        label: DRIVER_META[k].label,
        direction: raw[k].delta >= 0 ? "up" : "down",
        delta: raw[k].delta,
        contribution: raw[k].contribution,
        tier: DRIVER_META[k].tier,
        sources: DRIVER_META[k].sources,
      }));
    // A fracture requires an interpretable mechanism.
    if (!drivers.length) continue;
    const t0 = s / hz;
    const t1 = (e + 1) / hz;
    const post = Math.min(n - 1, e + hz);
    const cohorts: CohortImpact[] = COHORTS.map((c, ci) => {
      const rc = sim.retentionByCohort[ci];
      const hc = sim.hazardByCohort[ci];
      const cb = median(hc, b0, s) || 1e-4;
      let pk = 0;
      for (let k = s; k <= e; k++) pk = Math.max(pk, hc[k]);
      return { cohort: c.id, lossShare: rc[s] > 0 ? 1 - rc[post] / rc[s] : 0, lift: pk / cb };
    }).sort((a, b) => b.lossShare - a.lossShare);
    const observed = observe(f, d, transcript, s, e, t0, t1);
    const networks = [...new Set(drivers.flatMap((x) => DRIVER_META[x.key].networks))].slice(0, 2);
    out.push({
      id: `F${out.length + 1}`,
      index: out.length,
      start: t0,
      end: t1,
      peak: peakK / hz,
      baselineHazard: base[s],
      peakHazard: H[peakK],
      hazardExcess: H[peakK] - base[s],
      lossPts,
      retentionStart: sim.retention[s],
      retentionEnd: sim.retention[Math.min(n - 1, e + 1)],
      severity: 0,
      drivers,
      cohorts,
      observed,
      networks,
      sources: [...new Set(["ki2016", "cohen2017", ...drivers.flatMap((x) => x.sources)])],
    });
  }
  out.sort((a, b) => b.lossPts - a.lossPts);
  const kept = out.slice(0, FRACTURE.maxFractures).sort((a, b) => a.start - b.start);
  const maxLoss = Math.max(1e-6, ...kept.map((x) => x.lossPts));
  return kept.map((x, i) => ({ ...x, id: `F${i + 1}`, index: i, severity: x.lossPts / maxLoss }));
}

function observe(f: FeatureTimeline, d: CortexDrivers, transcript: TranscriptSegment[], s: number, e: number, t0: number, t1: number): FractureObservation {
  const hz = f.hz;
  let staticSeconds = 0;
  for (let k = s; k <= e; k++) staticSeconds = Math.max(staticSeconds, d.staticness[k] * DYNAMICS.staticSaturation);
  let lastCut = 0;
  for (let k = e; k >= 0; k--) if (f.cut[k] > 0) { lastCut = k / hz; break; }
  const countWords = (a: number, b: number) =>
    transcript.reduce((acc, seg) => {
      const ws = seg.text.split(/\s+/).filter(Boolean);
      const len = Math.max(0.2, seg.end - seg.start);
      return acc + ws.filter((_, j) => { const tw = seg.start + (len * (j + 0.5)) / ws.length; return tw >= a && tw < b; }).length;
    }, 0);
  let concepts = 0;
  for (let k = s; k <= e; k++) concepts += f.newConcepts[k] / hz;
  const openLoopSeconds = d.payoffDistance[e] * DYNAMICS.payoffSaturation;
  const nextPayoff = f.events.find((ev) => (ev.kind === "payoff" || ev.kind === "product") && ev.t >= t0);
  const payoff: FractureObservation["payoff"] =
    d.payoffDistance[e] <= 0 ? { status: "none-open" } : nextPayoff ? { status: "resolved", at: nextPayoff.t } : { status: "unresolved" };
  const text = transcript
    .filter((seg) => seg.end > t0 - 0.5 && seg.start < t1 + 0.5)
    .map((seg) => seg.text)
    .join(" ");
  return {
    staticSeconds,
    words: countWords(t0, t1),
    wordsSinceCut: countWords(lastCut, t1),
    newConcepts: Math.round(concepts),
    openLoopSeconds,
    payoff,
    transcript: text,
  };
}
