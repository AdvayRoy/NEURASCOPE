import { describe, expect, it } from "vitest";
import { readouts, runCortex } from "../cortex";
import { DRIVER_META } from "../cortex/fractures";
import { testOntology } from "../cortex/testOntology";
import { deterministicAnswer } from "../analyst/analyst";
import { SOURCES } from "./sources";

describe("provenance tiers of displayed values", () => {
  const run = runCortex(testOntology(), { population: 1500 });

  it("labels every metrics readout as a CORTEX output (Tier C) with calibration sources retained", () => {
    for (const cohort of [null, 0]) {
      const r = readouts(run, 5, cohort);
      for (const v of Object.values(r)) {
        expect(v.tier).toBe("derived");
        expect(v.sources.length).toBeGreaterThan(0);
        for (const id of v.sources) expect(SOURCES[id]).toBeDefined();
      }
      expect(r.reliability.sources).toEqual(expect.arrayContaining(["madsen2021", "ki2016"]));
    }
  });

  it("never tags a fracture mechanism as empirical or literature", () => {
    for (const m of Object.values(DRIVER_META)) {
      expect(["derived", "heuristic"]).toContain(m.tier);
      for (const id of m.sources) expect(SOURCES[id]).toBeDefined();
    }
  });

  it("does not present BBBD as ingested empirical data", () => {
    expect(SOURCES.bbbd2026.tier).not.toBe("empirical");
    expect(SOURCES.bbbd2026.usage).toMatch(/not ingested/);
  });

  it("analyst describes EEG as a model-derived proxy", () => {
    const a = deterministicAnswer("is the eeg measured?", run, { fractureId: null, cohort: null, time: 3, counterfactuals: {} });
    expect(a.text).toMatch(/synthetic proxy/);
    expect(a.text).toMatch(/Tier C/);
    expect(a.text).not.toMatch(/\bmeasured EEG\b/i);
  });
});
