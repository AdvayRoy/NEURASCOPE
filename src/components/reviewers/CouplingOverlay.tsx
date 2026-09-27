"use client";
import { useEffect, useRef } from "react";
import { COHORTS } from "@/lib/cortex/params";
import { useLab } from "@/lib/state/store";
import { hazardReference, reviewerState } from "./reviewerState";

const PULSES = 4;
const TRAVEL = 0.8;
const SIGNAL = [143, 179, 255];
const FRACTURE = [255, 122, 69];

type P = [number, number];
/** Orthogonal conduit with rounded corners: out of the brain, up the gutter beside the legend, into the row port. */
const route = (a: P, x: number, d: P) => {
  const dy = d[1] - a[1];
  const sg = Math.sign(dy) || 1;
  const r = Math.max(0, Math.min(14, Math.abs(dy) / 2, d[0] - x, x - a[0]));
  return `M${a[0]},${a[1]} L${x - r},${a[1]} Q${x},${a[1]} ${x},${a[1] + sg * r} L${x},${d[1] - sg * r} Q${x},${d[1]} ${x + r},${d[1]} L${d[0]},${d[1]}`;
};

/**
 * Model-state coupling: thin conduits from the central CORTEX view to each synthetic reviewer.
 * Each conduit terminates in a port at the outer edge of its reviewer row, never over the avatar.
 * Both ends are projections of the same computed cohort state; this is not a biological signal path.
 * Link intensity = cohort attention × survival (+ selection, + cohort fracture response); pulses are emitted only when that state changes.
 */
export function CouplingOverlay() {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const root = svg.current;
    if (!root) return;
    const paths = Array.from(root.querySelectorAll<SVGPathElement>("[data-link]"));
    const ports = Array.from(root.querySelectorAll<SVGGElement>("[data-port]"));
    const dots = Array.from(root.querySelectorAll<SVGCircleElement>("[data-pulse]"));
    const prev = COHORTS.map(() => ({ a: 0, w: 0, f: 0, acc: 0, t: -1 }));
    const pulses: { c: number; born: number }[] = [];
    let raf = 0;
    let geomAge = 1e9;
    let geo: { d: P; path: string }[] = [];
    let last = performance.now();
    let base: number | null = null;
    let baseRun: unknown = null;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const nowMs = performance.now();
      const dt = Math.min(0.05, (nowMs - last) / 1000);
      last = nowMs;
      const now = nowMs / 1000;
      const s = useLab.getState();
      const run = s.run;
      const src = (s.activeCf ? s.counterfactuals[s.activeCf]?.run : null) ?? run;
      if (!run || !src) return;
      if (baseRun !== run) {
        base = hazardReference(run);
        baseRun = run;
      }
      geomAge += dt;
      if (geomAge > 0.25) {
        geomAge = 0;
        const host = root.getBoundingClientRect();
        const brain = document.querySelector("[data-brain-stage]")?.getBoundingClientRect();
        const rail = document.querySelector("[data-reviewer-rail]")?.getBoundingClientRect();
        const legend = document.querySelector("[data-network-legend]")?.getBoundingClientRect();
        geo = COHORTS.map((c, i) => {
          const el = document.querySelector(`[data-reviewer-row="${c.id}"]`)?.getBoundingClientRect();
          if (!brain || !rail || !el || el.width === 0) return null;
          const d: P = [el.left - host.left - 1, el.top - host.top + el.height * 0.5];
          const floor = legend && legend.height > 0 ? legend.bottom - host.top + 18 : 0;
          const a: P = [brain.left - host.left + brain.width * 0.7, Math.max(brain.top - host.top + brain.height * 0.5, floor) + 6 * i];
          const gutter = legend && legend.width > 0 ? (legend.right + el.left) / 2 - host.left : d[0] - 18;
          const x = Math.min(gutter + 2 * i - 3, d[0] - 8);
          return { d, path: route(a, x, d) };
        }).filter((g): g is { d: P; path: string } => g !== null);
      }
      if (geo.length !== COHORTS.length) return;
      COHORTS.forEach((_, c) => {
        const r = reviewerState(src, c, s.time, base!);
        const pv = prev[c];
        if (pv.t !== s.time) {
          pv.acc += Math.abs(r.attention - pv.a) + Math.abs(r.withdrawal - pv.w) + Math.abs(r.fracture - pv.f);
          pv.a = r.attention;
          pv.w = r.withdrawal;
          pv.f = r.fracture;
          pv.t = s.time;
        }
        const selected = s.cohort === c;
        const dim = s.cohort !== null && !selected ? 0.4 : 1;
        const k = Math.min(1, (0.035 + 0.05 * r.attention * r.survival) * dim + (selected ? 0.42 : 0) + 0.6 * r.fracture);
        if (pv.acc > 0.035 && k > 0.15) {
          pv.acc = 0;
          if (pulses.length < PULSES * COHORTS.length) pulses.push({ c, born: now });
        } else if (pv.acc > 0.035) pv.acc = 0;
        const col = SIGNAL.map((v, i) => Math.round(v + (FRACTURE[i] - v) * Math.min(1, r.fracture * 1.4))).join(",");
        const g = geo[c];
        const p = paths[c];
        if (p.getAttribute("d") !== g.path) p.setAttribute("d", g.path);
        p.setAttribute("stroke", `rgba(${col},${k.toFixed(3)})`);
        p.setAttribute("stroke-width", (0.6 + 0.9 * k).toFixed(2));
        p.dataset.intensity = k.toFixed(3);
        const port = ports[c];
        port.setAttribute("transform", `translate(${g.d[0]},${g.d[1]})`);
        port.setAttribute("color", `rgb(${col})`);
        port.setAttribute("opacity", Math.min(1, 0.25 + 1.4 * k).toFixed(3));
        (port.firstElementChild as SVGCircleElement).setAttribute("r", (3 + 4 * k).toFixed(2));
      });
      for (let i = pulses.length - 1; i >= 0; i--) if (now - pulses[i].born > TRAVEL) pulses.splice(i, 1);
      dots.forEach((dot, i) => {
        const pl = pulses[i];
        if (!pl) {
          dot.setAttribute("opacity", "0");
          return;
        }
        const path = paths[pl.c];
        const u = (now - pl.born) / TRAVEL;
        const pt = path.getPointAtLength(u * path.getTotalLength());
        dot.setAttribute("cx", pt.x.toFixed(1));
        dot.setAttribute("cy", pt.y.toFixed(1));
        dot.setAttribute("opacity", (Math.sin(u * Math.PI) * Math.max(0.35, Number(paths[pl.c].dataset.intensity ?? 0))).toFixed(3));
      });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <svg ref={svg} data-testid="coupling-overlay" className="pointer-events-none absolute inset-0 z-[5] h-full w-full" aria-hidden>
      {COHORTS.map((c) => (
        <path key={c.id} data-link={c.id} fill="none" stroke="transparent" strokeLinecap="round" />
      ))}
      {COHORTS.map((c) => (
        <g key={c.id} data-port={c.id} opacity={0}>
          <circle r={4} fill="currentColor" opacity={0.18} />
          <circle r={1.9} fill="currentColor" />
        </g>
      ))}
      {Array.from({ length: PULSES * COHORTS.length }, (_, i) => (
        <circle key={i} data-pulse r={1.8} fill="#dfe8ff" opacity={0} />
      ))}
    </svg>
  );
}
