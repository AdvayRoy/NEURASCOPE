"use client";
import { readouts } from "@/lib/cortex";
import { useLab } from "@/lib/state/store";
import { Tier } from "./Tier";

const LABELS: Record<string, [string, (v: number) => string]> = {
  attention: ["Attention", (v) => `${Math.round(v * 100)}`],
  load: ["Load / capacity", (v) => `${Math.round(v * 100)}%`],
  reliability: ["Gaze-sync proxy", (v) => v.toFixed(2)],
  survival: ["Predicted survival", (v) => `${Math.round(v * 100)}%`],
};

export function Metrics() {
  const run = useLab((s) => s.run);
  const cf = useLab((s) => (s.activeCf ? s.counterfactuals[s.activeCf] : null));
  const time = useLab((s) => s.time);
  const cohort = useLab((s) => s.cohort);
  if (!run) return null;
  const r = readouts(cf?.run ?? run, time, cohort);
  return (
    <div className="pointer-events-auto relative flex gap-5">
      {Object.entries(r).map(([k, v]) => (
        <div key={k} className="min-w-[78px]">
          <div className="label flex items-center gap-1.5">
            {LABELS[k][0]} <Tier tier={v.tier} sources={v.sources} context={`${LABELS[k][0]} · ${v.method}`} />
          </div>
          <div className="num mt-1 text-[22px] font-light leading-none text-fg">{LABELS[k][1](v.value)}</div>
        </div>
      ))}
      {cf && <div className="absolute top-full left-0 mt-2 font-mono text-[9.5px] tracking-[0.12em] text-cf">COUNTERFACTUAL · {cf.intervention.title}</div>}
    </div>
  );
}
