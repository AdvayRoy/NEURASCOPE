import type { VideoOntology } from "../ontology";
import { CUES, DYNAMICS, SIM_HZ, STOPWORDS } from "./params";

export type SemanticEventKind = "hook" | "cut" | "open-loop" | "payoff" | "product" | "cta" | "speech";

export interface SemanticEvent {
  id: string;
  kind: SemanticEventKind;
  t: number;
  end?: number;
  label: string;
  /** How the event was detected. */
  detector: string;
  tier: "derived" | "heuristic";
}

/**
 * Raw feature timeline sampled at SIM_HZ. Interventions edit this object; CORTEX recomputes everything downstream.
 */
export interface FeatureTimeline {
  hz: number;
  n: number;
  duration: number;
  /** Visual change 0..1 (robust-normalized frame difference). */
  visualChange: Float32Array;
  /** 1 at steps containing a hard cut. */
  cut: Float32Array;
  /** Audio onset strength 0..1. */
  audioOnset: Float32Array;
  /** Words per second spoken. */
  speechRate: Float32Array;
  /** New content words introduced per second. */
  newConcepts: Float32Array;
  /** 1 at steps where a product/entity is named. */
  product: Float32Array;
  /** Gaze dispersion proxy 0..1. */
  gazeDispersion: Float32Array;
  events: SemanticEvent[];
  /** Which inputs were measured vs held at a neutral prior. */
  availability: { visual: boolean; audio: boolean; transcript: boolean; gaze: boolean };
}

