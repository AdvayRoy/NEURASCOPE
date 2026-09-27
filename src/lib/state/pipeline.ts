"use client";
import { cortexClient } from "../cortex/client";
import { extractSignals } from "../media/extract";
import { captureFrame } from "../media/frame";
import type { CorpusResult } from "../oriane/comparables";
import { buildFractureFingerprint } from "../oriane/fingerprint";
import { localOnlyOntology } from "../oriane/normalize";
import type { VideoOntology } from "../ontology";
import { loadRun, saveContext, saveRun } from "./persist";
import { useLab, type PipelineStep } from "./store";

export interface RunInput {
  url?: string;
  file?: File | null;
  fixture?: boolean;
  /** Previously normalized ontology (with its original provenance) restored from local storage. */
  restored?: VideoOntology;
}

let generation = 0;

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

/** Earlier genuine `oriane-live` result for the same URL, saved by a previous successful run; never a fixture. */
async function cachedLiveAnalysis(url: string): Promise<VideoOntology | null> {
  const prev = await loadRun();
  if (!prev || prev.saved.url !== url || prev.ontology.source !== "oriane-live") return null;
  return { ...prev.ontology, signals: null };
}

export async function runPipeline(input: RunInput) {
  const gen = ++generation;
  const lab = useLab.getState();
  lab.set({ phase: "loading", steps: STEPS.map((s) => ({ ...s })), error: null, run: null, counterfactuals: {}, activeCf: null, fractureId: null, time: 0, corpus: {} });
  try {
    step("acquire", "active");
    let ontology: VideoOntology | null = null;
    if (input.restored) {
      ontology = input.restored;
      step("acquire", "done", `Restored saved analysis input · ${ontology.source}`);
    } else if (input.fixture) {
      ontology = (await json<{ ontology: VideoOntology }>(await fetch("/api/oriane/fixture"))).ontology;
      step("acquire", "done", "Development fixture · not Oriane output");
    } else if (input.url) {
      const res = await fetch("/api/oriane/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: input.url }) });
      if (res.ok) {
        ontology = ((await res.json()) as { ontology: VideoOntology }).ontology;
        step("acquire", "done", `Oriane · ${ontology.transcript.length} transcript chunks · ${ontology.keyframes.length} keyframes`);
      } else {
        const err = ((await res.json()) as { error: { message: string } }).error.message;
        const cached = await cachedLiveAnalysis(input.url);
        if (cached) {
          ontology = cached;
          step("acquire", "done", `Oriane unavailable (${err}) · reusing this URL's earlier live Oriane result`);
        } else {
          if (!input.file) throw new Error(err);
          step("acquire", "skipped", err);
        }
      }
    } else {
      step("acquire", "skipped", "No published URL · Oriane perception unavailable for local files");
    }

    let mediaUrl: string | null = null;
    if (input.restored && ontology) {
      if (input.file) mediaUrl = URL.createObjectURL(input.file);
      step("signals", ontology.signals ? "done" : "skipped", ontology.signals ? "Restored measured signals" : "No media file · visual and audio terms held at neutral priors");
    } else if (input.file) {
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
    if (gen !== generation) return;
    useLab.getState().set({ phase: "workspace", ontology, run, mediaUrl, time: 0 });
    void saveRun(input, ontology, useLab.getState().context);
  } catch (e) {
    if (gen !== generation) return;
    const cur = useLab.getState().steps.find((s) => s.status === "active");
    if (cur) step(cur.id, "error");
    useLab.getState().set({ error: (e as Error).message });
  }
}

export async function rerunContext() {
  const { ontology, context, set } = useLab.getState();
  if (!ontology) return;
  const gen = ++generation;
  const run = await cortexClient.run(ontology, { context });
  if (gen !== generation || useLab.getState().ontology !== ontology) return;
  set({ run, counterfactuals: {}, activeCf: null, fractureId: null, corpus: {} });
  saveContext(context);
}

/**
 * Fracture-conditioned Oriane corpus retrieval. Runs once per fracture per run, on explicit fracture selection —
 * never as the playhead moves. Results (including failures) are kept on the run so re-selecting costs nothing.
 */
export async function loadCorpusEvidence(fractureId: string) {
  const { run, ontology, mediaUrl, corpus, set } = useLab.getState();
  const fr = run?.fractures.find((f) => f.id === fractureId);
  if (!run || !ontology || !fr || corpus[fractureId]) return;
  set({ corpus: { ...corpus, [fractureId]: "pending" } });
  const put = (r: CorpusResult) => {
    const s = useLab.getState();
    if (s.run !== run) return;
    s.set({ corpus: { ...s.corpus, [fractureId]: r } });
  };
  try {
    const frame = mediaUrl ? await captureFrame(mediaUrl, fr.peak) : null;
    const fingerprint = buildFractureFingerprint(fr, ontology, frame);
    const res = await fetch("/api/oriane/comparables", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fingerprint }) });
    if (res.status === 429) {
      const wait = Math.min(120, Number(res.headers.get("retry-after") ?? 15));
      put({ available: false, fractureId, reason: `Corpus retrieval is rate-limited. Retrying in ${wait} s.` });
      setTimeout(() => {
        const s = useLab.getState();
        if (s.run !== run) return;
        const { [fractureId]: _drop, ...rest } = s.corpus;
        void _drop;
        s.set({ corpus: rest });
        if (s.fractureId === fractureId) void loadCorpusEvidence(fractureId);
      }, wait * 1000);
      return;
    }
    const j = (await res.json()) as CorpusResult | { error: { message: string } };
    put("error" in j ? { available: false, fractureId, reason: j.error.message } : j);
  } catch {
    put({ available: false, fractureId, reason: "Corpus retrieval failed. CORTEX results are unaffected." });
  }
}

export async function simulatePatch(interventionId: string) {
  const { run, counterfactuals, set } = useLab.getState();
  const iv = run?.interventions.find((i) => i.id === interventionId);
  if (!iv) return;
  if (counterfactuals[iv.id]) return set({ activeCf: iv.id });
  set({ cfPending: iv.id });
  const cf = await cortexClient.counterfactual(iv);
  if (useLab.getState().run !== run) return;
  set({ counterfactuals: { ...useLab.getState().counterfactuals, [iv.id]: cf }, activeCf: iv.id, cfPending: null });
}
