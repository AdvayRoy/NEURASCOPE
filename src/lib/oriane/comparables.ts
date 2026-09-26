import { OrianeClient } from "./client";
import type { OrianePlatform } from "./types";

export interface ComparableItem {
  id: string;
  platform: OrianePlatform;
  handle: string;
  caption: string | null;
  thumbnail: string | null;
  views: number;
  duration: number | null;
  engagementRate: number | null;
  similarity: number | null;
}

export interface CorpusSummary {
  available: true;
  query: string;
  count: number;
  medianDuration: number | null;
  medianViews: number | null;
  medianEngagementRate: number | null;
  items: ComparableItem[];
  requestId: string;
}

export type CorpusResult = CorpusSummary | { available: false; reason: string };

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Visually similar published content from the Oriane corpus (text or image asset → visual similarity search). */
export async function findComparables(input: { imageUrl?: string; text?: string; platform?: OrianePlatform }): Promise<CorpusResult> {
  const client = OrianeClient.fromEnv();
  if (!client) return { available: false, reason: "Corpus comparison unavailable: ORIANE_API_KEY is not configured." };
  if (!input.imageUrl && !input.text) return { available: false, reason: "No keyframe or description to search with." };
  try {
    const asset = await client.createAsset(
      input.imageUrl ? { type: "image", image: { type: "url", url: input.imageUrl } } : { type: "text", text: input.text!.slice(0, 500) },
    );
    const res = await client.searchContents(
      {
        operator: "and",
        filters: {
          format: { includes: ["video"] },
          visualSimilarity: { includes: { values: [{ assetId: asset.data.id, minScore: 0.3 }] } },
          ...(input.platform ? { platform: { includes: [input.platform] } } : {}),
        },
      },
      { projection: "full", limit: 24, sort: "visualSimilarity" },
    );
    const items: ComparableItem[] = res.data.results.map((r) => ({
      id: r.id,
      platform: r.platform,
      handle: r.profileHandle,
      caption: r.caption,
      thumbnail: r.thumbnailMediaUrl,
      views: r.viewsCount,
      duration: r.duration,
      engagementRate: r.engagementRatePerViews,
      similarity: r.frames?.reduce<number | null>((m, f) => (f.visualSimilarityScore !== undefined ? Math.max(m ?? 0, f.visualSimilarityScore) : m), null) ?? null,
    }));
    return {
      available: true,
      query: input.imageUrl ? "keyframe visual similarity" : `text: ${input.text!.slice(0, 80)}`,
      count: items.length,
      medianDuration: median(items.map((i) => i.duration).filter((x): x is number => x !== null)),
      medianViews: median(items.map((i) => i.views)),
      medianEngagementRate: median(items.map((i) => i.engagementRate).filter((x): x is number => x !== null)),
      items,
      requestId: res.metadata.requestId,
    };
  } catch (e) {
    return { available: false, reason: `Oriane corpus search failed: ${(e as Error).message}` };
  }
}
