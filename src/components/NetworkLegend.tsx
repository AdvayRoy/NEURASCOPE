"use client";
import { NETWORKS } from "@/lib/cortex/networks";
import { sampleAt } from "@/lib/cortex/simulate";
import { useLab } from "@/lib/state/store";
import { Tier } from "./Tier";

export function NetworkLegend() {
  const run = useLab((s) => s.run);
  const time = useLab((s) => s.time);
  const network = useLab((s) => s.network);
  const mode = useLab((s) => s.mode);
  const fractureId = useLab((s) => s.fractureId);
  const set = useLab((s) => s.set);
  if (!run || mode === "neural") return null;
  const fr = run.fractures.find((f) => f.id === fractureId);
  return (
    <div className="glass pointer-events-auto w-[204px] shrink-0 rounded-lg px-2 py-1.5">
      <div className="label mb-2 flex items-center justify-between">
        <span>Functional networks</span>
        <Tier tier="literature" sources={["yeo2011", "corbetta2002"]} context="Network overlays (parcel-level grouping)" />
      </div>
      <ul className="space-y-[3px]">
        {NETWORKS.map((n) => {
          const v = sampleAt(run.networks[n.id], run.sim.hz, time);
          const on = network === n.id;
          const inFr = fr?.networks.includes(n.id);
          return (
            <li key={n.id}>
              <button
                onClick={() => set({ network: on ? null : n.id, mode: "networks" })}
                title={n.drivenBy}
                className={`group flex w-full items-center gap-2 rounded px-1 py-[3px] text-left text-[11px] transition-colors ${on ? "bg-fg/8 text-fg" : "text-fg-2 hover:text-fg"}`}
              >
                <span className={`w-9 font-mono text-[9.5px] ${inFr ? "text-fracture" : "text-fg-3"}`}>{n.short}</span>
                <span className="min-w-0 flex-1 truncate">{n.label}</span>
                <span className="h-[3px] w-10 overflow-hidden rounded bg-line">
                  <span className="block h-full bg-signal/80 transition-[width] duration-150" style={{ width: `${Math.round(v * 100)}%` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