const words = (s: string) => s.toLowerCase().match(/[a-z0-9']+/g) ?? [];

function resample(src: number[], srcHz: number, n: number): Float32Array {
  const out = new Float32Array(n);
  if (!src.length) return out;
  for (let i = 0; i < n; i++) {
    const x = (i / SIM_HZ) * srcHz;
    const i0 = Math.min(src.length - 1, Math.floor(x));
    const i1 = Math.min(src.length - 1, i0 + 1);
    const f = x - i0;
    out[i] = src[i0] * (1 - f) + src[i1] * f;
  }
  return out;
}

function robustNormalize(a: Float32Array, q = 0.95) {
  const sorted = Array.from(a).sort((x, y) => x - y);
  const hi = sorted[Math.floor((sorted.length - 1) * q)] || 1e-6;
  const lo = sorted[Math.floor((sorted.length - 1) * 0.05)] || 0;
  const span = Math.max(1e-6, hi - lo);
  for (let i = 0; i < a.length; i++) a[i] = Math.min(1, Math.max(0, (a[i] - lo) / span));
}

/** Product/entity vocabulary: hashtags and caption tokens that also occur in speech. */
function entityVocabulary(o: VideoOntology): Set<string> {
  const vocab = new Set<string>();
  for (const h of o.hashtags) {
    const w = h.replace(/^#/, "").toLowerCase();
    if (w.length > 2 && !["fyp", "foryou", "foryoupage", "viral", "reels", "tiktok", "trending"].includes(w)) vocab.add(w);
  }
  return vocab;
}

export function buildFeatureTimeline(o: VideoOntology): FeatureTimeline {
  const duration = Math.max(1, o.duration);
  const n = Math.max(2, Math.ceil(duration * SIM_HZ));
  const s = o.signals;
  const visualChange = s ? resample(s.frameDiff, s.hz, n) : new Float32Array(n).fill(0.3);
  if (s) robustNormalize(visualChange);
  const cut = new Float32Array(n);
  for (const c of s?.cuts ?? []) {
    const i = Math.round(c * SIM_HZ);
    if (i >= 0 && i < n) cut[i] = 1;
  }
  const audioOnset = new Float32Array(n);
  const hasAudio = !!s && s.audioRms.length > 0;
  if (hasAudio) {
    const rms = resample(s!.audioRms, s!.hz, n);
    for (let i = 1; i < n; i++) audioOnset[i] = Math.max(0, rms[i] - rms[i - 1]);
    robustNormalize(audioOnset, 0.98);
  }
  const gazeDispersion = s ? resample(s.spatialEntropy, s.hz, n) : new Float32Array(n).fill(0.5);

  const speechRate = new Float32Array(n);
  const newConcepts = new Float32Array(n);
  const product = new Float32Array(n);
  const events: SemanticEvent[] = [];
  const seen = new Set<string>();
  const vocab = entityVocabulary(o);
  const hasTranscript = o.transcript.length > 0;
  let openLoopOpen = false;

  o.transcript.forEach((seg, k) => {
    const ws = words(seg.text);
    const len = Math.max(0.2, seg.end - seg.start);
    const i0 = Math.max(0, Math.floor(seg.start * SIM_HZ));
    const i1 = Math.min(n, Math.max(i0 + 1, Math.ceil(seg.end * SIM_HZ)));
    const rate = ws.length / len;
    ws.forEach((w, j) => {
      const ti = Math.min(n - 1, Math.floor((seg.start + (len * (j + 0.5)) / ws.length) * SIM_HZ));
      if (!STOPWORDS.has(w) && w.length > 2 && !seen.has(w)) {
        seen.add(w);
        newConcepts[ti] += SIM_HZ;
      }
      if (vocab.has(w) && !product.slice(Math.max(0, ti - 20), ti).some((x) => x > 0)) {
        product[ti] = 1;
        events.push({ id: `product-${ti}`, kind: "product", t: ti / SIM_HZ, label: `Names “${w}”`, detector: "hashtag ∩ transcript", tier: "heuristic" });
      }
    });
    for (let i = i0; i < i1; i++) speechRate[i] = rate;
    if (k === 0 && seg.start < 3) {
      events.push({ id: "hook", kind: "hook", t: seg.start, end: seg.end, label: seg.text.slice(0, 80), detector: "first spoken line", tier: "derived" });
    }
    if (CUES.openLoop.test(seg.text)) {
      openLoopOpen = true;
      events.push({ id: `open-${k}`, kind: "open-loop", t: seg.start, end: seg.end, label: seg.text.slice(0, 80), detector: "open-loop cue lexicon", tier: "heuristic" });
    } else if (openLoopOpen && CUES.payoff.test(seg.text)) {
      openLoopOpen = false;
      events.push({ id: `payoff-${k}`, kind: "payoff", t: seg.start, end: seg.end, label: seg.text.slice(0, 80), detector: "payoff cue lexicon", tier: "heuristic" });
    }
    if (CUES.cta.test(seg.text)) {
      events.push({ id: `cta-${k}`, kind: "cta", t: seg.start, end: seg.end, label: seg.text.slice(0, 80), detector: "CTA cue lexicon", tier: "heuristic" });
    }
  });
  // Smooth concept introductions over ~1 s so rate is per second.
  const smooth = new Float32Array(n);
  const half = Math.round(SIM_HZ / 2);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    let c = 0;
    for (let j = i - half; j <= i + half; j++) if (j >= 0 && j < n) { acc += newConcepts[j]; c++; }
    smooth[i] = acc / Math.max(1, c);
  }
  for (const c of s?.cuts ?? []) {
    events.push({ id: `cut-${Math.round(c * 100)}`, kind: "cut", t: c, label: "Hard cut", detector: "frame-difference peak", tier: "derived" });
  }
  events.sort((a, b) => a.t - b.t);
  return {
    hz: SIM_HZ,
    n,
    duration,
    visualChange,
    cut,
    audioOnset,
    speechRate,
    newConcepts: smooth,
    product,
    gazeDispersion,
    events,
    availability: { visual: !!s, audio: hasAudio, transcript: hasTranscript, gaze: !!s },
  };
}

export function cloneTimeline(f: FeatureTimeline): FeatureTimeline {
  return {
    ...f,
    visualChange: f.visualChange.slice(),
    cut: f.cut.slice(),
    audioOnset: f.audioOnset.slice(),
    speechRate: f.speechRate.slice(),
    newConcepts: f.newConcepts.slice(),
    product: f.product.slice(),
    gazeDispersion: f.gazeDispersion.slice(),
    events: f.events.map((e) => ({ ...e })),
    availability: { ...f.availability },
  };
}

/** Population-level CORTEX drivers derived from the feature timeline (all 0..1 except load which may exceed 1). */
export interface CortexDrivers {
  novelty: Float32Array;
  salience: Float32Array;
  load: Float32Array;
  progression: Float32Array;
  payoffDistance: Float32Array;
  staticness: Float32Array;
  habituation: Float32Array;
  gazeConcentration: Float32Array;
  productPulse: Float32Array;
}

export function computeDrivers(f: FeatureTimeline): CortexDrivers {
  const { n, hz } = f;
  const dt = 1 / hz;
  const novelty = new Float32Array(n);
  const salience = new Float32Array(n);
  const load = new Float32Array(n);
  const progression = new Float32Array(n);
  const payoffDistance = new Float32Array(n);
  const staticness = new Float32Array(n);
  const habituation = new Float32Array(n);
  const gazeConcentration = new Float32Array(n);
  const productPulse = new Float32Array(n);

  // Open-loop intervals from events.
  const openAt = new Float32Array(n).fill(-1);
  let open = -1;
  const byStep = new Map<number, SemanticEvent[]>();
  for (const e of f.events) {
    const i = Math.min(n - 1, Math.max(0, Math.round(e.t * hz)));
    byStep.set(i, [...(byStep.get(i) ?? []), e]);
  }

  let mean = f.visualChange[0];
  let varc = 0.02;
  let sal = 0;
  let prod = 0;
  let hab = 0;
  let sinceChange = 0;
  const decay = Math.exp(-dt / 0.8);
  const prodDecay = Math.exp(-dt / 2.5);
  for (let i = 0; i < n; i++) {
    for (const e of byStep.get(i) ?? []) {
      if (e.kind === "open-loop" || e.kind === "hook") open = open < 0 ? i : open;
      if (e.kind === "payoff" || e.kind === "product") open = -1;
    }
    openAt[i] = open;
    const v = f.visualChange[i];
    // Bayesian-surprise-style perceptual novelty (Itti & Baldi 2009).
    const z = Math.abs(v - mean) / Math.sqrt(varc + 1e-4);
    mean += (v - mean) * 0.08;
    varc += ((v - mean) ** 2 - varc) * 0.08;
    const perceptual = Math.min(1, z / 3) * 0.7 + f.cut[i] * 0.3;
    const semantic = f.availability.transcript ? Math.min(1, f.newConcepts[i] / DYNAMICS.conceptRef) : 0.4;
    novelty[i] = Math.min(1, 0.55 * perceptual + 0.45 * semantic);
    // Orienting responses (Lang 2000): cuts, audio onsets, product mentions decay over ~0.8 s.
    sal = Math.max(sal * decay, f.cut[i], f.audioOnset[i] * 0.8, f.product[i] * 0.9);
    salience[i] = sal;
    prod = Math.max(prod * prodDecay, f.product[i]);
    productPulse[i] = prod;
    // Information introduced per second relative to a reference capacity (Lang 2000).
    const speech = f.availability.transcript ? f.speechRate[i] / DYNAMICS.speechRef : 0.35;
    const concepts = f.availability.transcript ? f.newConcepts[i] / DYNAMICS.conceptRef : 0.3;
    load[i] = 0.5 * speech + 0.3 * concepts + 0.2 * v;
    progression[i] = f.availability.transcript ? Math.min(1, f.newConcepts[i] / DYNAMICS.conceptRef) : 0.5;
    payoffDistance[i] = open >= 0 ? Math.min(1, (i - open) / hz / DYNAMICS.payoffSaturation) : 0;
    sinceChange = v > DYNAMICS.staticThreshold || f.cut[i] > 0 ? 0 : sinceChange + dt;
    staticness[i] = Math.min(1, sinceChange / DYNAMICS.staticSaturation);
    // Habituation: builds when nothing new happens, recovers with novelty.
    hab += dt * ((1 - novelty[i]) * (1 - hab) / DYNAMICS.tauHabituation - (novelty[i] * hab) / DYNAMICS.tauRecovery);
    habituation[i] = Math.min(1, Math.max(0, hab));
    gazeConcentration[i] = 1 - f.gazeDispersion[i];
  }
  // Semantic progression: 2 s trailing smoothing.
  const w = 2 * hz;
  const p2 = new Float32Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += progression[i];
    if (i >= w) acc -= progression[i - w];
    p2[i] = acc / Math.min(i + 1, w);
  }
  return { novelty, salience, load, progression: p2, payoffDistance, staticness, habituation, gazeConcentration, productPulse };
}
