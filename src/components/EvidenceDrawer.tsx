"use client";
import { AnimatePresence, motion } from "motion/react";
import { TIER_LABEL, TIER_LETTER } from "@/lib/evidence/provenance";
import { SOURCES } from "@/lib/evidence/sources";
import { useLab } from "@/lib/state/store";

const ROWS: [keyof (typeof SOURCES)[string], string][] = [
  ["experiment", "Experiment / dataset"],
  ["measured", "Measured variable"],
  ["finding", "Finding used"],
  ["usage", "How NEURASCOPE uses it"],
  ["limitation", "Limitation"],
];

export function EvidenceDrawer() {
  const ev = useLab((s) => s.evidence);
  const set = useLab((s) => s.set);
  return (
    <AnimatePresence>
      {ev && (
        <>
          <motion.div key="scrim" className="fixed inset-0 z-40 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => set({ evidence: null })} />
          <motion.aside
            key="drawer"
            role="dialog"
            aria-label="Evidence"
            className="glass fixed top-0 right-0 bottom-0 z-50 flex w-[460px] flex-col !border-y-0 !border-r-0"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
          >
            <div className="flex items-start justify-between border-b border-line px-6 py-4">
              <div>
                <div className="label">Evidence</div>
                <div className="mt-1 text-[13px] text-fg-2">{ev.context}</div>
              </div>
              <button onClick={() => set({ evidence: null })} className="text-[12px] text-fg-3 hover:text-fg" aria-label="Close evidence">
                Close
              </button>
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto px-6 py-2">
              {ev.sourceIds.map((id) => SOURCES[id]).filter(Boolean).map((s) => (
                <article key={s.id} className="border-b border-line py-5 last:border-0">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border border-line-2 font-mono text-[10px] text-fg-2" title={TIER_LABEL[s.tier]}>
                      {TIER_LETTER[s.tier]}
                    </span>
                    <div className="min-w-0">
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-[13.5px] leading-snug text-fg hover:underline">
                        {s.title}
                      </a>
                      <div className="mt-1 text-[11.5px] text-fg-3">
                        {s.authors} · {s.year} · {s.venue} · {TIER_LABEL[s.tier]}
                      </div>
                    </div>
                  </div>
                  <dl className="mt-3 space-y-2.5 pl-[30px]">
                    {ROWS.map(([k, label]) => (
                      <div key={k}>
                        <dt className="label !text-[9px]">{label}</dt>
                        <dd className="mt-0.5 text-[12px] leading-[1.55] text-fg-2">{String(s[k])}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
