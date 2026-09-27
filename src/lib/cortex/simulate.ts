import type { CortexDrivers, FeatureTimeline } from "./features";
import { COHORTS, DYNAMICS } from "./params";
import type { Population } from "./population";

export interface SimResult {
  n: number;
  hz: number;
  size: number;
  /** R̂(t) = mean_i S_i(t), sampled at step starts; R[0] = 1. */
  retention: Float32Array;
  retentionByCohort: Float32Array[];
  /** Expected hazard among survivors, per second. */
  hazard: Float32Array;
  hazardByCohort: Float32Array[];
  /** Survival-weighted mean attention state. */
  attention: Float32Array;
  attentionByCohort: Float32Array[];
  /** Concrete exit time per viewer (s); Infinity if the viewer finishes. */
  exitTime: Float32Array;
  cohortCounts: number[];
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Attention target for one viewer at one step. Exported for tests and the inspector. */
export function attentionDrive(p: Population, i: number, d: CortexDrivers, k: number): number {
  return (
    0.9 +
    2.2 * (p.base[i] - 0.5) +
    1.4 * p.wNovelty[i] * (d.novelty[k] - 0.35) +
    0.8 * p.wSalience[i] * d.salience[k] +
    1.2 * p.wProgression[i] * p.relevance[i] * (d.progression[k] - 0.35) -
    2.0 * p.wLoad[i] * Math.max(0, d.load[k] - p.capacity[i]) -
    0.9 * p.wFatigue[i] * d.habituation[k] -
    1.1 * p.wPayoff[i] * d.payoffDistance[k] -
    1.2 * p.wStatic[i] * d.staticness[k] +
    1.2 * p.productAffinity[i] * d.productPulse[k]
  );
}

export function simulate(f: FeatureTimeline, d: CortexDrivers, p: Population): SimResult {
  const { n, hz } = f;
  const dt = 1 / hz;
  const C = COHORTS.length;
  const S = new Float64Array(n);
  const SH = new Float64Array(n);
  const SA = new Float64Array(n);
  const Sc = Array.from({ length: C }, () => new Float64Array(n));
  const SHc = Array.from({ length: C }, () => new Float64Array(n));
  const SAc = Array.from({ length: C }, () => new Float64Array(n));
  const counts = new Array(C).fill(0);
  const exitTime = new Float32Array(p.size).fill(Infinity);
  const hookDecay = new Float32Array(n);
  for (let k = 0; k < n; k++) hookDecay[k] = Math.exp(-(k * dt) / DYNAMICS.tauHook);
  const alpha = dt / DYNAMICS.tauAttention;
  const { lambdaMax, beta0, betaAttention, betaHook } = DYNAMICS;

  for (let i = 0; i < p.size; i++) {
    const c = p.cohort[i];
    counts[c]++;
    const exitH = -Math.log(p.exitU[i]);
    let a = sigmoid(attentionDrive(p, i, d, 0));
    let H = 0;
    let surv = 1;
    let exited = false;
    const sc = Sc[c], shc = SHc[c], sac = SAc[c];
    for (let k = 0; k < n; k++) {
      a += (sigmoid(attentionDrive(p, i, d, k)) - a) * alpha;
      const lam = lambdaMax * sigmoid(beta0 + betaAttention * (1 - a) + betaHook * p.hook[i] * hookDecay[k]);
      const h = 1 - Math.exp(-lam * dt);
      S[k] += surv;
      SH[k] += surv * h;
      SA[k] += surv * a;
      sc[k] += surv;
      shc[k] += surv * h;
      sac[k] += surv * a;
      H += lam * dt;
      surv = Math.exp(-H);
      if (!exited && H >= exitH) {
        exited = true;
        exitTime[i] = (k + 1) * dt;
      }
    }
  }
  const out = (num: Float64Array, den: Float64Array, scale = 1) => {
    const r = new Float32Array(n);
    for (let k = 0; k < n; k++) r[k] = den[k] > 0 ? (num[k] / den[k]) * scale : 0;
    return r;
  };
  const norm = (a: Float64Array, count: number) => {
    const r = new Float32Array(n);
    for (let k = 0; k < n; k++) r[k] = count ? a[k] / count : 0;
    return r;
  };
  return {
    n,
    hz,
    size: p.size,
    retention: norm(S, p.size),
    retentionByCohort: Sc.map((s, c) => norm(s, counts[c])),
    hazard: out(SH, S, hz),
    hazardByCohort: SHc.map((sh, c) => out(sh, Sc[c], hz)),
    attention: out(SA, S),
    attentionByCohort: SAc.map((sa, c) => out(sa, Sc[c])),
    exitTime,
    cohortCounts: counts,
  };
}

/** Retention at time t (linear interpolation, holds last value past the end). */
export function sampleAt(a: Float32Array, hz: number, t: number): number {
  const x = Math.max(0, t * hz);
  const i = Math.min(a.length - 1, Math.floor(x));
  const j = Math.min(a.length - 1, i + 1);
  const f = x - i;
  return a[i] * (1 - f) + a[j] * f;
}
