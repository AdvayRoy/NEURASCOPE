import { describe, expect, it } from "vitest";
import { runCortex } from "@/lib/cortex";
import { testOntology } from "@/lib/cortex/testOntology";
import { hazardReference, reviewerState } from "./reviewerState";

describe("reviewerState", () => {
  const run = runCortex(testOntology(), { population: 4000 });
  const base = hazardReference(run);
  it("is deterministic and bounded", () => {
    for (let c = 0; c < 4; c++) {
      const a = reviewerState(run, c, 3.1, base);
      expect(reviewerState(run, c, 3.1, base)).toEqual(a);
      for (const v of Object.values(a)) expect(v >= 0 && v <= 1).toBe(true);
    }
  });
  it("differentiates cohorts inside a fracture window from their own impact", () => {
    const f = run.fractures[0];
    if (!f) return;
    const t = (f.start + f.end) / 2;
    const s = [0, 1, 2, 3].map((c) => reviewerState(run, c, t, base).fracture);
    const loss = f.cohorts.map((x) => x.lossShare);
    const most = loss.indexOf(Math.max(...loss));
    const least = loss.indexOf(Math.min(...loss));
    expect(s[most]).toBeGreaterThan(s[least]);
  });
});
