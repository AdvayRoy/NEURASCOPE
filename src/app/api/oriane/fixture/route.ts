import { NextResponse } from "next/server";
import { resolveFixture } from "@/lib/oriane/adapter";

export async function GET() {
  return NextResponse.json({ ontology: resolveFixture() });
}
