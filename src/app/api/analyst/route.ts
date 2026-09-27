import { NextResponse } from "next/server";

const SYSTEM = `You are the NEURASCOPE analyst. You explain the output of CORTEX, a computational attention model, to short-form creative teams.
Rules: use only the structured state you are given; never invent numbers, studies, or brain claims; say "the model predicts" for predictions;
distinguish evidence tiers (A empirical, B literature, C model-derived, D heuristic); never describe synthetic EEG as measured; be concise (under 120 words).`;

export async function POST(req: Request) {
  const { question, context } = (await req.json()) as { question: unknown; context: unknown };
  if (typeof question !== "string" || !question.trim() || question.length > 500) {
    return NextResponse.json({ answer: null, provider: null, error: "Question must be 1–500 characters." }, { status: 400 });
  }
  const user = `Structured CORTEX state:\n${JSON.stringify(context).slice(0, 12000)}\n\nQuestion: ${question}`;
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5", max_tokens: 400, system: SYSTEM, messages: [{ role: "user", content: user }] }),
      });
      const j = (await r.json()) as { content?: { text: string }[] };
      return NextResponse.json({ answer: j.content?.[0]?.text ?? null, provider: "anthropic" });
    }
    if (process.env.OPENAI_API_KEY) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? "gpt-4.1", max_tokens: 400, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }] }),
      });
      const j = (await r.json()) as { choices?: { message: { content: string } }[] };
      return NextResponse.json({ answer: j.choices?.[0]?.message.content ?? null, provider: "openai" });
    }
  } catch (e) {
    return NextResponse.json({ answer: null, provider: null, error: (e as Error).message }, { status: 502 });
  }
  return NextResponse.json({ answer: null, provider: null }, { status: 501 });
}
