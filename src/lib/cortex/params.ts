/**
 * Every tunable CORTEX assumption lives here.
 * Values marked HEURISTIC are Tier D: chosen to express cited mechanisms, not fitted to retention data.
 */

export const SIM_HZ = 10;
export const DEFAULT_POPULATION = 10_000;
export const DEFAULT_SEED = 20260926;

/** Madsen et al. 2021 (PNAS): gaze ISC median/IQR, normal vs distracted viewing. Tier B. */
export const GAZE_ISC = {
  attentive: { median: 0.35, iqr: 0.12 },
  distracted: { median: 0.12, iqr: 0.18 },
} as const;
export const IQR_TO_SIGMA = 1 / 1.349;

export type CohortId = "cold" | "intent" | "visual" | "enthusiast";

export interface CohortSpec {
  id: CohortId;
  label: string;
  regime: string;
  description: string;
  /** Probability a viewer of this cohort is in the distracted regime (Madsen 2021 distributions). HEURISTIC. */
  pDistracted: number;
  /** Relative strength of the opening-window swipe hazard. HEURISTIC (direction: Tong et al. 2020). */
  hook: number;
  /** Sensitivities of the attention target to each driver. HEURISTIC. */
  w: { novelty: number; salience: number; progression: number; load: number; fatigue: number; payoff: number; static: number };
  /** Processing capacity before load penalizes attention (Lang 2000). HEURISTIC. */
  capacity: number;
  /** Motivational relevance of the category (Fisher & Weber 2020). HEURISTIC. */
  relevance: number;
  /** Extra attention on product/entity events. HEURISTIC. */
  productAffinity: number;
}

export const COHORTS: CohortSpec[] = [
  {
    id: "cold",
    label: "Cold Scroller",
    regime: "Low prior intent, fast swipe",
    description: "Arrives from a feed with no intent. Leaves quickly when the opening or pacing does not earn attention.",
    pDistracted: 0.62,
    hook: 1.0,
    w: { novelty: 1.3, salience: 1.1, progression: 0.6, load: 1.3, fatigue: 1.2, payoff: 1.2, static: 1.3 },
    capacity: 0.62,
    relevance: 0.35,
    productAffinity: 0.1,
  },
  {
    id: "intent",
    label: "Intent Viewer",
    regime: "Goal-directed, tolerant of exposition",
    description: "Came for the information. Tolerates explanation, penalizes stalled progression more than static visuals.",
    pDistracted: 0.2,
    hook: 0.35,
    w: { novelty: 0.6, salience: 0.5, progression: 1.4, load: 0.7, fatigue: 0.7, payoff: 0.7, static: 0.45 },
    capacity: 0.95,
    relevance: 0.9,
    productAffinity: 0.35,
  },
  {
    id: "visual",
    label: "Visual-First Viewer",
    regime: "Attention tracks visual change",
    description: "Watches with sound low or off. Sensitive to static frames and dense speech.",
    pDistracted: 0.45,
    hook: 0.75,
    w: { novelty: 1.6, salience: 1.3, progression: 0.35, load: 1.5, fatigue: 1.0, payoff: 0.8, static: 1.8 },
    capacity: 0.5,
    relevance: 0.5,
    productAffinity: 0.2,
  },
  {
    id: "enthusiast",
    label: "Category Enthusiast",
    regime: "High relevance, payoff-seeking",
    description: "Already cares about the category. Stays for proof and the product, drops when the payoff is withheld.",
    pDistracted: 0.25,
    hook: 0.45,
    w: { novelty: 0.8, salience: 0.7, progression: 1.1, load: 0.8, fatigue: 0.8, payoff: 1.4, static: 0.7 },
    capacity: 0.85,
    relevance: 1.0,
    productAffinity: 0.8,
  },
];

export type AudienceContextId = "feed" | "category" | "warm";

export const AUDIENCE_CONTEXTS: Record<AudienceContextId, { label: string; mix: Record<CohortId, number> }> = {
  feed: { label: "Broad feed", mix: { cold: 0.46, intent: 0.14, visual: 0.28, enthusiast: 0.12 } },
  category: { label: "Category audience", mix: { cold: 0.25, intent: 0.25, visual: 0.2, enthusiast: 0.3 } },
  warm: { label: "Warm / retargeted", mix: { cold: 0.12, intent: 0.38, visual: 0.15, enthusiast: 0.35 } },
};

/** Viewer-level parameter jitter (lognormal σ). HEURISTIC. */
export const VIEWER_JITTER = 0.25;

/** Attention dynamics and hazard link. HEURISTIC. */
export const DYNAMICS = {
  /** Attention time constant (s). */
  tauAttention: 0.7,
  /** Habituation build-up / recovery time constants (s). */
  tauHabituation: 9,
  tauRecovery: 1.6,
  /** Hazard: λ(t) = λmax · σ(β0 + βa·(1 − a) + βhook·hook·e^(−t/τhook)), per second. */
  lambdaMax: 1.1,
  beta0: -5.4,
  betaAttention: 5.2,
  betaHook: 3.6,
  tauHook: 1.1,
  /** Opening window excluded from fracture detection (s). */
  hookWindow: 2.0,
  /** Seconds of unresolved open loop that saturate the payoff-distance driver. */
  payoffSaturation: 7,
  /** Seconds without visual change that saturate the static driver. */
  staticSaturation: 4,
  /** Visual change below this is treated as static. */
  staticThreshold: 0.12,
  /** Speech rate (words/s) mapped to load 1.0 together with concepts and visuals. */
  speechRef: 3.4,
  conceptRef: 1.4,
};

/** Fracture detection thresholds. HEURISTIC. */
export const FRACTURE = {
  baselineWindow: 3.0,
  minAbsExcess: 0.03,
  minRelExcess: 0.3,
  minDuration: 0.3,
  mergeGap: 0.5,
  minLossPts: 0.4,
  maxFractures: 5,
  driverThreshold: 0.06,
};

/** Transcript cue lexicons for semantic event detection. HEURISTIC. */
export const CUES = {
  openLoop:
    /\?|\b(here'?s (why|how|what)|wait (for|till|until)|watch (this|till|until)|the (secret|reason|trick)|nobody (tells|talks)|you won'?t believe|i (tried|tested)|what happens|guess what|let me show)\b/i,
  payoff:
    /\b(that'?s why|the (result|answer|reason is|difference)|turns out|here it is|so (now|basically)|which means|and it (works|worked)|finally|the verdict|look at (this|that)|see (the|how))\b/i,
  cta: /\b(link in (my )?bio|follow (for|me)|comment|shop now|buy|use code|tap|save this|subscribe|order)\b/i,
};

export const STOPWORDS = new Set(
  "a an and are as at be been but by can could did do does doing for from had has have having he her here hers him his how i if in into is it its just like me my no not now of off on once only or other our out over own really so some such than that the their them then there these they this those through to too up very was we were what when where which while who why will with would you your yours yeah okay ok gonna got get go going know thing things one also actually right well oh um uh".split(
    " ",
  ),
);
