export type EvidenceTier = "empirical" | "literature" | "derived" | "heuristic";

export const TIER_LETTER: Record<EvidenceTier, "A" | "B" | "C" | "D"> = {
  empirical: "A",
  literature: "B",
  derived: "C",
  heuristic: "D",
};

export const TIER_LABEL: Record<EvidenceTier, string> = {
  empirical: "Empirical",
  literature: "Literature-calibrated",
  derived: "Model-derived",
  heuristic: "Heuristic",
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
