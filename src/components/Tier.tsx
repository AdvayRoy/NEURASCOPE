"use client";
import { TIER_LABEL, TIER_LETTER, type EvidenceTier } from "@/lib/evidence/provenance";
import { useLab } from "@/lib/state/store";

const TONE: Record<EvidenceTier, string> = {
  empirical: "text-fg border-fg-2/60",
  literature: "text-fg-2 border-fg-3",
  derived: "text-fg-3 border-line-2",
  heuristic: "text-fg-3 border-dashed border-fg-3/70",
};

/** Provenance tier chip. Clicking opens the Evidence drawer on the given sources. */
export function Tier({ tier, sources, context }: { tier: EvidenceTier; sources?: string[]; context?: string }) {
  const set = useLab((s) => s.set);
  return (
    <button
      type="button"
      title={`${TIER_LETTER[tier]} · ${TIER_LABEL[tier]}${sources?.length ? " · open evidence" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        if (sources?.length) set({ evidence: { sourceIds: sources, context: context ?? TIER_LABEL[tier] } });
      }}
      className={`inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[3px] border font-mono text-[9px] leading-none transition-colors hover:border-fg hover:text-fg ${TONE[tier]}`}
    >
      {TIER_LETTER[tier]}
    </button>
  );
}
