import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    oriane: Boolean(process.env.ORIANE_API_KEY),
    analystLlm: process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.OPENAI_API_KEY ? "openai" : null,
  });
}
