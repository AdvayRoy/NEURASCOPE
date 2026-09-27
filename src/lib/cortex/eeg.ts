import { GAZE_ISC } from "./params";
import { hashString, mulberry32 } from "./rng";

/** Synthetic EEG proxy envelopes. Tier C (model-derived from CORTEX attention/load); cited studies set directions and scale only. */
export interface EegEnvelopes {
  /** Posterior alpha proxy 0..1 (↑ with distraction; BBBD 2026, Ki et al. 2016). Population-level only. */
  alpha: Float32Array;
  /** Frontal theta proxy 0..1 (↑ with processing load; Jensen & Tesche 2002). */
  theta: Float32Array;
  /** Neural-reliability proxy on the gaze-ISC scale (Madsen 2021; Ki 2016). */
  isc: Float32Array;
}

export function eegEnvelopes(attention: Float32Array, load: Float32Array): EegEnvelopes {
  const n = attention.length;
  const alpha = new Float32Array(n);
  const theta = new Float32Array(n);
  const isc = new Float32Array(n);
  const { attentive: A, distracted: D } = GAZE_ISC;
  for (let k = 0; k < n; k++) {
    alpha[k] = Math.min(1, Math.max(0, 1 - attention[k]));
    theta[k] = Math.min(1, Math.max(0, load[k]));
    isc[k] = D.median + (A.median - D.median) * attention[k];
  }
  return { alpha, theta, isc };
}

export interface EegSynth {
  sample(t: number): number;
}

/**
 * Deterministic waveform synthesis for display. Amplitudes follow the CORTEX envelopes; phases are seeded.
 * This is a synthetic proxy, never a measured signal.
 */
export function eegSynth(env: EegEnvelopes, hz: number, channel: string): EegSynth {
  const rng = mulberry32(hashString(channel));
  const bg = Array.from({ length: 7 }, (_, i) => ({ f: 1.3 + i * 2.9 + rng(), p: rng() * 6.283, a: 0.18 / (1 + i * 0.6) }));
  const pa = rng() * 6.283;
  const pt = rng() * 6.283;
  const at = (a: Float32Array, t: number) => {
    const x = Math.max(0, Math.min(a.length - 1.001, t * hz));
    const i = Math.floor(x);
    return a[i] + (a[i + 1] - a[i]) * (x - i);
  };
  return {
    sample(t: number) {
      const alpha = at(env.alpha, t);
      const theta = at(env.theta, t);
      let v = 0.9 * (0.25 + alpha) * Math.sin(6.283 * 10.1 * t + pa + 0.6 * Math.sin(0.7 * t));
      v += 0.8 * (0.2 + theta) * Math.sin(6.283 * 5.9 * t + pt + 0.5 * Math.sin(0.43 * t));
      for (const b of bg) v += b.a * Math.sin(6.283 * b.f * t + b.p);
      return v / 2.2;
    },
  };
}
