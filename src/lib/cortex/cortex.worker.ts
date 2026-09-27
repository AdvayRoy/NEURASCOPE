/// <reference lib="webworker" />
import type { VideoOntology } from "../ontology";
import { runCortex, runCounterfactual, type CortexOptions, type CortexRun } from "./index";
import type { Intervention } from "./interventions";

let ontology: VideoOntology | null = null;
let base: CortexRun | null = null;

export type WorkerIn =
  | { id: number; type: "run"; ontology: VideoOntology; opts: CortexOptions }
  | { id: number; type: "counterfactual"; intervention: Intervention };

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  const m = e.data;
  try {
    if (m.type === "run") {
      ontology = m.ontology;
      base = runCortex(m.ontology, m.opts);
      self.postMessage({ id: m.id, ok: true, result: base });
    } else {
      if (!ontology || !base) throw new Error("No base run");
      self.postMessage({ id: m.id, ok: true, result: runCounterfactual(ontology, base, m.intervention) });
    }
  } catch (err) {
    self.postMessage({ id: m.id, ok: false, error: (err as Error).message });
  }
};
