"use client";
import { useMemo } from "react";
import { COHORTS } from "@/lib/cortex/params";
import { sampleAt } from "@/lib/cortex/simulate";
import { useLab } from "@/lib/state/store";
import { Tier } from "./Tier";

function Spark({ data, cf, duration, time, fr }: { data: Float32Array; cf?: Float32Array; duration: number; time: number; fr?: { start: number; end: number } }) {
  const W = 88;
  const H = 26;
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
  const fr = run.fractures.find((f) => f.id === fractureId);
  const d = run.timeline.duration;
  const rows = [{ idx: null as number | null, label: "All viewers", regime: `${run.sim.size.toLocaleString()} seeded viewers`, data: run.sim.retention, cfd: cf?.run.sim.retention, share: 1 }].concat(
    COHORTS.map((c, i) => ({ idx: i, label: c.label, regime: c.regime, data: run.sim.retentionByCohort[i], cfd: cf?.run.sim.retentionByCohort[i], share: run.sim.cohortCounts[i] / run.sim.size })),
  );
  return (
    <div className="border-b border-line px-4 pt-3 pb-2">
      <div className="label mb-2 flex items-center justify-between">
        <span>Synthetic cohorts</span>
        <Tier tier="heuristic" sources={["madsen2021", "fisher2020", "neurascopeHeuristics"]} context="Cohort regimes and mixture" />
      </div>
      <ul>
        {rows.map((r) => {
          const on = cohort === r.idx;
          const impact = fr && r.idx !== null ? fr.cohorts.find((c) => c.cohort === COHORTS[r.idx!].id) : null;
          return (
            <li key={r.label}>
              <button
                onClick={() => set({ cohort: r.idx })}
                className={`flex w-full items-center gap-3 rounded-md px-2 py-[5px] text-left transition-colors ${on ? "bg-fg/[0.06]" : "hover:bg-fg/[0.03]"}`}
              >
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-[12px] ${on ? "text-fg" : "text-fg-2"}`}>{r.label}</div>
                  <div className="truncate text-[10px] text-fg-3">
                    {impact ? <span className="text-fracture/90">−{Math.round(impact.lossShare * 100)}% across {fr!.id}</span> : r.idx === null ? r.regime : `${Math.round(r.share * 100)}% of audience`}
                  </div>
                </div>
                <span className={on ? "text-fg" : "text-fg-3"}>
                  <Spark data={r.data} cf={r.cfd} duration={d} time={time} fr={fr} />
                </span>
                <span className="num w-9 text-right text-[12px] text-fg">{Math.round(sampleAt(r.data, run.sim.hz, time) * 100)}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
