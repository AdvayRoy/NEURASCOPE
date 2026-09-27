import { describe, expect, it } from "vitest";
import { runCortex, runCounterfactual } from "../cortex";
import { testOntology } from "../cortex/testOntology";
import { buildBrief, decisionSummary, primaryFracture, whyLine } from "./brief";

describe("pre-flight brief", () => {
  const ontology = testOntology();
  const run = runCortex(ontology);

  it("selects the fracture with the largest excess survival loss and never invents one", () => {
    const fr = primaryFracture(run);
    expect(fr).not.toBeNull();
    expect(fr!.lossPts).toBe(Math.max(...run.fractures.map((f) => f.lossPts)));
    expect(primaryFracture({ ...run, fractures: [] })).toBeNull();
    expect(decisionSummary({ ...run, fractures: [] }, {}, {}).primaryRisk).toBeNull();
  });

  it("composes why/observed/recommendation from existing run state", () => {
    const b = buildBrief(run);
    const fr = b.primary!;
    expect(b.why).toBe(whyLine(fr));
    expect(b.why).toMatch(/^[A-Z].*\.$/);
    expect(b.observed.length).toBeGreaterThan(0);
    expect(b.recommended?.fractureId).toBe(fr.id);
    expect(b.recommended!.addresses).toContain(fr.drivers.find((d) => b.recommended!.addresses.includes(d.key))!.key);
  });

  it("reports the real counterfactual delta with model-derived language", () => {
    const b = buildBrief(run);
    const cf = runCounterfactual(ontology, run, b.recommended!);
    const d = decisionSummary(run, { [cf.intervention.id]: cf }, {});
    expect(d.simulated?.deltaPts).toBe(cf.deltaPts);
    expect(d.simulated?.note).toMatch(/Tier C/);
    expect(d.simulated?.note).toMatch(/not a guaranteed uplift/);
    expect(d.corpusComparables).toBeNull();
  });
});
