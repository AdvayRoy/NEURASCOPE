import { COHORTS, GAZE_ISC, IQR_TO_SIGMA, VIEWER_JITTER, type AudienceContextId, AUDIENCE_CONTEXTS } from "./params";
import { gaussian, mulberry32 } from "./rng";

export interface Population {
  size: number;
  cohort: Uint8Array;
  /** Baseline engagement 0..1 derived from sampled gaze ISC. */
  base: Float32Array;
  /** Sampled gaze ISC per viewer. */
  isc: Float32Array;
  distracted: Uint8Array;
  wNovelty: Float32Array;
  wSalience: Float32Array;
  wProgression: Float32Array;
  wLoad: Float32Array;
  wFatigue: Float32Array;
  wPayoff: Float32Array;
  wStatic: Float32Array;
  capacity: Float32Array;
  relevance: Float32Array;
  productAffinity: Float32Array;
  hook: Float32Array;
  /** Uniform threshold used to turn survival into a concrete exit time. */
  exitU: Float32Array;
  /** Stable layout coordinate for particle rendering. */
  layout: Float32Array;
}

export function samplePopulation(size: number, seed: number, context: AudienceContextId): Population {
  const rng = mulberry32(seed);
  const mix = AUDIENCE_CONTEXTS[context].mix;
  const cdf: number[] = [];
  let acc = 0;
  for (const c of COHORTS) cdf.push((acc += mix[c.id]));
  const f = () => new Float32Array(size);
  const p: Population = {
    size,
    cohort: new Uint8Array(size),
    base: f(),
    isc: f(),
    distracted: new Uint8Array(size),
    wNovelty: f(),
    wSalience: f(),
    wProgression: f(),
    wLoad: f(),
    wFatigue: f(),
    wPayoff: f(),
    wStatic: f(),
    capacity: f(),
    relevance: f(),
    productAffinity: f(),
    hook: f(),
    exitU: f(),
    layout: new Float32Array(size * 2),
  };
  const jit = () => Math.exp(gaussian(rng) * VIEWER_JITTER);
  const { attentive: A, distracted: D } = GAZE_ISC;
  for (let i = 0; i < size; i++) {
    const r = rng() * acc;
    const ci = Math.max(0, cdf.findIndex((x) => r <= x));
    const c = COHORTS[ci];
    p.cohort[i] = ci;
    const distracted = rng() < c.pDistracted;
    p.distracted[i] = distracted ? 1 : 0;
    const d = distracted ? D : A;
    const isc = Math.min(0.75, Math.max(-0.05, d.median + gaussian(rng) * d.iqr * IQR_TO_SIGMA));
    p.isc[i] = isc;
    p.base[i] = Math.min(1, Math.max(0, (isc - D.median) / (A.median - D.median)));
    p.wNovelty[i] = c.w.novelty * jit();
    p.wSalience[i] = c.w.salience * jit();
    p.wProgression[i] = c.w.progression * jit();
    p.wLoad[i] = c.w.load * jit();
    p.wFatigue[i] = c.w.fatigue * jit();
    p.wPayoff[i] = c.w.payoff * jit();
    p.wStatic[i] = c.w.static * jit();
    p.capacity[i] = c.capacity * jit();
    p.relevance[i] = Math.min(1.2, c.relevance * jit());
    p.productAffinity[i] = c.productAffinity * jit();
    p.hook[i] = c.hook * jit();
    p.exitU[i] = Math.max(1e-6, rng());
    p.layout[2 * i] = rng();
    p.layout[2 * i + 1] = rng();
  }
  return p;
}
