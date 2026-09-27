"use client";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { buildBrief, mostAffectedLabel } from "@/lib/brief/brief";
import type { CorpusBenchmark, CorpusResult } from "@/lib/oriane/comparables";
import { loadCorpusEvidence, simulatePatch } from "@/lib/state/pipeline";
import { useLab } from "@/lib/state/store";
import { Tier } from "./Tier";

const SOURCE_LABEL = { "oriane-live": "ORIANE LIVE", "dev-fixture": "DEV FIXTURE", "local-only": "LOCAL FILE · NO ORIANE RECORD" } as const;
const fmtVal = (b: CorpusBenchmark, v: number) => (b.id === "duration" ? `${Math.round(v)} ${b.unit}` : `${v.toFixed(1)} ${b.unit}`);

function Step({ n, title, right, children }: { n: number; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b border-line py-4 last:border-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="label flex items-center gap-2">
          <span className="text-fg-3/70">{n}</span>
          {title}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function OrianeContext({ ev }: { ev: CorpusResult | "pending" | undefined }) {
  if (!ev || ev === "pending") return <p className="text-[12px] text-fg-3">Retrieving relevant published content from Oriane…</p>;
  if (!ev.available) return <p className="text-[12px] leading-snug text-fg-3">{ev.reason}</p>;
  const thumbs = ev.items.filter((i) => i.thumbnail).slice(0, 4);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[14px] text-fg">
          <span className="num">{ev.items.length}</span> relevant published {ev.items.length === 1 ? "video" : "videos"}
        </div>
        <span className="text-[11px] text-fg-3">
          matched by{" "}
          {[
            ev.items.some((i) => i.matchedBy.includes("visual")) ? "visual similarity" : null,
            ev.items.some((i) => i.matchedBy.includes("transcript")) ? "spoken content" : null,
          ]
            .filter(Boolean)
            .join(" + ")}
        </span>
      </div>
      {thumbs.length > 0 && (
        <div className="mt-2.5 flex gap-1.5">
          {thumbs.map((it) => (
            <a key={it.id} href={it.url} target="_blank" rel="noreferrer noopener" title={`@${it.handle}`} className="block h-14 w-10 overflow-hidden rounded-[3px] border border-line bg-bg-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.thumbnail!} alt="" loading="lazy" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
      {ev.benchmarks.length > 0 && (
        <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-[12px]">
          {ev.benchmarks.map((b) => (
            <div key={b.id} className="contents" title={b.note}>
              <dt className="text-fg-2">Your {b.label.toLowerCase()} at this moment</dt>
              <dd className="num text-right text-fg">{b.source === null ? "n/a" : fmtVal(b, b.source)}</dd>
              <dt className="text-fg-3">
                Reference median <span className="num">· n={b.n}</span>
              </dt>
              <dd className="num text-right text-fg-3">{fmtVal(b, b.corpusMedian)}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-2.5 text-[10.5px] leading-snug text-fg-3">Corpus evidence · not retention ground truth. The reference median describes what comparable published content does; it is context, not the optimal edit.</p>
    </div>
  );
}

function Body() {
  const run = useLab((s) => s.run)!;
  const ontology = useLab((s) => s.ontology)!;
  const counterfactuals = useLab((s) => s.counterfactuals);
  const pending = useLab((s) => s.cfPending);
  const set = useLab((s) => s.set);
  const select = useLab((s) => s.selectFracture);
  const b = buildBrief(run);
  const fr = b.primary;
  const ev = useLab((s) => (fr ? s.corpus[fr.id] : undefined));
  const cf = b.recommended ? counterfactuals[b.recommended.id] : undefined;
  useEffect(() => {
    if (fr) void loadCorpusEvidence(fr.id);
  }, [fr]);

  if (!fr) {
    return (
      <div className="px-6 py-6">
        <div className="text-[15px] text-fg">No high-confidence Attention Fracture detected in this run.</div>
        <p className="mt-2 text-[12px] leading-relaxed text-fg-3">
          CORTEX predicts <span className="num text-fg-2">{Math.round(run.sim.retention[run.sim.n - 1] * 100)}%</span> of the seeded audience reaches the end, with no hazard rise that has an interpretable mechanism. Nothing is recommended; play the video and inspect the timeline for smaller drifts.
        </p>
      </div>
    );
  }

  const jump = () => {
    select(fr.id);
    set({ brief: false, activeCf: cf ? cf.intervention.id : null });
  };
  const simulate = () => {
    if (!b.recommended) return;
    select(fr.id);
    void simulatePatch(b.recommended.id);
  };

  return (
    <div className="px-6">
      <Step
        n={1}
        title="Primary risk"
        right={
          <button onClick={jump} className="text-[11px] text-fg-3 hover:text-fg" data-testid="brief-jump">
            Open in workspace →
          </button>
        }
      >
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] tracking-[0.14em] text-fracture">{fr.id}</span>
          <span className="num text-[22px] font-light text-fg">
            {fr.start.toFixed(1)}–{fr.end.toFixed(1)} s
          </span>
          <span className="num ml-auto text-[12px] text-fracture">−{fr.lossPts.toFixed(1)} pts survival</span>
        </div>
        <div className="mt-1 text-[12.5px] text-fg-2">Elevated modeled disengagement · {mostAffectedLabel(fr)}</div>
      </Step>

      <Step n={2} title="Why CORTEX predicts it" right={<Tier tier={fr.drivers[0].tier} sources={fr.drivers[0].sources} context={`${fr.id} · ${fr.drivers[0].label}`} />}>
        <p className="text-[14px] leading-snug text-fg">{b.why}</p>
        <p className="mt-1 text-[11px] text-fg-3">{fr.drivers.map((d) => `${d.label} ${d.direction === "up" ? "↑" : "↓"}`).join(" · ")}</p>
      </Step>

      <Step n={3} title="Observed in the video">
        {b.observed.length ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
            {b.observed.map((f) => (
              <div key={f.label} className="contents">
                <dt className="num text-fg">{f.value}</dt>
                <dd className="text-fg-3">{f.label}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[12px] text-fg-3">No decoded visual or transcript channel for this window.</p>
        )}
        {fr.observed.transcript && <p className="mt-2 border-l border-line-2 pl-2 text-[11.5px] italic leading-snug text-fg-3">“{fr.observed.transcript}”</p>}
      </Step>

      <Step n={4} title="Real-world context · Oriane" right={<span className="font-mono text-[9px] tracking-[0.08em] text-fg-3">{SOURCE_LABEL[ontology.source]}</span>}>
        <OrianeContext ev={ev} />
      </Step>

      <Step n={5} title="Recommended change">
        {b.recommended ? (
          <>
            <div className="text-[14px] text-fg">{b.recommended.title}</div>
            <p className="mt-1 text-[12px] leading-snug text-fg-2">{b.recommended.instruction}</p>
            <p className="mt-1 text-[11px] text-fg-3">{b.recommended.mechanism}</p>
            {!cf && (
              <button
                onClick={simulate}
                disabled={pending === b.recommended.id}
                data-testid="brief-simulate"
                className="mt-3 rounded border border-cf/50 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.14em] text-cf hover:bg-cf/10 disabled:opacity-50"
              >
                {pending === b.recommended.id ? "RERUNNING 10,000 VIEWERS…" : "SIMULATE PATCH"}
              </button>
            )}
          </>
        ) : (
          <p className="text-[12px] text-fg-3">No intervention maps onto this mechanism with the channels available.</p>
        )}
      </Step>

      <Step n={6} title="After simulation" right={<Tier tier="derived" sources={["neurascopeHeuristics"]} context="Counterfactual delta · CORTEX rerun on an edited feature timeline" />}>
        {cf ? (
          <div data-testid="brief-result">
            <div className="flex items-baseline gap-3">
              <span className={`num text-[24px] font-light ${cf.deltaPts >= 0 ? "text-cf" : "text-fracture"}`}>
                {cf.deltaPts >= 0 ? "+" : ""}
                {cf.deltaPts.toFixed(1)} pts
              </span>
              <span className="text-[12px] text-fg-2">predicted survival at {cf.evalAt.toFixed(1)} s</span>
            </div>
            <p className="mt-1 text-[11.5px] text-fg-3">
              End of video <span className="num">{Math.round(cf.endOriginal * 100)}% → {Math.round(cf.endCounterfactual * 100)}%</span> · same seeded population · Tier C · model-derived, not a guaranteed uplift.
            </p>
            <button onClick={jump} className="mt-2 text-[11px] text-fg-3 hover:text-fg">
              Compare original vs counterfactual on the timeline →
            </button>
          </div>
        ) : (
          <p className="text-[12px] text-fg-3">Run the simulation to rerun the same 10,000 synthetic viewers on the edited timeline.</p>
        )}
      </Step>
    </div>
  );
}

/** Creator-facing decision surface composed from existing run, corpus and counterfactual state. */
export function PreflightBrief() {
  const open = useLab((s) => s.brief);
  const set = useLab((s) => s.set);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" className="fixed inset-0 z-40 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => set({ brief: false })} />
          <motion.aside
            key="brief"
            role="dialog"
            aria-label="Pre-flight brief"
            data-testid="preflight-brief"
            className="glass fixed top-0 right-0 bottom-0 z-50 flex w-[500px] flex-col !border-y-0 !border-r-0 !bg-[rgba(16,17,21,0.96)]"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
          >
            <div className="flex items-start justify-between border-b border-line px-6 py-4">
              <div>
                <div className="label">Pre-flight brief</div>
                <p className="mt-1 text-[12px] leading-snug text-fg-3">Where this video is most likely to lose attention, why, what Oriane shows about comparable published content, and what the same synthetic audience predicts after the recommended edit.</p>
              </div>
              <button onClick={() => set({ brief: false })} className="text-[12px] text-fg-3 hover:text-fg" aria-label="Close brief">
                Close
              </button>
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto">
              <Body />
            </div>
            <div className="border-t border-line px-6 py-2.5 font-mono text-[9px] tracking-[0.06em] text-fg-3/80">Oriane observes · CORTEX predicts · platform analytics validate later</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
