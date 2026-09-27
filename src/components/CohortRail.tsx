"use client";
import { useMemo, useState, createRef, type RefObject } from "react";
import { COHORTS } from "@/lib/cortex/params";
import { sampleAt } from "@/lib/cortex/simulate";
import { useLab } from "@/lib/state/store";
import { Tier } from "./Tier";
import { ReviewerStage } from "./reviewers/ReviewerStage";

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
        <Tier tier="heuristic" sources={["madsen2021", "fisher2020", "neurascopeHeuristics"]} context="Cohort regimes and mixture" />
      </div>
      <button
        data-testid="reviewer-all"
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
      <div className="relative">
        <ReviewerStage slots={slots} selected={cohort} />
        <ul className="grid grid-cols-2 gap-1.5">
          {COHORTS.map((c, i) => {
            const on = cohort === i;
            const impact = fr ? fr.cohorts.find((x) => x.cohort === c.id) : null;
            const data = run.sim.retentionByCohort[i];
            return (
              <li key={c.id}>
                <button
                  data-testid={`reviewer-${c.id}`}
                  aria-pressed={on}
                  onClick={() => set({ cohort: on ? null : i })}
                  className={`block w-full overflow-hidden rounded-md border text-left transition-colors ${on ? "border-line-2 bg-[#17181b]" : "border-line hover:border-line-2"}`}
                >
                  <div ref={slots[i]} className="m-[3px] h-[64px] rounded-[4px]" aria-hidden />
                  <div className="px-2 pt-1 pb-1.5">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className={`truncate text-[11px] ${on ? "text-fg" : "text-fg-2"}`}>{c.label}</span>
                      <span className="num text-[11.5px] text-fg">{Math.round(sampleAt(data, hz, time) * 100)}%</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-1">
                      <span className="truncate text-[9.5px] text-fg-3">
                        {impact ? <span className="text-fracture/90">−{Math.round(impact.lossShare * 100)}% across {fr!.id}</span> : `${Math.round((run.sim.cohortCounts[i] / run.sim.size) * 100)}% of audience`}
                      </span>
                      <span className={on ? "text-fg" : "text-fg-3"}>
                        <Spark data={data} cf={cf?.run.sim.retentionByCohort[i]} duration={d} time={time} fr={fr} W={44} H={12} />
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-1.5 text-[9px] tracking-[0.02em] text-fg-3" title="Head pose, gaze line, rim light and opacity encode each cohort's modeled attention, hazard, orienting, load and survival at the current time. No emotion is recognised or measured.">
        Synthetic behavioral expression · CORTEX visualization · not measured emotion
      </div>
    </div>
  );
}
