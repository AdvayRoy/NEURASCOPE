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
const bez = (a: P, b: P, c: P, d: P, t: number): P => {
  const u = 1 - t;
  return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]];
};

/**
 * Model-state coupling: thin conduits from the central CORTEX view to each synthetic reviewer.
 * Both ends are projections of the same computed cohort state; this is not a biological signal path.
 * Link intensity = cohort attention × survival (+ selection, + cohort fracture response); pulses are emitted only when that state changes.
 */
export function CouplingOverlay() {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const root = svg.current;
    if (!root) return;
    const paths = Array.from(root.querySelectorAll<SVGPathElement>("[data-link]"));
    const dots = Array.from(root.querySelectorAll<SVGCircleElement>("[data-pulse]"));
    const prev = COHORTS.map(() => ({ a: 0, w: 0, f: 0, acc: 0, t: -1 }));
    const pulses: { c: number; born: number }[] = [];
    let raf = 0;
    let geomAge = 1e9;
    let geo: { a: P; b: P; c: P; d: P }[] = [];
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
        geo = COHORTS.map((c) => {
          const el = document.querySelector(`[data-reviewer-anchor="${c.id}"]`)?.getBoundingClientRect();
          if (!brain || !rail || !el || el.width === 0) return null;
          const a: P = [brain.left - host.left + brain.width * 0.74, brain.top - host.top + brain.height * 0.46];
          const d: P = [rail.left - host.left + 1, el.top - host.top + el.height * 0.5];
          const dx = d[0] - a[0];
          return { a, b: [a[0] + dx * 0.55, a[1]] as P, c: [d[0] - dx * 0.4, d[1]] as P, d };
        }).filter((g): g is { a: P; b: P; c: P; d: P } => g !== null);
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
        const k = Math.min(1, (0.05 + 0.08 * r.attention * r.survival) * dim + (selected ? 0.4 : 0) + 0.55 * r.fracture);
        if (pv.acc > 0.035 && k > 0.15) {
          pv.acc = 0;
          if (pulses.length < PULSES * COHORTS.length) pulses.push({ c, born: now });
        } else if (pv.acc > 0.035) pv.acc = 0;
        const col = SIGNAL.map((v, i) => Math.round(v + (FRACTURE[i] - v) * Math.min(1, r.fracture * 1.4))).join(",");
        const g = geo[c];
        const p = paths[c];
        p.setAttribute("d", `M${g.a[0]},${g.a[1]} C${g.b[0]},${g.b[1]} ${g.c[0]},${g.c[1]} ${g.d[0]},${g.d[1]}`);
        p.setAttribute("stroke", `rgba(${col},${k.toFixed(3)})`);
        p.setAttribute("stroke-width", (0.6 + 0.9 * k).toFixed(2));
        p.dataset.intensity = k.toFixed(3);
      });
      for (let i = pulses.length - 1; i >= 0; i--) if (now - pulses[i].born > TRAVEL) pulses.splice(i, 1);
      dots.forEach((dot, i) => {
        const pl = pulses[i];
        if (!pl) {
          dot.setAttribute("opacity", "0");
          return;
        }
        const g = geo[pl.c];
        const u = (now - pl.born) / TRAVEL;
        const [x, y] = bez(g.a, g.b, g.c, g.d, u);
        dot.setAttribute("cx", x.toFixed(1));
        dot.setAttribute("cy", y.toFixed(1));
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
      {Array.from({ length: PULSES * COHORTS.length }, (_, i) => (
        <circle key={i} data-pulse r={1.8} fill="#dfe8ff" opacity={0} />
      ))}
    </svg>
  );
}
