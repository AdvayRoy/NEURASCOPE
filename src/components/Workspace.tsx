"use client";
import { GlBoundary } from "./GlBoundary";
import { COHORTS, AUDIENCE_CONTEXTS, type AudienceContextId } from "@/lib/cortex/params";
import { rerunContext } from "@/lib/state/pipeline";
import { useLab, type BrainMode } from "@/lib/state/store";
import { BrainCanvas } from "./brain/BrainCanvas";
import { VideoPane } from "./VideoPane";
import { Metrics } from "./Metrics";
import { CohortRail } from "./CohortRail";
import { Inspector } from "./Inspector";
import { Timeline } from "./Timeline";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { AskBar } from "./AskBar";
import { NetworkLegend } from "./NetworkLegend";
import { useKeyboard } from "./useKeyboard";

const SOURCE_BADGE = {
  "oriane-live": { text: "ORIANE LIVE", cls: "border-cf/40 text-cf" },
  "dev-fixture": { text: "DEV FIXTURE · NOT ORIANE OUTPUT", cls: "border-fracture/50 text-fracture" },
  "local-only": { text: "LOCAL FILE · NO ORIANE RECORD", cls: "border-line-2 text-fg-2" },
} as const;

export function Workspace() {
  const ontology = useLab((s) => s.ontology)!;
  const mode = useLab((s) => s.mode);
  const context = useLab((s) => s.context);
  const cohort = useLab((s) => s.cohort);
  const hover = useLab((s) => s.hoverRegion);
  const set = useLab((s) => s.set);
  const reset = useLab((s) => s.reset);
  useKeyboard();
  const badge = SOURCE_BADGE[ontology.source];

  return (
    <div className="grid h-full w-full grid-rows-[44px_minmax(0,1fr)_minmax(176px,21vh)]">
      <header className="flex items-center gap-5 border-b border-line px-5">
        <button onClick={reset} className="text-[13px] font-light tracking-[0.32em] text-fg hover:text-fg-2" title="New analysis">
          NEURASCOPE
        </button>
        <span className="h-4 w-px bg-line-2" />
        <span className="min-w-0 truncate text-[12px] text-fg-2" title={ontology.sourceNote}>
          {ontology.creator ? `@${ontology.creator.handle}` : ontology.id.replace(/^upload:/, "")}
          {ontology.caption && <span className="text-fg-3"> · {ontology.caption.slice(0, 70)}</span>}
        </span>
        <span title={ontology.sourceNote} className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.12em] ${badge.cls}`}>
          {badge.text}
        </span>
        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-2">
            <span className="label">Audience</span>
            <select
              value={context}
              onChange={(e) => { set({ context: e.target.value as AudienceContextId }); void rerunContext(); }}
              className="rounded border border-line bg-ink-1 px-1.5 py-0.5 text-[12px] text-fg-2 focus:outline-none"
            >
              {Object.entries(AUDIENCE_CONTEXTS).map(([id, c]) => <option key={id} value={id}>{c.label}</option>)}
            </select>
          </label>
          <div className="flex rounded-md border border-line p-0.5" role="tablist" aria-label="Brain mode">
            {(["cortex", "networks", "neural"] as BrainMode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => set({ mode: m, network: m === "networks" ? useLab.getState().network : null })}
                className={`rounded px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] transition-colors ${mode === m ? "bg-fg/10 text-fg" : "text-fg-3 hover:text-fg-2"}`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[minmax(0,32fr)_minmax(0,46fr)_minmax(300px,22fr)]">
        <VideoPane />
        <section className="relative min-h-0 border-x border-line">
          <div className="absolute inset-0">
            <GlBoundary
              fallback={
                <div className="flex h-full items-center justify-center px-8 text-center text-[12px] text-fg-3">
                  3D view unavailable (WebGL could not start). Timeline, cohorts, fractures and evidence remain fully functional.
                </div>
              }
            >
              <BrainCanvas />
            </GlBoundary>
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <Metrics />
            <NetworkLegend />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
            <div className="mb-2 flex items-end justify-between text-[10.5px] text-fg-3">
              <span className="max-w-[60%] leading-snug">
                {hover ? (
                  <span className="text-fg-2">
                    {hover.name.replace("lh.", "Left ").replace("rh.", "Right ")}
                    {hover.networks.length ? ` · ${hover.networks.join(", ")}` : " · not in an overlay network"}
                  </span>
                ) : mode === "neural" ? (
                  "Neural-reliability proxy · model-derived, not measured"
                ) : (
                  "Computational demand on DK parcels · not measured activation"
                )}
              </span>
              <span>
                Ring · {cohort === null ? "all cohorts" : COHORTS[cohort].label} · 1 point = 1 synthetic viewer
              </span>
            </div>
            <AskBar />
          </div>
        </section>
        <aside className="flex min-h-0 min-w-0 flex-col">
          <CohortRail />
          <Inspector />
        </aside>
      </div>

      <Timeline />
      <EvidenceDrawer />
    </div>
  );
}
