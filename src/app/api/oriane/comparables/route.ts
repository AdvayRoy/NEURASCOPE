import { NextResponse } from "next/server";
import { findComparables } from "@/lib/oriane/comparables";
import type { OrianePlatform } from "@/lib/oriane/types";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { imageUrl?: string; text?: string; platform?: OrianePlatform };
  return NextResponse.json(await findComparables(body));
}
