import type { FeatureTimeline } from "./features";
import { cloneTimeline } from "./features";
import type { DriverKey, Fracture } from "./fractures";

export type InterventionOp =
  | { kind: "insert-visual-change"; start: number; end: number; every: number; strength: number }
  | { kind: "reduce-speech"; start: number; end: number; factor: number }
  | { kind: "compress"; start: number; end: number; remove: number }
  | { kind: "move-payoff"; to: number; from: number | null };

export interface Intervention {
  id: string;
  fractureId: string;
  title: string;
  instruction: string;
  mechanism: string;
  addresses: DriverKey[];
  op: InterventionOp;
}

const fmt = (t: number) => `${t.toFixed(1)} s`;

export function proposeInterventions(fr: Fracture, f: FeatureTimeline): Intervention[] {
  const out: Intervention[] = [];
  const keys = new Set(fr.drivers.map((d) => d.key));
  const w0 = Math.max(0, fr.start - 0.6);
  const w1 = Math.min(f.duration, fr.end + 0.4);
  if (keys.has("static") || keys.has("novelty") || keys.has("habituation") || keys.has("salience")) {
    out.push({
      id: `${fr.id}-visual`,
      fractureId: fr.id,
      title: "Break the static frame",
      instruction: `Cut to a new shot, B-roll or on-screen proof every ~1.5 s between ${fmt(w0)} and ${fmt(w1)}.`,
      mechanism: "Adds orienting events and perceptual novelty; resets the static-visual and habituation terms.",
      addresses: ["static", "novelty", "habituation", "salience"],
      op: { kind: "insert-visual-change", start: w0, end: w1, every: 1.5, strength: 0.7 },
    });
  }
  if (keys.has("load")) {
    out.push({
      id: `${fr.id}-speech`,
      fractureId: fr.id,
      title: "Split the dense line",
      instruction: `Rewrite ${fmt(fr.start)}–${fmt(fr.end)} with ~30% fewer words, keeping the same claims.`,
      mechanism: "Lowers information introduced per second below viewer capacity without removing semantic progression.",
      addresses: ["load"],
      op: { kind: "reduce-speech", start: w0, end: w1, factor: 0.7 },
    });
  }
  if (keys.has("progression") || keys.has("habituation")) {
    const remove = Math.min(2.5, Math.max(0.6, (fr.end - fr.start) * 0.6 + 0.6));
    out.push({
      id: `${fr.id}-compress`,
      fractureId: fr.id,
      title: "Tighten the exposition",
      instruction: `Remove ~${remove.toFixed(1)} s of setup around ${fmt(fr.start)} so the next new idea lands sooner.`,
      mechanism: "Shortens the low-progression stretch; later events move earlier in the timeline.",
      addresses: ["progression", "habituation"],
      op: { kind: "compress", start: Math.max(0, fr.start - 0.3), end: Math.max(0, fr.start - 0.3) + remove, remove },
    });
  }
  if (keys.has("payoff")) {
    const next = f.events.find((e) => (e.kind === "payoff" || e.kind === "product") && e.t > fr.start);
    out.push({
      id: `${fr.id}-payoff`,
      fractureId: fr.id,
      title: next ? "Pull the payoff forward" : "Resolve the open loop",
      instruction: next
        ? `Move the ${next.kind === "product" ? "product reveal" : "payoff"} from ${fmt(next.t)} to ~${fmt(Math.max(0, fr.start - 0.5))}.`
        : `Answer the opening promise by ~${fmt(Math.max(0, fr.start - 0.5))}; the model found no payoff line after it.`,
      mechanism: "Closes the open loop earlier, removing the unresolved-payoff penalty.",
      addresses: ["payoff"],
      op: { kind: "move-payoff", to: Math.max(0, fr.start - 0.5), from: next ? next.t : null },
    });
  }
  return out;
}

/** Applies an intervention to a copy of the feature timeline. The source media is not edited. */
export function applyIntervention(f0: FeatureTimeline, op: InterventionOp): FeatureTimeline {
  const f = cloneTimeline(f0);
  const hz = f.hz;
  const idx = (t: number) => Math.min(f.n - 1, Math.max(0, Math.round(t * hz)));
  switch (op.kind) {
    case "insert-visual-change": {
      for (let t = op.start; t < op.end; t += op.every) {
        const k = idx(t);
        f.cut[k] = 1;
        for (let j = k; j < Math.min(f.n, k + Math.round(0.4 * hz)); j++) f.visualChange[j] = Math.max(f.visualChange[j], op.strength);
        f.events.push({ id: `cf-cut-${k}`, kind: "cut", t: k / hz, label: "Counterfactual cut", detector: "intervention", tier: "heuristic" });
      }
      break;
    }
    case "reduce-speech": {
      for (let k = idx(op.start); k <= idx(op.end); k++) f.speechRate[k] *= op.factor;
      break;
    }
    case "compress": {
      const a = idx(op.start);
      const b = idx(op.end);
      const cut = b - a;
      if (cut <= 0 || f.n - cut < 2) break;
      const arrays: (keyof FeatureTimeline)[] = ["visualChange", "cut", "audioOnset", "speechRate", "newConcepts", "product", "gazeDispersion"];
      for (const key of arrays) {
        const src = f[key] as Float32Array;
        const dst = new Float32Array(f.n - cut);
        dst.set(src.subarray(0, a), 0);
        dst.set(src.subarray(b), a);
        (f[key] as Float32Array) = dst;
      }
      f.cut[a] = 1;
      f.n -= cut;
      f.duration = f.n / hz;
      f.events = f.events
        .filter((e) => e.t < op.start || e.t >= op.end)
        .map((e) => (e.t >= op.end ? { ...e, t: e.t - cut / hz, end: e.end !== undefined ? e.end - cut / hz : undefined } : e));
      break;
    }
    case "move-payoff": {
      if (op.from !== null) {
        const from = op.from;
        const ev = f.events.find((e) => (e.kind === "payoff" || e.kind === "product") && Math.abs(e.t - from) < 0.05);
        if (ev) {
          if (ev.kind === "product") {
            f.product[idx(from)] = 0;
            f.product[idx(op.to)] = 1;
          }
          ev.t = op.to;
        }
      } else {
        f.events.push({ id: "cf-payoff", kind: "payoff", t: op.to, label: "Counterfactual payoff line", detector: "intervention", tier: "heuristic" });
      }
      f.events.sort((x, y) => x.t - y.t);
      break;
    }
  }
  return f;
}
