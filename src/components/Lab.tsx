"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { loadRun } from "@/lib/state/persist";
import { runPipeline } from "@/lib/state/pipeline";
import { useLab } from "@/lib/state/store";
import { InputScreen } from "./InputScreen";
import { LoadingScreen } from "./LoadingScreen";

const Workspace = dynamic(() => import("./Workspace").then((m) => m.Workspace), { ssr: false });

export function Lab() {
  const phase = useLab((s) => s.phase);
  useEffect(() => {
    let live = true;
    void loadRun().then((r) => {
      if (!live || !r || useLab.getState().phase !== "input") return;
      useLab.getState().set({ context: r.saved.context });
      void runPipeline({ url: r.saved.url, fixture: r.saved.fixture, file: r.file, restored: r.ontology });
    });
    return () => { live = false; };
  }, []);
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-ink">
      <AnimatePresence mode="wait">
        {phase === "input" && (
          <motion.div key="input" className="absolute inset-0" exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <InputScreen />
          </motion.div>
        )}
        {phase === "loading" && (
          <motion.div key="loading" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <LoadingScreen />
          </motion.div>
        )}
        {phase === "workspace" && (
          <motion.div key="ws" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            <Workspace />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
