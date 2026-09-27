import type { ReviewerState } from "./reviewerState";

/** CORTEX-driven behavioural targets for one reviewer rig. Pure function of the cohort state; no randomness. */
export interface ReviewerBehavior {
  /** Head yaw, radians. Negative = oriented toward the content (screen left), positive = turned away. */
  yaw: number;
  /** Head pitch, radians. Positive = head drops. */
  pitch: number;
  /** Torso pitch, radians. Negative = leaning forward into the content. */
  lean: number;
  /** Eyelid aperture, 1 = neutral open. */
  eyeOpen: number;
  /** Mean gaze direction in the eye socket, −1..1. */
  gazeX: number;
  gazeY: number;
  /** Saccade amplitude multiplier for the idle layer (gaze stability ↓ as attention ↓). */
  wander: number;
  /** Amplitude (radians) of slow head drift added by the idle layer; grows as attention falls. */
  drift: number;
  /** Blink-rate multiplier for the idle layer. */
  blinkRate: number;
  /** Brow lowering / narrowing from load above capacity, 0..1. */
  browTension: number;
  /** Brief brow lift on an orienting onset, 0..1. */
  browRaise: number;
  /** Closed-mouth smile shape, 0..1: sustained engagement; flattens as the cohort disengages. */
  smile: number;
  /** Material presence (brightness), from survival. */
  presence: number;
  /** Combined withdrawal + fracture drive, 0..1. */
  disengage: number;
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export function reviewerBehavior(r: ReviewerState): ReviewerBehavior {
  const disengage = clamp(0.65 * r.withdrawal + 0.8 * r.fracture, 0, 1);
  return {
    yaw: -0.24 + 0.85 * disengage - 0.08 * r.orientingOnset,
    pitch: -0.02 + 0.22 * disengage - 0.08 * r.orientingOnset - 0.05 * r.tension,
    lean: -0.08 * r.attention + 0.1 * disengage - 0.04 * r.tension,
    eyeOpen: clamp(0.72 + 0.28 * r.attention - 0.3 * disengage + 0.2 * r.orientingOnset, 0.35, 1.08),
    gazeX: -0.75 * (1 - disengage) + 0.55 * disengage - 0.5 * r.orientingOnset,
    gazeY: -0.55 * disengage + 0.35 * r.orientingOnset,
    wander: 0.15 + 0.85 * (1 - r.attention),
    drift: 0.1 * (1 - r.attention),
    blinkRate: 0.8 + 1.4 * (1 - r.attention),
    browTension: r.tension,
    browRaise: r.orientingOnset,
    smile: clamp(0.4 + 0.75 * r.attention - 1.4 * disengage, 0, 1),
    presence: 0.7 + 0.3 * r.survival,
    disengage,
  };
}
