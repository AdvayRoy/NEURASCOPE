"use client";
import { create } from "zustand";
import type { Counterfactual, CortexRun } from "../cortex";
import type { AudienceContextId } from "../cortex/params";
import type { NetworkId } from "../cortex/networks";
import type { VideoOntology } from "../ontology";

export type Phase = "input" | "loading" | "workspace";
export type BrainMode = "cortex" | "networks" | "neural";

export interface PipelineStep {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "skipped" | "error";
  detail?: string;
}

export interface EvidenceFocus {
  sourceIds: string[];
  context: string;
}

interface State {
  phase: Phase;
  steps: PipelineStep[];
  error: string | null;
  ontology: VideoOntology | null;
  mediaUrl: string | null;
  run: CortexRun | null;
  context: AudienceContextId;
  time: number;
  playing: boolean;
  cohort: number | null;
  fractureId: string | null;
  network: NetworkId | null;
  mode: BrainMode;
  counterfactuals: Record<string, Counterfactual>;
  activeCf: string | null;
  cfPending: string | null;
  evidence: EvidenceFocus | null;
  /** Monotonic counter bumped when the time is changed by a user seek (not playback). */
  seekNonce: number;
  hoverRegion: { name: string; networks: NetworkId[] } | null;
  set: (p: Partial<State>) => void;
  seek: (t: number) => void;
  selectFracture: (id: string | null) => void;
  reset: () => void;
}

const initial = {
  phase: "input" as Phase,
  steps: [],
  error: null,
  ontology: null,
  mediaUrl: null,
  run: null,
  context: "feed" as AudienceContextId,
  time: 0,
  playing: false,
  cohort: null,
  fractureId: null,
  network: null,
  mode: "cortex" as BrainMode,
  counterfactuals: {},
  activeCf: null,
  cfPending: null,
  evidence: null,
  seekNonce: 0,
  hoverRegion: null as { name: string; networks: NetworkId[] } | null,
};

export const useLab = create<State>((set, get) => ({
  ...initial,
  set: (p) => set(p),
  seek: (t) => {
    const d = get().run?.timeline.duration ?? 0;
    set({ time: Math.max(0, Math.min(d, t)), seekNonce: get().seekNonce + 1 });
  },
  selectFracture: (id) => {
    const fr = get().run?.fractures.find((f) => f.id === id);
    if (!fr) return set({ fractureId: null, activeCf: null });
    set({ fractureId: id, playing: false, activeCf: null, network: null });
    get().seek(fr.start);
  },
  reset: () => {
    const url = get().mediaUrl;
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    set({ ...initial });
  },
}));
