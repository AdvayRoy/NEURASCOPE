"use client";
import { describeFracture } from "@/lib/analyst/analyst";
import { COHORTS } from "@/lib/cortex/params";
import { sampleAt } from "@/lib/cortex/simulate";
import { simulatePatch } from "@/lib/state/pipeline";
import { useLab } from "@/lib/state/store";
import type { EvidenceTier } from "@/lib/evidence/provenance";
import { CorpusEvidenceSection } from "./CorpusEvidence";
import { Tier } from "./Tier";

function FractureView() {
  const run = useLab((s) => s.run)!;
  const fractureId = useLab((s) => s.fractureId)!;
  const cfs = useLab((s) => s.counterfactuals);
  const activeCf = useLab((s) => s.activeCf);
  const pending = useLab((s) => s.cfPending);
  const set = useLab((s) => s.set);
  const fr = run.fractures.find((f) => f.id === fractureId)!;
  const ivs = run.interventions.filter((i) => i.fractureId === fr.id);
  const o = fr.observed;
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.14em] text-fracture">ATTENTION FRACTURE {fr.id}</span>
          <button onClick={() => set({ fractureId: null, activeCf: null })} className="text-[11px] text-fg-3 hover:text-fg" aria-label="Close fracture">
            Close
          </button>
        </div>
        <div className="num mt-1.5 text-[20px] font-light text-fg">
          {fr.start.toFixed(2)}–{fr.end.toFixed(2)} s
        </div>
        <p className="mt-2 text-[12px] leading-[1.6] text-fg-2">{describeFracture(fr)}</p>
      </div>

      <div>
        <div className="label mb-2">Mechanism</div>
        <ul className="space-y-1.5">
          {fr.drivers.map((d) => (
            <li key={d.key} className="flex items-center gap-2 text-[12px]">
              <Tier tier={d.tier} sources={d.sources} context={`${fr.id} · ${d.label}`} />
              <span className="flex-1 text-fg-2">
                {d.label} <span className="text-fg-3">{d.direction === "up" ? "↑" : "↓"}</span>
              </span>
              <span className="h-[3px] w-16 overflow-hidden rounded bg-line">
                <span className="block h-full bg-fracture/80" style={{ width: `${Math.min(100, (d.contribution / fr.drivers[0].contribution) * 100)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="label mb-2">Observed in source</div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px]">
          <dt className="text-fg-3">Static before window</dt>
          <dd className="num text-right text-fg-2">{o.staticSeconds.toFixed(1)} s</dd>
          <dt className="text-fg-3">Words since last cut</dt>
          <dd className="num text-right text-fg-2">{o.wordsSinceCut}</dd>
          <dt className="text-fg-3">New concepts in window</dt>
          <dd className="num text-right text-fg-2">{o.newConcepts}</dd>
          <dt className="text-fg-3">Open loop</dt>
          <dd className="num text-right text-fg-2">
            {o.payoff.status === "none-open" ? "none" : o.payoff.status === "unresolved" ? `unresolved · ${o.openLoopSeconds.toFixed(1)} s` : `resolves at ${o.payoff.at.toFixed(1)} s`}
          </dd>
        </dl>
        {o.transcript && <p className="mt-2 border-l border-line-2 pl-2 text-[11.5px] italic leading-snug text-fg-3">“{o.transcript}”</p>}
      </div>

      <CorpusEvidenceSection fractureId={fr.id} />

      <div>
        <div className="label mb-2 flex items-center gap-1.5">Interventions · counterfactual reruns <Tier tier="derived" sources={["neurascopeHeuristics"]} context="Counterfactual deltas · CORTEX rerun on an edited feature timeline" /></div>
        <ul className="space-y-2">
          {ivs.map((iv) => {
            const cf = cfs[iv.id];
            const on = activeCf === iv.id;
            return (
              <li key={iv.id} className={`rounded-md border p-2.5 transition-colors ${on ? "border-cf/50 bg-cf/[0.04]" : "border-line"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[12px] text-fg">{iv.title}</div>
                  {cf && (
                    <span className={`num shrink-0 text-[12px] ${cf.deltaPts >= 0 ? "text-cf" : "text-fracture"}`}>
                      {cf.deltaPts >= 0 ? "+" : ""}
                      {cf.deltaPts.toFixed(1)} pts
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-fg-3">{iv.instruction}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-fg-3">{cf ? `at ${cf.evalAt.toFixed(1)} s · end ${Math.round(cf.endOriginal * 100)}% → ${Math.round(cf.endCounterfactual * 100)}%` : iv.mechanism}</span>
                  <button
                    onClick={() => (on ? set({ activeCf: null }) : void simulatePatch(iv.id))}
                    disabled={pending === iv.id}
                    className="shrink-0 rounded border border-line-2 px-2 py-0.5 text-[10.5px] text-fg-2 hover:border-fg-3 hover:text-fg disabled:opacity-50"
                  >
                    {pending === iv.id ? "Rerunning…" : on ? "Hide" : cf ? "Show" : "Simulate patch"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[10px] leading-snug text-fg-3">Counterfactuals edit the feature timeline, not the video, and rerun CORTEX on the same seeded viewers. Model predictions, not guarantees.</p>
      </div>
    </div>
  );
}

function StateView() {
  const run = useLab((s) => s.run)!;
  const time = useLab((s) => s.time);
  const cohort = useLab((s) => s.cohort);
  const select = useLab((s) => s.selectFracture);
  const d = run.drivers;
  const hz = run.sim.hz;
  const rows: [string, number, EvidenceTier, string[]][] = [
    ["Novelty (surprise)", sampleAt(d.novelty, hz, time), "derived", ["itti2009", "neurascopeHeuristics"]],
    ["Orienting salience", sampleAt(d.salience, hz, time), "derived", ["lang2000", "corbetta2002", "neurascopeHeuristics"]],
    ["Processing load", sampleAt(d.load, hz, time), "derived", ["lang2000", "fisher2020", "neurascopeHeuristics"]],
    ["Semantic progression", sampleAt(d.progression, hz, time), "derived", ["cohen2017", "neurascopeHeuristics"]],
    ["Staticness", sampleAt(d.staticness, hz, time), "heuristic", ["neurascopeHeuristics"]],
    ["Habituation", sampleAt(d.habituation, hz, time), "heuristic", ["neurascopeHeuristics"]],
  ];
  const h = sampleAt(cohort === null ? run.sim.hazard : run.sim.hazardByCohort[cohort], hz, time);
  return (
    <div className="space-y-5">
      <div>
        <div className="label mb-1">CORTEX state · {time.toFixed(2)} s</div>
        <div className="text-[11px] text-fg-3">{cohort === null ? "Population" : COHORTS[cohort].label} · hazard <span className="num text-fg-2">{h.toFixed(3)}/s</span> <Tier tier="derived" sources={["cohen2017", "tong2020", "neurascopeHeuristics"]} context="Disengagement hazard · CORTEX viewer-level simulation" /></div>
      </div>
      <ul className="space-y-2">
        {rows.map(([label, v, tier, src]) => (
          <li key={label} className="flex items-center gap-2 text-[11.5px]">
            <Tier tier={tier} sources={src} context={`${label} · CORTEX driver`} />
            <span className="flex-1 text-fg-2">{label}</span>
            <span className="h-[3px] w-20 overflow-hidden rounded bg-line">
              <span className="block h-full bg-fg-2/70" style={{ width: `${Math.round(Math.min(1, v) * 100)}%` }} />
            </span>
            <span className="num w-8 text-right text-fg-3">{v.toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div>
        <div className="label mb-2">Attention fractures</div>
        {run.fractures.length ? (
          <ul className="space-y-1">
            {run.fractures.map((f, i) => (
              <li key={f.id}>
                <button data-testid="fracture-item" onClick={() => select(f.id)} className="flex w-full items-center gap-3 rounded px-1.5 py-1 text-left text-[12px] hover:bg-fg/[0.04]">
                  <span className="font-mono text-[10px] text-fracture">{f.id}</span>
                  <span className="num text-fg-2">{f.start.toFixed(1)} s</span>
                  <span className="flex-1 truncate text-fg-3">{f.drivers.map((x) => x.label.toLowerCase()).join(" · ")}</span>
                  <span className="num text-fg-3">−{f.lossPts.toFixed(1)}</span>
                  <span className="label !text-[9px]">{i + 1}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11.5px] text-fg-3">No hazard change with an interpretable mechanism was found.</p>
        )}
      </div>
    </div>
  );
}

export function Inspector() {
  const fractureId = useLab((s) => s.fractureId);
  return <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4">{fractureId ? <FractureView /> : <StateView />}</div>;
}
