"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { analystContext, deterministicAnswer, type AnalystAction, type AnalystAnswer } from "@/lib/analyst/analyst";
import { COHORTS } from "@/lib/cortex/params";
import { simulatePatch } from "@/lib/state/pipeline";
import { useLab } from "@/lib/state/store";

function runAction(a: AnalystAction) {
  const s = useLab.getState();
  if (a.kind === "select-fracture") s.selectFracture(a.id);
  else if (a.kind === "select-cohort") s.set({ cohort: a.index });
  else if (a.kind === "open-evidence") s.set({ evidence: { sourceIds: a.sourceIds, context: a.context } });
  else if (a.kind === "simulate") void simulatePatch(a.interventionId);
}

function actionLabel(a: AnalystAction) {
  const s = useLab.getState();
  if (a.kind === "select-fracture") return `Focus ${a.id}`;
  if (a.kind === "select-cohort") return a.index === null ? "All viewers" : COHORTS[a.index].label;
  if (a.kind === "open-evidence") return "Open evidence";
  return `Simulate ${s.run?.interventions.find((i) => i.id === a.interventionId)?.title ?? "patch"}`;
}

export function AskBar() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<AnalystAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const fractureId = useLab((s) => s.fractureId);
  const cohort = useLab((s) => s.cohort);
  const target = fractureId ? `Fracture ${fractureId}` : cohort !== null ? COHORTS[cohort].label : "this video";
  const suggestions = fractureId
    ? ["Why do people drop here?", "What evidence supports this?", "Which patch has the most upside?"]
    : ["Where is the biggest drop?", "What loses Cold Scrollers?", "Is the EEG measured?"];

  const ask = async (question: string) => {
    const s = useLab.getState();
    if (!s.run || !question.trim()) return;
    setBusy(true);
    const det = deterministicAnswer(question, s.run, { fractureId: s.fractureId, cohort: s.cohort, time: s.time, counterfactuals: s.counterfactuals });
    let ans = det;
    try {
      const r = await fetch("/api/analyst", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, context: analystContext(s.run, s.fractureId, s.cohort, s.time) }),
      });
      if (r.ok) {
        const j = (await r.json()) as { answer: string | null; provider: "anthropic" | "openai" | null };
        if (j.answer && j.provider) ans = { text: j.answer, actions: det.actions, provider: j.provider };
      }
    } catch {
      /* deterministic answer stands */
    }
    setAnswer(ans);
    setBusy(false);
  };

  return (
    <div className="pointer-events-auto relative mx-auto w-full max-w-[560px]">
      <AnimatePresence>
        {answer && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="glass absolute right-0 bottom-full left-0 mb-2 rounded-lg p-4"
          >
            <div className="label mb-2 flex justify-between">
              <span>NEURASCOPE · {answer.provider === "deterministic" ? "deterministic analyst" : `${answer.provider} analyst`}</span>
              <button onClick={() => setAnswer(null)} className="hover:text-fg" aria-label="Dismiss answer">×</button>
            </div>
            <p className="text-[12.5px] leading-[1.6] text-fg-2">{answer.text}</p>
            {answer.actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {answer.actions.map((a, i) => (
                  <button key={i} onClick={() => runAction(a)} className="rounded border border-line-2 px-2 py-1 text-[11px] text-fg-2 hover:border-fg-3 hover:text-fg">
                    {actionLabel(a)}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <form onSubmit={(e) => { e.preventDefault(); void ask(q); }} className="glass flex items-center gap-2 rounded-lg px-3 py-1.5">
        <span className="label shrink-0 !text-[9.5px]">Ask · {target}</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={suggestions[0]}
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg placeholder:text-fg-3 focus:outline-none"
          aria-label="Ask NEURASCOPE"
        />
        {busy && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />}
      </form>
      <div className="mt-1.5 flex justify-center gap-3">
        {suggestions.map((s) => (
          <button key={s} onClick={() => { setQ(s); void ask(s); }} className="text-[10.5px] text-fg-3 hover:text-fg-2">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
