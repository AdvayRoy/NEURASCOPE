import { describe, expect, it } from "vitest";
import { runCortex } from "../cortex/index";
import { testOntology } from "../cortex/testOntology";
import { buildBenchmarks, measureAtRelativePosition, retrieveCorpusEvidence, type CorpusItem } from "./comparables";
import { buildFractureFingerprint, extractTerms, FINGERPRINT_LIMITS } from "./fingerprint";
import type { OrianeContentFull } from "./types";

const o = testOntology();
const run = runCortex(o, { population: 2000 });

describe("FractureFingerprint", () => {
  it("is built from the fracture window and ontology without touching CORTEX outputs", () => {
    const fr = run.fractures[0];
    expect(fr).toBeDefined();
    const fp = buildFractureFingerprint(fr, { ...o, source: "oriane-live", platform: "tiktok", platformId: "123", hashtags: ["#skincare"], caption: "Glow routine" });
    expect(fp.fractureId).toBe(fr.id);
    expect(fp.window).toEqual({ start: fr.start, end: fr.end, peak: fr.peak });
    expect(fp.relativePosition).toBeCloseTo(fr.start / o.duration, 6);
    expect(fp.drivers.length).toBeGreaterThan(0);
    expect(fp.drivers.length).toBeLessThanOrEqual(3);
    expect(fp.drivers.map((d) => d.key)).toEqual(fr.drivers.slice(0, 3).map((d) => d.key));
    expect(fp.terms.length).toBeLessThanOrEqual(FINGERPRINT_LIMITS.terms);
    expect(fp.terms).toContain("skincare");
    expect(fp.structure.payoff).toBe(fr.observed.payoff.status);
    expect(fp.transcriptWindow.length).toBeLessThanOrEqual(FINGERPRINT_LIMITS.transcriptChars);
    for (const w of fp.transcriptWindow.split(" ").slice(0, 3)) expect(o.transcript.some((s) => s.text.includes(w))).toBe(true);
  });

  it("never fabricates a keyframe for non-live sources and drops oversized frames", () => {
    const fr = run.fractures[0];
    const local = buildFractureFingerprint(fr, { ...o, source: "local-only", keyframes: [{ t: fr.peak, url: "https://x.test/k.jpg" }] });
    expect(local.keyframeUrl).toBeNull();
    expect(local.structure.keyframeCadence).toBeNull();
    const live = buildFractureFingerprint(fr, { ...o, source: "oriane-live", keyframes: [{ t: fr.peak - 1, url: "https://x.test/k.jpg" }] });
    expect(live.keyframeUrl).toBe("https://x.test/k.jpg");
    expect(live.structure.keyframeCadence).toBeCloseTo((1 / (Math.min(o.duration, fr.end + 3) - Math.max(0, fr.start - 3))) * 10, 6);
    const big = buildFractureFingerprint(fr, o, { mediaType: "image/jpeg", base64: "A".repeat(FINGERPRINT_LIMITS.frameBase64Chars + 1) });
    expect(big.frame).toBeNull();
  });

  it("extracts content words, dropping stopwords and short tokens", () => {
    const terms = extractTerms("so this is the the routine routine I use every morning", "My glow", ["#SkinCare"]);
    expect(terms[0]).toBe("routine");
    expect(terms).toContain("skincare");
    expect(terms).not.toContain("the");
    expect(terms).not.toContain("so");
  });
});

const content = (over: Partial<OrianeContentFull>): OrianeContentFull =>
  ({
    id: "c",
    platform: "tiktok",
    platformId: "1",
    format: "video",
    profileHandle: "h",
    caption: null,
    hashtags: [],
    duration: 30,
    viewsCount: 1000,
    likesCount: 10,
    sharesCount: 1,
    commentsCount: 1,
    engagementRatePerViews: 0.012,
    thumbnailMediaUrl: null,
    transcriptChunks: [],
    frames: [],
    ...over,
  }) as unknown as OrianeContentFull;

describe("corpus measurement and benchmarks", () => {
  it("measures speech density and keyframe cadence at the same relative position", () => {
    const c = content({
      duration: 20,
      transcriptChunks: [
        { startSeconds: 8, endSeconds: 10, text: "one two three four" },
        { startSeconds: 10, endSeconds: 12, text: "five six" },
        { startSeconds: 18, endSeconds: 20, text: "far away words" },
      ],
      frames: [7.5, 9, 10, 12.5, 19].map((t, i) => ({ id: String(i), position: i, timestampSeconds: t, url: "https://x.test/f.jpg" })),
    });
    const m = measureAtRelativePosition(c, 0.5); // t=10, window 7–13
    expect(m.speechDensity).toBeCloseTo(6 / 6, 6);
    expect(m.keyframeCadence).toBeCloseTo((4 / 6) * 10, 6);
    expect(m.excerpt).toContain("one two three four");
  });

  it("ships a benchmark only when at least three comparables can be measured on it", () => {
    const fp = buildFractureFingerprint(run.fractures[0], o);
    const item = (i: number, sd: number | null): CorpusItem => ({
      id: String(i),
      platform: "tiktok",
      handle: "h",
      caption: null,
      thumbnail: null,
      views: 1,
      duration: 20 + i,
      engagementRate: null,
      similarity: null,
      url: "",
      matchedBy: ["transcript"],
      excerpt: null,
      speechDensity: sd,
      keyframeCadence: null,
    });
    const two = buildBenchmarks(fp, [item(1, 1), item(2, 2)]);
    expect(two.find((b) => b.id === "speechDensity")).toBeUndefined();
    const three = buildBenchmarks(fp, [item(1, 1), item(2, 2), item(3, 4)]);
    const sd = three.find((b) => b.id === "speechDensity")!;
    expect(sd.corpusMedian).toBe(2);
    expect(sd.n).toBe(3);
    expect(three.find((b) => b.id === "keyframeCadence")).toBeUndefined();
    expect(three.find((b) => b.id === "duration")?.corpusMedian).toBe(22);
  });

  it("reports unavailable (not fixture data) when no provider client exists", async () => {
    const r = await retrieveCorpusEvidence(buildFractureFingerprint(run.fractures[0], o), null);
    expect(r.available).toBe(false);
    if (!r.available) expect(r.reason).toMatch(/ORIANE_API_KEY/);
  });
});
