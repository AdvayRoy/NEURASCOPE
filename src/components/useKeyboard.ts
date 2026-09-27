"use client";
import { useEffect } from "react";
import { useLab } from "@/lib/state/store";

export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return;
      const s = useLab.getState();
      if (e.code === "Space") {
        e.preventDefault();
        s.set({ playing: !s.playing });
      } else if (e.key === "ArrowRight") s.seek(s.time + (e.shiftKey ? 1 : 0.1));
      else if (e.key === "ArrowLeft") s.seek(s.time - (e.shiftKey ? 1 : 0.1));
      else if (e.key === "Escape") {
        if (s.evidence) s.set({ evidence: null });
        else if (s.brief) s.set({ brief: false });
        else s.set({ fractureId: null, network: null, activeCf: null });
      } else if (/^[1-9]$/.test(e.key)) {
        const fr = s.run?.fractures[Number(e.key) - 1];
        if (fr) s.selectFracture(fr.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
