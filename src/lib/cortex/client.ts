import type { VideoOntology } from "../ontology";
import type { Counterfactual, CortexOptions, CortexRun } from "./index";
import type { Intervention } from "./interventions";

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./cortex.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.result);
      else p.reject(new Error(e.data.error));
    };
  }
  return worker;
}

function call<T>(msg: Record<string, unknown>): Promise<T> {
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    getWorker().postMessage({ ...msg, id });
  });
}

export const cortexClient = {
  run: (ontology: VideoOntology, opts: CortexOptions) => call<CortexRun>({ type: "run", ontology, opts }),
  counterfactual: (intervention: Intervention) => call<Counterfactual>({ type: "counterfactual", intervention }),
};
