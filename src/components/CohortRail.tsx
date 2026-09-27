"use client";
import { useMemo, useState, createRef, type RefObject } from "react";
import { COHORTS } from "@/lib/cortex/params";
import { sampleAt } from "@/lib/cortex/simulate";
import { useLab } from "@/lib/state/store";
import { Tier } from "./Tier";
import { ReviewerStage } from "./reviewers/ReviewerStage";
import { REVIEWER_ACCENT } from "./reviewers/rig";
import { GlBoundary } from "./GlBoundary";

function Spark({ data, cf, duration, time, fr, W = 88, H = 26 }: { data: Float32Array; cf?: Float32Array; duration: number; time: number; fr?: { start: number; end: number }; W?: number; H?: number }) {
  const path = (a: Float32Array, d: number) => {
    let s = "";
    const step = Math.max(1, Math.floor(a.length / 60));
    for (let i = 0; i < a.length; i += step) s += `${i ? "L" : "M"}${((i / (a.length - 1)) * (d / duration) * W).toFixed(1)},${((1 - a[i]) * H).toFixed(1)}`;
    return s;
  };
  const p = useMemo(() => path(data, duration), [data, duration]); // eslint-disable-line react-hooks/exhaustive-deps
  const pc = useMemo(() => (cf ? path(cf, (cf.length / data.length) * duration) : null), [cf, data, duration]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <svg width={W} height={H} className="overflow-visible">
      {fr && <rect x={(fr.start / duration) * W} width={Math.max(1.5, ((fr.end - fr.start) / duration) * W)} y={0} height={H} fill="rgba(255,122,69,0.16)" />}
      <path d={p} fill="none" stroke="currentColor" strokeWidth={1.1} />
      {pc && <path d={pc} fill="none" stroke="var(--color-cf)" strokeWidth={1} strokeDasharray="2 2" />}
      <line x1={(time / duration) * W} x2={(time / duration) * W} y1={0} y2={H} stroke="rgba(236,234,228,0.35)" />
    </svg>
  );
}

export function CohortRail() {
  const run = useLab((s) => s.run)!;
  const cohort = useLab((s) => s.cohort);
  const time = useLab((s) => s.time);
  const fractureId = useLab((s) => s.fractureId);
  const cf = useLab((s) => (s.activeCf ? s.counterfactuals[s.activeCf] : null));
  const set = useLab((s) => s.set);
  const [slots] = useState<RefObject<HTMLDivElement | null>[]>(() => COHORTS.map(() => createRef<HTMLDivElement>()));
  const fr = run.fractures.find((f) => f.id === fractureId);
  const d = run.timeline.duration;
  const hz = run.sim.hz;
  const allOn = cohort === null;
  return (
    <div className="border-b border-line px-4 pt-3 pb-2.5">
      <div className="label mb-2 flex items-center justify-between">
        <span>Synthetic reviewers</span>
        <span className="flex items-center gap-1">
          <Tier tier="derived" sources={["cohen2017", "tong2020", "neurascopeHeuristics"]} context="Per-cohort survival, fracture loss share and sparklines · CORTEX simulation" />
          <Tier tier="heuristic" sources={["madsen2021", "fisher2020", "neurascopeHeuristics"]} context="Cohort regimes and mixture weights" />
        </span>
      </div>
      <button
        data-testid="reviewer-all"
        aria-pressed={allOn}
        onClick={() => set({ cohort: null })}
        className={`mb-1.5 flex w-full items-center gap-3 rounded-md px-2 py-[3px] text-left transition-colors ${allOn ? "bg-fg/[0.06]" : "hover:bg-fg/[0.03]"}`}
      >
        <div className="min-w-0 flex-1 truncate text-[11.5px]">
          <span className={allOn ? "text-fg" : "text-fg-2"}>All viewers</span>
          <span className="ml-2 text-[10px] text-fg-3">{run.sim.size.toLocaleString()} seeded</span>
        </div>
        <span className={allOn ? "text-fg" : "text-fg-3"}>
          <Spark data={run.sim.retention} cf={cf?.run.sim.retention} duration={d} time={time} fr={fr} W={64} H={16} />
        </span>
        <span className="num w-9 text-right text-[12px] text-fg">{Math.round(sampleAt(run.sim.retention, hz, time) * 100)}%</span>
      </button>
      <div className="relative overflow-hidden rounded-lg border border-line bg-[#0f1013]">
        <GlBoundary>
          <ReviewerStage slots={slots} />
        </GlBoundary>
        <ul className="divide-y divide-line/70">
          {COHORTS.map((c, i) => {
            const on = cohort === i;
            const impact = fr ? fr.cohorts.find((x) => x.cohort === c.id) : null;
            const data = run.sim.retentionByCohort[i];
            return (
              <li key={c.id}>
                <button
                  data-testid={`reviewer-${c.id}`}
                  data-reviewer-row={c.id}
                  aria-pressed={on}
                  onClick={() => set({ cohort: on ? null : i })}
                  className={`relative grid h-[78px] w-full grid-cols-[88px_minmax(0,1fr)] items-stretch text-left transition-colors ${on ? "bg-fg/[0.055]" : "hover:bg-fg/[0.025]"}`}
                >
                  <span className="absolute inset-y-2 left-0 w-[2px] rounded-r" style={{ background: REVIEWER_ACCENT[c.id], opacity: on ? 1 : 0.55 }} aria-hidden />
                  <div ref={slots[i]} data-reviewer-anchor={c.id} className="h-full w-full" style={{ background: `radial-gradient(circle at 50% 48%, ${REVIEWER_ACCENT[c.id]}${on ? "26" : "14"}, transparent 68%)` }} aria-hidden />
                  <div className="flex min-w-0 flex-col justify-center gap-[3px] py-1.5 pr-3 pl-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`text-[12px] leading-tight whitespace-nowrap ${on ? "text-fg" : "text-fg-2"}`}>{c.label}</span>
                      <span className="num text-[12px] text-fg">{Math.round(sampleAt(data, hz, time) * 100)}%</span>
                    </div>
                    <div className="text-[10px] leading-tight text-fg-3">
                      {impact ? <span className="text-fracture/90">−{Math.round(impact.lossShare * 100)}% across {fr!.id}</span> : `${Math.round((run.sim.cohortCounts[i] / run.sim.size) * 100)}% of audience`}
                    </div>
                    <span className={on ? "text-fg" : "text-fg-3"}>
                      <Spark data={data} cf={cf?.run.sim.retentionByCohort[i]} duration={d} time={time} fr={fr} W={150} H={12} />
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-1.5 text-[9px] tracking-[0.02em] text-fg-3" title="Head orientation, gaze, eye aperture, blink rate, brow tension, posture and presence encode each cohort's modeled attention, hazard, orienting, load, fracture impact and survival at the current time. Breathing, blinks and small eye movements are a seeded idle layer. Lines from the brain are a CORTEX state projection: model coupling, not a biological signal. No emotion is recognised or measured.">
        Synthetic behavioral expression · CORTEX visualization · not measured emotion
      </div>
    </div>
  );
}
