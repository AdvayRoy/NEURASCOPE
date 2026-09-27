import { NextResponse } from "next/server";
import { findComparables, type CorpusResult } from "@/lib/oriane/comparables";
import { BoundedCache, rateLimit } from "@/lib/server/rateLimit";
import type { OrianePlatform } from "@/lib/oriane/types";

const cache = new BoundedCache<CorpusResult>(200, 30 * 60_000);

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { imageUrl?: unknown; text?: unknown; platform?: unknown };
  const platform: OrianePlatform | undefined = body.platform === "tiktok" || body.platform === "instagram" ? body.platform : undefined;
  const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.length <= 2048 ? body.imageUrl : undefined;
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 300) : undefined;
  const key = JSON.stringify([imageUrl ?? null, imageUrl ? null : (text ?? null), platform ?? null]);
  const hit = cache.get(key);
  if (hit) return NextResponse.json(hit, { headers: { "x-neurascope-cache": "hit" } });
  if (process.env.ORIANE_API_KEY) {
    const limited = rateLimit(req, { name: "comparables", capacity: 6, perMinute: 4 });
    if (limited) return limited;
  }
  const result = await findComparables({ imageUrl, text, platform });
  if (result.available) cache.set(key, result);
  return NextResponse.json(result);
}
