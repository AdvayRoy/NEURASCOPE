import { NextResponse } from "next/server";
import { findComparables } from "@/lib/oriane/comparables";
import type { OrianePlatform } from "@/lib/oriane/types";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { imageUrl?: string; text?: string; platform?: OrianePlatform };
  const platform = body.platform === "tiktok" || body.platform === "instagram" ? body.platform : undefined;
  const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.length <= 2048 ? body.imageUrl : undefined;
  const text = typeof body.text === "string" ? body.text.slice(0, 300) : undefined;
  return NextResponse.json(await findComparables({ imageUrl, text, platform }));
}
