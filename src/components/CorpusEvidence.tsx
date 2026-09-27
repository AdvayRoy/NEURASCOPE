"use client";
import { useEffect } from "react";
import type { CorpusBenchmark, CorpusEvidence, CorpusItem } from "@/lib/oriane/comparables";
import { loadCorpusEvidence } from "@/lib/state/pipeline";
import { useLab } from "@/lib/state/store";

const fmtViews = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));
const fmtVal = (b: CorpusBenchmark, v: number) => (b.id === "duration" ? `${Math.round(v)} ${b.unit}` : `${v.toFixed(1)} ${b.unit}`);

function Benchmark({ b }: { b: CorpusBenchmark }) {
  const max = Math.max(b.source ?? 0, b.corpusMedian, 1e-6);
  return (
    <li title={b.note} className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-fg-2">{b.label}</span>
        <span className="num shrink-0 text-fg-3">n={b.n}</span>
      </div>
      <div className="grid grid-cols-[52px_1fr_auto] items-center gap-x-2 text-[10.5px]">
        <span className="text-fracture">this video</span>
        <span className="h-[3px] overflow-hidden rounded bg-line">{b.source !== null && <span className="block h-full bg-fracture/80" style={{ width: `${(b.source / max) * 100}%` }} />}</span>
        <span className="num w-[62px] text-right text-fg-2">{b.source === null ? "not comparable" : fmtVal(b, b.source)}</span>
        <span className="text-fg-3">corpus</span>
        <span className="h-[3px] overflow-hidden rounded bg-line">
          <span className="block h-full bg-fg-3/70" style={{ width: `${(b.corpusMedian / max) * 100}%` }} />
        </span>
        <span className="num w-[62px] text-right text-fg-2">{fmtVal(b, b.corpusMedian)} med</span>
      </div>
    </li>
  );
}

function Item({ it }: { it: CorpusItem }) {
  return (
    <li className="flex gap-2.5">
      <a href={it.url} target="_blank" rel="noreferrer noopener" className="block h-11 w-8 shrink-0 overflow-hidden rounded-[3px] border border-line bg-bg-2" aria-label={`Open @${it.handle} on ${it.platform}`}>
        {it.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={it.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-[11px]">
          <a href={it.url} target="_blank" rel="noreferrer noopener" className="truncate text-fg hover:underline">
            @{it.handle}
          </a>
          <span className="num shrink-0 text-fg-3">
            {it.duration !== null ? `${Math.round(it.duration)} s · ` : ""}
            {fmtViews(it.views)} views
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 font-mono text-[9px] tracking-[0.08em] text-fg-3">
          {it.matchedBy.includes("visual") && <span className="rounded-[3px] border border-line-2 px-1">VISUAL</span>}
          {it.matchedBy.includes("transcript") && <span className="rounded-[3px] border border-line-2 px-1">TRANSCRIPT</span>}
        </div>
        {it.excerpt && <p className="mt-0.5 truncate text-[10.5px] italic text-fg-3">“{it.excerpt}”</p>}
      </div>
    </li>
  );
}

function Body({ ev }: { ev: CorpusEvidence }) {
  const via = [
    ev.retrieval.visual === "oriane-keyframe" ? "keyframe at fracture" : ev.retrieval.visual === "local-frame" ? "frame at fracture" : null,
    ev.retrieval.terms.length ? `spoken: ${ev.retrieval.terms.slice(0, 4).join(", ")}` : null,
    ev.retrieval.platform,
    ev.retrieval.language,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <>
      <p className="text-[11px] leading-snug text-fg-3">
        Retrieved by {via}. Top {ev.items.length} published comparables shown.
      </p>
      {ev.benchmarks.length > 0 && <ul className="mt-2.5 space-y-2.5">{ev.benchmarks.map((b) => <Benchmark key={b.id} b={b} />)}</ul>}
      <ul className="mt-3 space-y-2">
        {ev.items.map((it) => (
          <Item key={it.id} it={it} />
        ))}
      </ul>
      {(ev.context.medianViews !== null || ev.context.medianEngagementRate !== null) && (
        <p className="mt-2.5 text-[10.5px] leading-snug text-fg-3">
          {[ev.context.medianViews !== null ? `median ${fmtViews(ev.context.medianViews)} views` : null, ev.context.medianEngagementRate !== null ? `${ev.context.medianEngagementRate.toFixed(1)}% engagement` : null].filter(Boolean).join(" · ")}
          {" — distribution/performance context · not retention ground truth"}
        </p>
      )}
      <p className="mt-1.5 font-mono text-[9px] tracking-[0.06em] text-fg-3/80" title={ev.disclaimer}>
        Oriane observes · CORTEX predicts{ev.requestIds[0] ? ` · req ${ev.requestIds[0].slice(0, 8)}` : ""}
      </p>
    </>
  );
}

/** Fracture-conditioned published-content evidence from Oriane, placed between source evidence and interventions. */
export function CorpusEvidenceSection({ fractureId }: { fractureId: string }) {
  const state = useLab((s) => s.corpus[fractureId]);
  useEffect(() => {
    void loadCorpusEvidence(fractureId);
  }, [fractureId]);
  return (
    <div data-testid="corpus-evidence">
      <div className="mb-2 flex items-center justify-between">
        <span className="label">Corpus evidence · Oriane</span>
        <span className="font-mono text-[9px] tracking-[0.08em] text-fg-3">NOT RETENTION GROUND TRUTH</span>
      </div>
      {!state || state === "pending" ? (
        <p className="text-[11px] text-fg-3">Retrieving published comparables for this fracture from Oriane…</p>
      ) : state.available ? (
        <Body ev={state} />
      ) : (
        <p className="text-[11px] leading-snug text-fg-3">{state.reason}</p>
      )}
    </div>
  );
}
