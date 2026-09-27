import { OrianeClient } from "./client";
import { FINGERPRINT_WINDOW_PAD, type FractureFingerprint } from "./fingerprint";
import type { OrianeContentFilters, OrianeContentFull, OrianePlatform, OrianeSearchContentsResponse } from "./types";

export interface ComparableItem {
  id: string;
  platform: OrianePlatform;
  handle: string;
  caption: string | null;
  thumbnail: string | null;
  views: number;
  duration: number | null;
  /** Oriane `engagementRatePerViews`, already in percent. */
  engagementRate: number | null;
  /** Mean visual-similarity score over the frames Oriane matched (0..1), when retrieved visually. */
  similarity: number | null;
}

/** One published video retrieved for a fracture fingerprint. */
export interface CorpusItem extends ComparableItem {
  url: string;
  matchedBy: ("visual" | "transcript")[];
  /** Transcript chunk around the same relative position as the fracture, when Oriane returned timed chunks. */
  excerpt: string | null;
  /** Words per second in the ±3 s window at the same relative position. */
  speechDensity: number | null;
  /** Oriane-indexed keyframes per 10 s in that window. */
  keyframeCadence: number | null;
}

export type BenchmarkId = "speechDensity" | "keyframeCadence" | "duration";

/** Structural comparison between the source fracture window and the retrieved set. Descriptive only. */
export interface CorpusBenchmark {
  id: BenchmarkId;
  label: string;
  unit: string;
  /** Source value for this fracture (null when the source cannot be measured on the same scale). */
  source: number | null;
  corpusMedian: number;
  /** Comparables contributing to the median. */
  n: number;
  note: string;
}

export interface CorpusEvidence {
  available: true;
  fractureId: string;
  retrieval: {
    visual: "oriane-keyframe" | "local-frame" | null;
    terms: string[];
    language: string | null;
    platform: OrianePlatform | null;
  };
  matched: { visual: number | null; transcript: number | null };
  items: CorpusItem[];
  benchmarks: CorpusBenchmark[];
  /** Distribution / performance context of the retrieved set · not retention ground truth. */
  context: { medianViews: number | null; medianEngagementRate: number | null; n: number };
  requestIds: string[];
  disclaimer: string;
}

export type CorpusResult = CorpusEvidence | { available: false; fractureId: string | null; reason: string };

export const CORPUS_DISCLAIMER =
  "Oriane observes and retrieves published content; CORTEX predicts. Corpus statistics are descriptive reference points and platform performance context — not retention ground truth and never a CORTEX input.";

const MAX_ITEMS = 6;
const PER_QUERY = 12;

export const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = xs.slice().sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

export function isPublicHttpsUrl(raw: string) {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  const h = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || u.username || u.password) return false;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (/^[\d.]+$/.test(h) || h.includes(":") || h.startsWith("[")) return false;
  return true;
}

export function contentUrl(platform: OrianePlatform, handle: string, platformId: string) {
  return platform === "tiktok" ? `https://www.tiktok.com/@${handle}/video/${platformId}` : `https://www.instagram.com/p/${platformId}/`;
}

const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;

function meanSimilarity(c: OrianeContentFull) {
  const s = (c.frames ?? []).map((f) => f.visualSimilarityScore).filter((x): x is number => typeof x === "number");
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null;
}

/** Measures a comparable in the ±pad window around the same relative position as the source fracture. */
export function measureAtRelativePosition(c: OrianeContentFull, relativePosition: number, pad = FINGERPRINT_WINDOW_PAD) {
  const chunks = c.transcriptChunks ?? [];
  const frames = c.frames ?? [];
  const dur = c.duration && c.duration > 0 ? c.duration : Math.max(chunks.at(-1)?.endSeconds ?? 0, frames.at(-1)?.timestampSeconds ?? 0);
  if (!(dur > 0)) return { speechDensity: null, keyframeCadence: null, excerpt: null };
  const t = relativePosition * dur;
  const w0 = Math.max(0, t - pad);
  const w1 = Math.min(dur, t + pad);
  const span = w1 - w0;
  if (span <= 0) return { speechDensity: null, keyframeCadence: null, excerpt: null };
  const inWin = chunks.filter((ch) => ch.endSeconds >= w0 && ch.startSeconds <= w1);
  const speechDensity = chunks.length ? inWin.reduce((n, ch) => n + countWords(ch.text), 0) / span : null;
  const keyframeCadence = frames.length ? (frames.filter((f) => f.timestampSeconds >= w0 && f.timestampSeconds <= w1).length / span) * 10 : null;
  const excerpt = inWin.length ? inWin.map((ch) => ch.text.trim()).join(" ").slice(0, 160) : null;
  return { speechDensity, keyframeCadence, excerpt };
}

