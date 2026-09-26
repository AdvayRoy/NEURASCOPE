"use client";
import { motion } from "motion/react";
import { useLab } from "@/lib/state/store";

export function LoadingScreen() {
  const steps = useLab((s) => s.steps);
  const error = useLab((s) => s.error);
  const reset = useLab((s) => s.reset);
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="w-[440px]">
        <p className="label mb-8 text-center">NEURASCOPE</p>
        <ol className="space-y-3.5">
          {steps.map((s, i) => (
            <motion.li key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.2 }} className="flex items-baseline gap-4">
              <span className="num w-5 text-[11px] text-fg-3">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-[14px] ${
                    s.status === "active" ? "text-fg" : s.status === "done" ? "text-fg-2" : s.status === "error" ? "text-fracture" : "text-fg-3"
                  }`}
                >
                  {s.label}
                  {s.status === "active" && <span className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-signal align-middle" />}
                </div>
                {s.detail && <div className="mt-0.5 truncate text-[11px] text-fg-3">{s.detail}</div>}
              </div>
              <span className="label">{s.status === "done" ? "done" : s.status === "skipped" ? "n/a" : s.status === "error" ? "failed" : ""}</span>
            </motion.li>
          ))}
        </ol>
        {error && (
          <div className="mt-10 border-t border-line pt-5 text-[13px]">
            <p className="text-fracture">{error}</p>
            <button onClick={reset} className="mt-4 text-fg-2 underline decoration-line-2 underline-offset-4 hover:text-fg">
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
