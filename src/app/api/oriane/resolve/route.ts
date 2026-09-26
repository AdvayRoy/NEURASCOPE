import { NextResponse } from "next/server";
import { resolveLive } from "@/lib/oriane/adapter";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { url?: string };
  const r = await resolveLive(body.url ?? "");
  if (!r.ok) return NextResponse.json({ error: { code: r.code, message: r.message } }, { status: r.status });
  return NextResponse.json({ ontology: r.ontology });
}