function toItem(r: OrianeContentFull, matchedBy: CorpusItem["matchedBy"], relativePosition: number): CorpusItem {
  const m = measureAtRelativePosition(r, relativePosition);
  return {
    id: r.id,
    platform: r.platform,
    handle: r.profileHandle,
    caption: r.caption,
    thumbnail: r.thumbnailMediaUrl,
    views: r.viewsCount,
    duration: r.duration,
    engagementRate: r.engagementRatePerViews,
    similarity: matchedBy.includes("visual") ? meanSimilarity(r) : null,
    url: contentUrl(r.platform, r.profileHandle, r.platformId),
    matchedBy,
    excerpt: m.excerpt,
    speechDensity: m.speechDensity,
    keyframeCadence: m.keyframeCadence,
  };
}

/** Builds at most two benchmarks from the retrieved items; a dimension ships only when ≥3 comparables can be measured on it. */
export function buildBenchmarks(fp: FractureFingerprint, items: CorpusItem[]): CorpusBenchmark[] {
  const out: CorpusBenchmark[] = [];
  const sd = items.map((i) => i.speechDensity).filter((x): x is number => x !== null);
  const sdMed = median(sd);
  if (sd.length >= 3 && sdMed !== null) {
    out.push({
      id: "speechDensity",
      label: "Speech density at the same relative point",
      unit: "words/s",
      source: fp.structure.speechDensity,
      corpusMedian: sdMed,
      n: sd.length,
      note: `Words spoken per second in a ±${FINGERPRINT_WINDOW_PAD} s window at ${Math.round(fp.relativePosition * 100)}% of each video, from Oriane transcript chunks.`,
    });
  }
  const kc = items.map((i) => i.keyframeCadence).filter((x): x is number => x !== null);
  const kcMed = median(kc);
  if (kc.length >= 3 && kcMed !== null) {
    out.push({
      id: "keyframeCadence",
      label: "Indexed keyframe cadence at the same relative point",
      unit: "per 10 s",
      source: fp.structure.keyframeCadence,
      corpusMedian: kcMed,
      n: kc.length,
      note: "Oriane-indexed keyframes in the same ±3 s window. Source value shown only when the source is itself Oriane-indexed; locally measured cuts are a different measure.",
    });
  }
  const du = items.map((i) => i.duration).filter((x): x is number => x !== null && x > 0);
  const duMed = median(du);
  if (du.length >= 3 && duMed !== null) {
    out.push({ id: "duration", label: "Duration", unit: "s", source: fp.duration > 0 ? fp.duration : null, corpusMedian: duMed, n: du.length, note: "Published duration of the retrieved videos." });
  }
  return out.slice(0, 2);
}

/**
 * Fracture-conditioned corpus retrieval: one visual-similarity query (keyframe or local frame) and one fuzzy-transcript
 * query built from the fingerprint's terms, merged and ranked. Two provider searches at most, plus one asset upload.
 */
