import type { Counterfactual, CortexRun } from "../cortex";
import { COHORTS } from "../cortex/params";
import { sampleAt } from "../cortex/simulate";
import type { Fracture } from "../cortex/fractures";
import { SOURCES } from "../evidence/sources";

export type AnalystAction =
  | { kind: "select-fracture"; id: string }
  | { kind: "select-cohort"; index: number | null }
  | { kind: "open-evidence"; sourceIds: string[]; context: string }
  | { kind: "simulate"; interventionId: string };

export interface AnalystAnswer {
  text: string;
  actions: AnalystAction[];
  provider: "deterministic" | "anthropic" | "openai";
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const s1 = (t: number) => `${t.toFixed(1)} s`;

export function describeFracture(fr: Fracture): string {
  const drivers = fr.drivers.map((d) => `${d.label.toLowerCase()} ${d.direction === "up" ? "rising" : "falling"}`).join(", ");
  const top = fr.cohorts[0];
  const cohort = COHORTS.find((c) => c.id === top.cohort)!;
  const payoff = fr.observed.payoff.status === "unresolved" ? " The opening promise is still unresolved." : "";
  return `The model predicts elevated disengagement at ${s1(fr.start)}–${s1(fr.end)} (hazard +${fr.hazardExcess.toFixed(2)}/s over baseline, ${fr.lossPts.toFixed(1)} survival pts in excess). Mechanism: ${drivers}. ${cohort.label}s are most affected, losing ${pct(top.lossShare)} of those still watching.${payoff}`;
}

/** Compact structured context for an optional LLM analyst. */
export function analystContext(run: CortexRun, fractureId: string | null, cohort: number | null, t: number) {
  const fr = run.fractures.find((f) => f.id === fractureId);
  return {
    duration: run.timeline.duration,
    time: t,
    cohortFocus: cohort === null ? "all" : COHORTS[cohort].label,
    retentionEnd: run.sim.retention[run.sim.n - 1],
    retentionByCohortEnd: Object.fromEntries(COHORTS.map((c, i) => [c.label, run.sim.retentionByCohort[i][run.sim.n - 1]])),
    fractures: run.fractures.map((f) => ({ id: f.id, start: f.start, end: f.end, lossPts: f.lossPts, drivers: f.drivers.map((d) => ({ label: d.label, direction: d.direction, tier: d.tier })), mostAffected: f.cohorts.slice(0, 2), observed: f.observed })),
    selected: fr?.id ?? null,
    interventions: run.interventions.map((i) => ({ id: i.id, fracture: i.fractureId, title: i.title, instruction: i.instruction })),
    availability: run.timeline.availability,
    sources: Object.values(SOURCES).map((s) => ({ id: s.id, short: s.short, tier: s.tier, usage: s.usage })),
  };
}

/** Deterministic analyst: answers common questions directly from CORTEX state. */
export function deterministicAnswer(q: string, run: CortexRun, ctx: { fractureId: string | null; cohort: number | null; time: number; counterfactuals: Record<string, Counterfactual> }): AnalystAnswer {
  const query = q.toLowerCase();
  const fr = run.fractures.find((f) => f.id === ctx.fractureId) ?? null;
  const worst = run.fractures.slice().sort((a, b) => b.lossPts - a.lossPts)[0] ?? null;
  const cohortIdx = COHORTS.findIndex((c) => query.includes(c.label.toLowerCase().split(" ")[0].toLowerCase()) || query.includes(c.id));
  const ans = (text: string, actions: AnalystAction[] = []): AnalystAnswer => ({ text, actions, provider: "deterministic" });

  if (/evidence|source|citation|study|why should i (trust|believe)|proof/.test(query)) {
    const ids = fr ? fr.sources : ["ki2016", "madsen2021", "cohen2017", "bbbd2026"];
    return ans(
      `This ${fr ? "fracture" : "analysis"} rests on ${ids.map((i) => SOURCES[i]?.short).filter(Boolean).join(", ")}. Those studies calibrate the mechanisms; the displayed numbers are CORTEX outputs (Tier C, model-derived), not measurements. Survival-link parameters, cohort weights and cue lexicons are Tier D heuristics. No participant-level BBBD recordings are used.`,
      [{ kind: "open-evidence", sourceIds: ids, context: fr ? `Fracture ${fr.id}` : "Analysis" }],
    );
  }
  if (/upside|best|highest|biggest|fix first|priorit|most important/.test(query)) {
    const done = Object.values(ctx.counterfactuals).sort((a, b) => b.deltaPts - a.deltaPts);
    if (done.length) {
      const b = done[0];
      return ans(`Of the patches simulated so far, “${b.intervention.title}” has the largest predicted effect: ${b.deltaPts >= 0 ? "+" : ""}${b.deltaPts.toFixed(1)} pts at ${s1(b.evalAt)} (counterfactual prediction).`, [
        { kind: "select-fracture", id: b.intervention.fractureId },
      ]);
    }
    if (!worst) return ans("The model found no fracture with an interpretable mechanism in this video.");
    const iv = run.interventions.find((i) => i.fractureId === worst.id);
    return ans(`Start with ${worst.id} at ${s1(worst.start)}: it costs the most survival (${worst.lossPts.toFixed(1)} pts). ${iv ? `Simulate “${iv.title}” to see the predicted change.` : ""}`, [
      { kind: "select-fracture", id: worst.id },
      ...(iv ? [{ kind: "simulate" as const, interventionId: iv.id }] : []),
    ]);
  }
  if (cohortIdx >= 0 || /cohort|audience|viewer/.test(query)) {
    const i = cohortIdx >= 0 ? cohortIdx : ctx.cohort ?? 0;
    const c = COHORTS[i];
    const end = run.sim.retentionByCohort[i][run.sim.n - 1];
    const hardest = run.fractures.slice().sort((a, b) => (b.cohorts.find((x) => x.cohort === c.id)?.lossShare ?? 0) - (a.cohorts.find((x) => x.cohort === c.id)?.lossShare ?? 0))[0];
    return ans(
      `${c.label} (${c.regime.toLowerCase()}): predicted ${pct(end)} reach the end versus ${pct(run.sim.retention[run.sim.n - 1])} overall.${hardest ? ` Their largest loss is ${hardest.id} at ${s1(hardest.start)}.` : ""} ${c.description}`,
      [{ kind: "select-cohort", index: i }, ...(hardest ? [{ kind: "select-fracture" as const, id: hardest.id }] : [])],
    );
  }
  if (/why|what happen|explain|drop|lose|leave/.test(query)) {
    const target = fr ?? worst;
    if (!target) return ans("The model found no fracture with an interpretable mechanism in this video.");
    return ans(describeFracture(target), [{ kind: "select-fracture", id: target.id }]);
  }
  if (/eeg|neural|brain|alpha|theta/.test(query)) {
    return ans(
      `The EEG strip is a synthetic proxy: alpha rises as modeled attention falls (BBBD 2026; Ki et al. 2016), theta rises with processing load (Jensen & Tesche 2002), and the reliability trace maps attention onto the gaze-ISC scale (Madsen et al. 2021). At ${s1(ctx.time)} the reliability proxy is ${sampleAt(run.eeg.isc, run.sim.hz, ctx.time).toFixed(2)}. It is model-derived (Tier C); nothing here was measured from viewers.`,
      [{ kind: "open-evidence", sourceIds: ["bbbd2026", "ki2016", "jensen2002", "madsen2021"], context: "Synthetic EEG proxy" }],
    );
  }
  return ans(
    `Ask about a fracture (“why do people drop here?”), a cohort (“what loses Cold Scrollers?”), the evidence behind a number, or which patch has the highest upside. Predicted end retention: ${pct(run.sim.retention[run.sim.n - 1])}; ${run.fractures.length} fractures found.`,
  );
}
