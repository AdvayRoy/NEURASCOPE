"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { COHORTS } from "@/lib/cortex/params";
import { eegSynth } from "@/lib/cortex/eeg";
import { useLab } from "@/lib/state/store";
import { TIER_LABEL, TIER_LETTER } from "@/lib/evidence/provenance";
import { Tier } from "./Tier";

const GUTTER = 128;

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 800, h: 160 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Animated visible time domain; zooms into the selected fracture's neighbourhood. */
function useDomain(duration: number, focus: { start: number; end: number } | null) {
  const [dom, setDom] = useState<[number, number]>([0, duration]);
  const cur = useRef<[number, number]>([0, duration]);
  useEffect(() => {
    const target: [number, number] = focus
      ? [Math.max(0, focus.start - 3), Math.min(duration, focus.end + 3)]
      : [0, duration];
    let raf = 0;
    const step = () => {
      const c = cur.current;
      const n: [number, number] = [c[0] + (target[0] - c[0]) * 0.2, c[1] + (target[1] - c[1]) * 0.2];
      const done = Math.abs(n[0] - target[0]) < 0.005 && Math.abs(n[1] - target[1]) < 0.005;
      cur.current = done ? target : n;
      setDom(cur.current);
      if (!done) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [duration, focus]);
  return dom;
}

function linePath(a: Float32Array, hz: number, x: (t: number) => number, y: (v: number) => number, dom: [number, number]) {
  const i0 = Math.max(0, Math.floor(dom[0] * hz) - 1);
  const i1 = Math.min(a.length - 1, Math.ceil(dom[1] * hz) + 1);
  let s = "";
  for (let i = i0; i <= i1; i++) s += `${i === i0 ? "M" : "L"}${x(i / hz).toFixed(1)},${y(a[i]).toFixed(1)}`;
  return s;
}

function Cursor({ x, h }: { x: (t: number) => number; h: number }) {
  const time = useLab((s) => s.time);
  const px = x(time);
  return (
    <g pointerEvents="none">
      <line x1={px} x2={px} y1={0} y2={h} stroke="rgba(236,234,228,0.8)" strokeWidth={1} />
      <rect x={px - 3} y={0} width={6} height={3} fill="#eceae4" />
    </g>
  );
}

function EegStrip({ w, h, x, dom }: { w: number; h: number; x: (t: number) => number; dom: [number, number] }) {
  const run = useLab((s) => s.run)!;
  const cf = useLab((s) => (s.activeCf ? s.counterfactuals[s.activeCf] : null));
  const ref = useRef<HTMLCanvasElement>(null);
  const src = cf?.run ?? run;
  const wave = useMemo(() => eegSynth(src.eeg, src.sim.hz, `Pz-${src.seed}`), [src]);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = h * dpr;
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);
    const fs = 128;
    const i0 = Math.max(0, Math.floor(dom[0] * fs));
    const i1 = Math.min(Math.floor(src.timeline.duration * fs), Math.ceil(dom[1] * fs));
    const stride = Math.max(1, Math.floor((i1 - i0) / (w * 2)));
    g.strokeStyle = "rgba(169,173,179,0.55)";
    g.lineWidth = 0.8;
    g.beginPath();
    for (let i = i0; i <= i1; i += stride) {
      const px = x(i / fs) - GUTTER;
      const py = h / 2 - wave.sample(i / fs) * h * 0.42;
      if (i === i0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
    // Alpha envelope overlay
    g.strokeStyle = "rgba(143,179,255,0.7)";
    g.beginPath();
    const hz = src.sim.hz;
    for (let k = Math.floor(dom[0] * hz); k <= Math.min(src.eeg.alpha.length - 1, Math.ceil(dom[1] * hz)); k++) {
      const px = x(k / hz) - GUTTER;
      const py = h - 2 - src.eeg.alpha[k] * (h - 4);
      if (k === Math.floor(dom[0] * hz)) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
  }, [wave, w, h, x, dom, src]);
  return <canvas ref={ref} style={{ width: w, height: h }} className="block" />;
}

export function Timeline() {
  const run = useLab((s) => s.run)!;
  const cohort = useLab((s) => s.cohort);
  const fractureId = useLab((s) => s.fractureId);
  const playing = useLab((s) => s.playing);
  const cf = useLab((s) => (s.activeCf ? s.counterfactuals[s.activeCf] : null));
  const set = useLab((s) => s.set);
  const seek = useLab((s) => s.seek);
  const selectFracture = useLab((s) => s.selectFracture);
  const [wrap, size] = useSize<HTMLDivElement>();
  const d = run.timeline.duration;
  const hz = run.sim.hz;
  const fr = run.fractures.find((f) => f.id === fractureId) ?? null;
  const dom = useDomain(d, fr);
  const plotW = Math.max(100, size.w - GUTTER - 16);
  const x = useMemo(() => (t: number) => GUTTER + ((t - dom[0]) / (dom[1] - dom[0])) * plotW, [dom, plotW]);
  const tOf = (px: number) => dom[0] + ((px - GUTTER) / plotW) * (dom[1] - dom[0]);

  const H = size.h;
  const rows = { ev: [4, 18], ret: [26, Math.max(40, H - 26 - 30 - 34 - 18)], haz: [0, 30], eeg: [0, 34] };
  rows.haz[0] = rows.ret[0] + rows.ret[1] + 6;
  rows.eeg[0] = rows.haz[0] + rows.haz[1] + 6;
  const yRet = (v: number) => rows.ret[0] + (1 - v) * rows.ret[1];
  const hazMax = useMemo(() => {
    let m = 0.05;
    for (let i = Math.floor(0.8 * hz); i < run.sim.hazard.length; i++) m = Math.max(m, run.sim.hazard[i]);
    return m;
  }, [run, hz]);
  const yHaz = (v: number) => rows.haz[0] + rows.haz[1] - Math.min(1, v / hazMax) * rows.haz[1];

  const retMain = cohort === null ? run.sim.retention : run.sim.retentionByCohort[cohort];
  const retCf = cf ? (cohort === null ? cf.run.sim.retention : cf.run.sim.retentionByCohort[cohort]) : null;
  const haz = cohort === null ? run.sim.hazard : run.sim.hazardByCohort[cohort];
  const ticks = useMemo(() => {
    const span = dom[1] - dom[0];
    const step = span > 40 ? 10 : span > 16 ? 2 : span > 6 ? 1 : 0.5;
    const out: number[] = [];
    for (let t = Math.ceil(dom[0] / step) * step; t <= dom[1]; t += step) out.push(t);
    return out;
  }, [dom]);

  const dragging = useRef(false);
  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    if (px < GUTTER) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    set({ playing: false });
    seek(tOf(px));
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    seek(tOf(e.clientX - r.left));
  };

  return (
    <section className="relative min-w-0 overflow-hidden border-t border-line bg-ink" aria-label="Temporal instrument">
      <div className="absolute top-2 left-4 z-10 flex items-center gap-2">
        <button
          onClick={() => set({ playing: !playing })}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-line-2 text-[9px] text-fg hover:border-fg-3"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <TimeReadout duration={d} />
      </div>
      <div ref={wrap} className="h-full w-full">
        <svg width={size.w} height={H} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => (dragging.current = false)} className="block cursor-crosshair select-none">
          {/* gutter labels */}
          <g className="label" fill="var(--color-fg-3)" fontSize={9.5} fontFamily="var(--font-mono)" letterSpacing="0.12em">
            <text x={16} y={rows.ret[0] + 28}>RETENTION</text>
            <text x={16} y={rows.ret[0] + 40} fill="var(--color-fg-3)" opacity={0.7}>{cohort === null ? "ALL VIEWERS" : COHORTS[cohort].label.toUpperCase()}</text>
            <text x={16} y={rows.haz[0] + 18}>HAZARD</text>
            <text x={16} y={rows.eeg[0] + 14}>SYNTHETIC EEG</text>
            <text x={16} y={rows.eeg[0] + 25} opacity={0.7}>ILLUSTRATIVE PROXY</text>
          </g>
          <clipPath id="plot"><rect x={GUTTER} y={0} width={plotW} height={H} /></clipPath>
          <g clipPath="url(#plot)">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={rows.ret[0]} y2={rows.eeg[0] + rows.eeg[1]} stroke="rgba(235,238,242,0.04)" />
                <text x={x(t) + 3} y={rows.ret[0] + rows.ret[1] - 3} fontSize={9} fill="var(--color-fg-3)" fontFamily="var(--font-mono)">{t.toFixed(t % 1 ? 1 : 0)}s</text>
              </g>
            ))}
            {[0.25, 0.5, 0.75].map((v) => (
              <line key={v} x1={GUTTER} x2={GUTTER + plotW} y1={yRet(v)} y2={yRet(v)} stroke="rgba(235,238,242,0.04)" strokeDasharray="2 4" />
            ))}
            {/* fracture bands */}
            {run.fractures.map((f) => (
              <g key={f.id} onPointerDown={(e) => { e.stopPropagation(); selectFracture(f.id); }} className="cursor-pointer">
                <rect
                  x={x(f.start)}
                  width={Math.max(3, x(f.end) - x(f.start))}
                  y={rows.ret[0]}
                  height={rows.eeg[0] + rows.eeg[1] - rows.ret[0]}
                  fill={f.id === fractureId ? "rgba(255,122,69,0.14)" : "rgba(255,122,69,0.06)"}
                />
                <line x1={x(f.start)} x2={x(f.start)} y1={rows.ret[0]} y2={rows.eeg[0] + rows.eeg[1]} stroke="rgba(255,122,69,0.6)" />
                <text x={x(f.start) + 4} y={rows.ret[0] + 10} fontSize={9.5} fill="var(--color-fracture)" fontFamily="var(--font-mono)">{f.id}</text>
              </g>
            ))}
            {/* semantic events */}
            {run.timeline.events.map((ev, i, all) => {
              const prev = all.slice(0, i).filter((e) => e.kind !== "cut").at(-1);
              const stagger = ev.kind !== "cut" && prev && x(ev.t) - x(prev.t) < 64 ? 8 : 0;
              return (
              <g key={ev.id}>
                <title>{`${ev.label} · ${ev.detector} (${TIER_LETTER[ev.tier]} · ${TIER_LABEL[ev.tier]})`}</title>
                <line x1={x(ev.t)} x2={x(ev.t)} y1={rows.ev[0] + 4} y2={rows.ev[0] + rows.ev[1]} stroke={ev.kind === "cut" ? "rgba(169,173,179,0.35)" : "rgba(143,179,255,0.8)"} />
                {ev.kind !== "cut" && (
                  <text x={x(ev.t) + 3} y={rows.ev[0] + 8 + stagger} fontSize={8.5} fill="var(--color-fg-2)" fontFamily="var(--font-mono)">
                    {ev.kind.toUpperCase()}
                  </text>
                )}
              </g>
              );
            })}
            {/* cohort ghost curves */}
            {cohort === null &&
              run.sim.retentionByCohort.map((r, i) => <path key={i} d={linePath(r, hz, x, yRet, dom)} fill="none" stroke="rgba(169,173,179,0.18)" strokeWidth={1} />)}
            <path d={`${linePath(retMain, hz, x, yRet, dom)}L${x(Math.min(dom[1], d))},${yRet(0)}L${x(dom[0])},${yRet(0)}Z`} fill="rgba(236,234,228,0.035)" />
            <path d={linePath(retMain, hz, x, yRet, dom)} fill="none" stroke="#eceae4" strokeWidth={1.5} />
            {retCf && <path d={linePath(retCf, cf!.run.sim.hz, x, yRet, dom)} fill="none" stroke="var(--color-cf)" strokeWidth={1.4} strokeDasharray="4 3" />}
            {/* hazard */}
            <path d={`${linePath(haz, hz, x, yHaz, dom)}L${x(dom[1])},${yHaz(0)}L${x(dom[0])},${yHaz(0)}Z`} fill="rgba(255,122,69,0.12)" />
            <path d={linePath(haz, hz, x, yHaz, dom)} fill="none" stroke="rgba(255,122,69,0.75)" strokeWidth={1} />
            <Cursor x={x} h={H} />
          </g>
          <foreignObject x={GUTTER} y={rows.eeg[0]} width={plotW} height={rows.eeg[1]} pointerEvents="none">
            <EegStrip w={plotW} h={rows.eeg[1]} x={x} dom={dom} />
          </foreignObject>
        </svg>
      </div>
      <div className="absolute right-4 bottom-1.5 flex items-center gap-3 text-[9.5px] text-fg-3">
        {cf && <span className="text-cf">- - counterfactual · {cf.intervention.title} · {cf.deltaPts >= 0 ? "+" : ""}{cf.deltaPts.toFixed(1)} pts at {cf.evalAt.toFixed(1)} s</span>}
        <span className="flex items-center gap-1">EEG proxy <Tier tier="derived" sources={["bbbd2026", "ki2016", "jensen2002", "madsen2021"]} context="Synthetic EEG proxy · model-derived from CORTEX attention and load, never measured EEG" /></span>
        <span className="flex items-center gap-1">Survival <Tier tier="derived" sources={["cohen2017", "tong2020", "neurascopeHeuristics"]} context="Survival / hazard · CORTEX viewer-level simulation (hazard link parameters are Tier D heuristics)" /></span>
      </div>
    </section>
  );
}

function TimeReadout({ duration }: { duration: number }) {
  const time = useLab((s) => s.time);
  return (
    <span className="num text-[10.5px] text-fg-2">
      {time.toFixed(2)}
      <span className="text-fg-3"> / {duration.toFixed(1)} s</span>
    </span>
  );
}
