export type EvidenceTier = "empirical" | "literature" | "derived" | "heuristic";

export const TIER_LETTER: Record<EvidenceTier, "A" | "B" | "C" | "D"> = {
  empirical: "A",
  literature: "B",
  derived: "C",
  heuristic: "D",
};

export const TIER_LABEL: Record<EvidenceTier, string> = {
  empirical: "Empirical",
  literature: "Literature",
  derived: "Model-derived",
  heuristic: "Heuristic",
};

/** What each tier means for a displayed value: how the number itself is produced. */
export const TIER_DESCRIPTION: Record<EvidenceTier, string> = {
  empirical: "Observed source data (Oriane-live metrics or locally measured frame/audio signals).",
  literature: "A published constant or effect direction, shown as published.",
  derived: "Computed by CORTEX from video features; cited literature calibrates the mechanism but did not produce this number.",
  heuristic: "Hand-set NEURASCOPE constant or rule, not fitted to data.",
};

export interface ProvenancedValue<T = number> {
  value: T;
  tier: EvidenceTier;
  sources: string[];
  method: string;
  confidence?: number;
}

export function pv<T>(value: T, tier: EvidenceTier, sources: string[], method: string, confidence?: number): ProvenancedValue<T> {
  return { value, tier, sources, method, confidence };
}
