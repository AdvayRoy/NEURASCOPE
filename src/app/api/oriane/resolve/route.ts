import { NextResponse } from "next/server";
import { resolveLive } from "@/lib/oriane/adapter";
import { rateLimit } from "@/lib/server/rateLimit";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: unknown };
  const url = typeof body.url === "string" ? body.url.slice(0, 2048) : "";
  if (process.env.ORIANE_API_KEY) {
    const limited = rateLimit(req, { name: "oriane-resolve", capacity: 10, perMinute: 6 });
    if (limited) return limited;
  }
  const r = await resolveLive(url);
  if (!r.ok) return NextResponse.json({ error: { code: r.code, message: r.message } }, { status: r.status });
  return NextResponse.json({ ontology: r.ontology });
}
