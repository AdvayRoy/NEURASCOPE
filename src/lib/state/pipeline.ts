"use client";
import { cortexClient } from "../cortex/client";
import { extractSignals } from "../media/extract";
import { localOnlyOntology } from "../oriane/normalize";
import type { VideoOntology } from "../ontology";
import { saveContext, saveRun } from "./persist";
import { useLab, type PipelineStep } from "./store";

export interface RunInput {
  url?: string;
  file?: File | null;
  fixture?: boolean;
}

const STEPS: PipelineStep[] = [
  { id: "acquire", label: "Acquiring video intelligence", status: "pending" },
  { id: "signals", label: "Measuring visual and audio signals", status: "pending" },
  { id: "align", label: "Aligning semantic timeline", status: "pending" },
  { id: "cortex", label: "Building CORTEX state", status: "pending" },
  { id: "audience", label: "Sampling synthetic audience", status: "pending" },
  { id: "evidence", label: "Tracing evidence", status: "pending" },
];

function step(id: string, status: PipelineStep["status"], detail?: string) {
  const { steps, set } = useLab.getState();
  set({ steps: steps.map((s) => (s.id === id ? { ...s, status, detail: detail ?? s.detail } : s)) });
}

async function json<T>(res: Response): Promise<T> {
  const j = (await res.json()) as T & { error?: { message: string } };
  if (!res.ok) throw new Error(j.error?.message ?? `Request failed (${res.status})`);
  return j;
}

export async function runPipeline(input: RunInput) {
  const lab = useLab.getState();
  lab.set({ phase: "loading", steps: STEPS.map((s) => ({ ...s })), error: null, run: null, counterfactuals: {}, activeCf: null, fractureId: null, time: 0 });
  try {
    step("acquire", "active");
    let ontology: VideoOntology | null = null;
    if (input.fixture) {
      ontology = (await json<{ ontology: VideoOntology }>(await fetch("/api/oriane/fixture"))).ontology;
      step("acquire", "done", "Development fixture · not Oriane output");
    } else if (input.url) {
      const res = await fetch("/api/oriane/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: input.url }) });
      if (res.ok) {
        ontology = ((await res.json()) as { ontology: VideoOntology }).ontology;
        step("acquire", "done", `Oriane · ${ontology.transcript.length} transcript chunks · ${ontology.keyframes.length} keyframes`);
      } else {
        const err = ((await res.json()) as { error: { message: string } }).error.message;
        if (!input.file) throw new Error(err);
        step("acquire", "skipped", err);
      }
    } else {
      step("acquire", "skipped", "No published URL · Oriane perception unavailable for local files");
    }

    let mediaUrl: string | null = null;
    if (input.file) {
      step("signals", "active");
      const { signals, duration } = await extractSignals(input.file, (p) => step("signals", "active", `${Math.round(p * 100)}%`));
      ontology = ontology ?? localOnlyOntology(input.file.name, duration);
      ontology = { ...ontology, signals, duration: ontology.duration > 0 ? Math.min(ontology.duration, duration) || duration : duration };
      mediaUrl = URL.createObjectURL(input.file);
      step("signals", "done", `${signals.cuts.length} cuts · ${signals.audioRms.length ? "audio" : "no audio track"}`);
    } else {
      step("signals", "skipped", "No media file · visual and audio terms held at neutral priors");
    }
    if (!ontology) throw new Error("Provide a TikTok/Instagram URL or a video file.");

    step("align", "active");
    step("align", "done", ontology.transcript.length ? `${ontology.transcript.length} segments` : "No transcript · semantic terms held at neutral prior");
    step("cortex", "active");
    const run = await cortexClient.run(ontology, { context: useLab.getState().context });
    step("cortex", "done", `${run.timeline.n} timesteps @ ${run.timeline.hz} Hz`);
    step("audience", "done", `${run.sim.size.toLocaleString()} seeded viewers · seed ${run.seed}`);
    step("evidence", "done", `${run.fractures.length} fracture${run.fractures.length === 1 ? "" : "s"} with mechanisms`);
    await new Promise((r) => setTimeout(r, 350));
    useLab.getState().set({ phase: "workspace", ontology, run, mediaUrl, time: 0 });
    void saveRun(input, useLab.getState().context);
  } catch (e) {
    const cur = useLab.getState().steps.find((s) => s.status === "active");
    if (cur) step(cur.id, "error");
    useLab.getState().set({ error: (e as Error).message });
  }
}

export async function rerunContext() {
  const { ontology, context, set } = useLab.getState();
  if (!ontology) return;
  const run = await cortexClient.run(ontology, { context });
  set({ run, counterfactuals: {}, activeCf: null, fractureId: null });
  saveContext(context);
}

export async function simulatePatch(interventionId: string) {
  const { run, counterfactuals, set } = useLab.getState();
  const iv = run?.interventions.find((i) => i.id === interventionId);
  if (!iv) return;
  if (counterfactuals[iv.id]) return set({ activeCf: iv.id });
  set({ cfPending: iv.id });
  const cf = await cortexClient.counterfactual(iv);
  set({ counterfactuals: { ...useLab.getState().counterfactuals, [iv.id]: cf }, activeCf: iv.id, cfPending: null });
}