export async function retrieveCorpusEvidence(fp: FractureFingerprint, client = OrianeClient.fromEnv()): Promise<CorpusResult> {
  if (!client) return { available: false, fractureId: fp.fractureId, reason: "Corpus evidence unavailable: ORIANE_API_KEY is not configured." };
  const visualSource: CorpusEvidence["retrieval"]["visual"] = fp.keyframeUrl && isPublicHttpsUrl(fp.keyframeUrl) ? "oriane-keyframe" : fp.frame ? "local-frame" : null;
  const terms = fp.terms.slice(0, 6);
  if (!visualSource && !terms.length) return { available: false, fractureId: fp.fractureId, reason: "Nothing to retrieve with: no frame near the fracture and no spoken words, caption or hashtags." };

  const base: OrianeContentFilters = { format: { includes: ["video"] }, ...(fp.platform ? { platform: { includes: [fp.platform] } } : {}) };
  const requestIds: string[] = [];
  try {
    const visualQuery = async (): Promise<OrianeSearchContentsResponse | null> => {
      if (!visualSource) return null;
      const asset = await client.createAsset(
        visualSource === "oriane-keyframe"
          ? { type: "image", image: { type: "url", url: fp.keyframeUrl! } }
          : { type: "image", image: { type: "base64", mediaType: fp.frame!.mediaType, base64: fp.frame!.base64 } },
      );
      requestIds.push(asset.metadata.requestId);
      return client.searchContents(
        { operator: "and", filters: { ...base, visualSimilarity: { includes: { values: [{ assetId: asset.data.id, minScore: 0.3 }] } } } },
        { projection: "full", limit: PER_QUERY, sort: "visualSimilarity" },
      );
    };
    const transcriptQuery = async (): Promise<OrianeSearchContentsResponse | null> => {
      if (!terms.length) return null;
      return client.searchContents(
        {
          operator: "and",
          filters: {
            ...base,
            ...(fp.transcriptLanguage ? { transcriptLanguage: { includes: [fp.transcriptLanguage] } } : {}),
            transcript: { includesFuzzy: { values: terms, operator: "or" } },
          },
        },
        { projection: "full", limit: PER_QUERY, sort: "transcriptRelevance" },
      );
    };
    const [vis, txt] = await Promise.allSettled([visualQuery(), transcriptQuery()]);
    const visRes = vis.status === "fulfilled" ? vis.value : null;
    const txtRes = txt.status === "fulfilled" ? txt.value : null;
    if (vis.status === "rejected") console.error("Oriane visual retrieval failed", vis.reason);
    if (txt.status === "rejected") console.error("Oriane transcript retrieval failed", txt.reason);
    if (!visRes && !txtRes) return { available: false, fractureId: fp.fractureId, reason: "Oriane corpus retrieval failed." };
    for (const r of [visRes, txtRes]) if (r) requestIds.push(r.metadata.requestId);

    const ranked = new Map<string, { r: OrianeContentFull; score: number; by: CorpusItem["matchedBy"] }>();
    visRes?.data.results.forEach((r) => {
      if (r.platformId === fp.platformId) return;
      ranked.set(r.id, { r, score: meanSimilarity(r) ?? 0.3, by: ["visual"] });
    });
    txtRes?.data.results.forEach((r, i) => {
      if (r.platformId === fp.platformId) return;
      const s = 0.5 + 0.5 * (1 - i / PER_QUERY);
      const prev = ranked.get(r.id);
      if (prev) ranked.set(r.id, { r, score: prev.score + s, by: ["visual", "transcript"] });
      else ranked.set(r.id, { r, score: s, by: ["transcript"] });
    });
    const items = [...ranked.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ITEMS)
      .map(({ r, by }) => toItem(r, by, fp.relativePosition));
    if (!items.length) return { available: false, fractureId: fp.fractureId, reason: "Oriane returned no comparable published videos for this fracture." };
    const er = items.map((i) => i.engagementRate).filter((x): x is number => x !== null);
    return {
      available: true,
      fractureId: fp.fractureId,
      retrieval: { visual: visRes ? visualSource : null, terms: txtRes ? terms : [], language: fp.transcriptLanguage, platform: fp.platform },
      matched: { visual: visRes?.metadata.pagination?.totalCount ?? null, transcript: txtRes?.metadata.pagination?.totalCount ?? null },
      items,
      benchmarks: buildBenchmarks(fp, items),
      context: { medianViews: median(items.map((i) => i.views)), medianEngagementRate: median(er), n: items.length },
      requestIds,
      disclaimer: CORPUS_DISCLAIMER,
    };
  } catch (e) {
    console.error("Oriane corpus retrieval failed", e);
    return { available: false, fractureId: fp.fractureId, reason: "Oriane corpus retrieval failed." };
  }
}
