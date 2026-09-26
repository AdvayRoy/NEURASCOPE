import { describe, expect, it } from "vitest";
import { runCortex, runCounterfactual } from "./index";
import { testOntology } from "./testOntology";
import { samplePopulation } from "./population";
import { COHORTS } from "./params";

describe("synthetic population", () => {
  it("is deterministic for a seed and follows the audience mix", () => {
    const a = samplePopulation(4000, 7, "feed");
    const b = samplePopulation(4000, 7, "feed");
    expect(Array.from(a.base.slice(0, 50))).toEqual(Array.from(b.base.slice(0, 50)));
    const cold = a.cohort.filter((c) => c === 0).length / a.size;
    expect(cold).toBeGreaterThan(0.4);
    expect(cold).toBeLessThan(0.52);
  });

  it("samples baseline ISC near the Madsen 2021 medians", () => {
    const p = samplePopulation(20000, 3, "feed");
    const att = Array.from(p.isc).filter((_, i) => !p.distracted[i]).sort((x, y) => x - y);
    expect(att[Math.floor(att.length / 2)]).toBeCloseTo(0.35, 1);
  });
});

describe("CORTEX", () => {
  const o = testOntology();
  const run = runCortex(o, { population: 3000 });

  it("produces a monotone, bounded retention curve from viewer survival", () => {
    const r = run.sim.retention;
    expect(r[0]).toBeCloseTo(1, 5);
    for (let k = 1; k < r.length; k++) expect(r[k]).toBeLessThanOrEqual(r[k - 1] + 1e-6);
    expect(r[r.length - 1]).toBeGreaterThan(0.05);
    expect(r[r.length - 1]).toBeLessThan(0.9);
  });

  it("concrete exit times agree with expected survival", () => {
    const t = 10;
    const alive = Array.from(run.sim.exitTime).filter((x) => x > t).length / run.sim.size;
    expect(Math.abs(alive - run.sim.retention[t * run.sim.hz])).toBeLessThan(0.04);
  });

  it("is deterministic", () => {
    const again = runCortex(o, { population: 3000 });
    expect(Array.from(again.sim.retention)).toEqual(Array.from(run.sim.retention));
  });

  it("cold scrollers drop faster than intent viewers in the hook", () => {
    const k = 2 * run.sim.hz;
    const cold = run.sim.retentionByCohort[COHORTS.findIndex((c) => c.id === "cold")][k];
    const intent = run.sim.retentionByCohort[COHORTS.findIndex((c) => c.id === "intent")][k];
    expect(cold).toBeLessThan(intent);
  });

  it("detects a fracture in the static, low-progression stretch with an interpretable mechanism", () => {
    expect(run.fractures.length).toBeGreaterThan(0);
    const f = run.fractures.find((x) => x.start >= 7 && x.start <= 13);
    expect(f).toBeDefined();
    expect(f!.drivers.length).toBeGreaterThan(0);
    expect(f!.drivers.map((d) => d.key)).toEqual(expect.arrayContaining(["static"]));
  });

  it("counterfactual interventions rerun the model and can improve retention", () => {
    const f = run.fractures.find((x) => x.start >= 7 && x.start <= 13)!;
    const iv = run.interventions.filter((i) => i.fractureId === f.id);
    expect(iv.length).toBeGreaterThan(0);
    const results = iv.map((i) => runCounterfactual(o, run, i));
    expect(Math.max(...results.map((r) => r.deltaPts))).toBeGreaterThan(0.5);
    for (const r of results) expect(r.run.sim.retention).not.toBe(run.sim.retention);
  });

  it("holds semantic terms at a neutral prior when no transcript is available", () => {
    const r = runCortex(testOntology({ transcript: [] }), { population: 1000 });
    expect(r.timeline.availability.transcript).toBe(false);
    expect(r.drivers.progression[50]).toBeCloseTo(0.5, 5);
  });
});
