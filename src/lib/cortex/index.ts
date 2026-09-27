import type { VideoOntology } from "../ontology";
import { pv, type ProvenancedValue } from "../evidence/provenance";
import { eegEnvelopes, type EegEnvelopes } from "./eeg";
import { buildFeatureTimeline, computeDrivers, type CortexDrivers, type FeatureTimeline } from "./features";
import { detectFractures, type Fracture } from "./fractures";
import { applyIntervention, proposeInterventions, type Intervention } from "./interventions";
import { networkSeries, type NetworkSeries } from "./networks";
import { DEFAULT_POPULATION, DEFAULT_SEED, type AudienceContextId } from "./params";
import { samplePopulation, type Population } from "./population";
import { sampleAt, simulate, type SimResult } from "./simulate";

export interface CortexOptions {
  seed?: number;
  population?: number;
  context?: AudienceContextId;
}

export interface CortexRun {
  seed: number;
  context: AudienceContextId;
  timeline: FeatureTimeline;
  drivers: CortexDrivers;
  sim: SimResult;
  fractures: Fracture[];
  interventions: Intervention[];
  networks: NetworkSeries;
  eeg: EegEnvelopes;
  /** Viewer layout coordinates and cohorts for the audience field. */
  audience: { cohort: Uint8Array; layout: Float32Array; distracted: Uint8Array };
}

export function runCortexOnTimeline(timeline: FeatureTimeline, ontology: VideoOntology, opts: CortexOptions = {}, pop?: Population): CortexRun {
  const seed = opts.seed ?? DEFAULT_SEED;
  const context = opts.context ?? "feed";
  const population = pop ?? samplePopulation(opts.population ?? DEFAULT_POPULATION, seed, context);
  const drivers = computeDrivers(timeline);
  const sim = simulate(timeline, drivers, population);
  const fractures = detectFractures(timeline, drivers, sim, ontology.transcript, context);
  const interventions = fractures.flatMap((fr) => proposeInterventions(fr, timeline));
  return {
    seed,
    context,
    timeline,
    drivers,
    sim,
    fractures,
    interventions,
    networks: networkSeries(timeline, drivers, sim.attention),
    eeg: eegEnvelopes(sim.attention, drivers.load),
    audience: { cohort: population.cohort, layout: population.layout, distracted: population.distracted },
  };
}

export function runCortex(ontology: VideoOntology, opts: CortexOptions = {}): CortexRun {
  return runCortexOnTimeline(buildFeatureTimeline(ontology), ontology, opts);
}

export interface Counterfactual {
  intervention: Intervention;
  run: CortexRun;
  /** Evaluation time on the original clock (s). */
  evalAt: number;
  original: number;
  counterfactual: number;
  deltaPts: number;
  endOriginal: number;
  endCounterfactual: number;
}

/** Reruns CORTEX with the same seeded population on an intervened feature timeline (common random numbers). */
export function runCounterfactual(ontology: VideoOntology, base: CortexRun, intervention: Intervention, population?: number): Counterfactual {
  const tl = applyIntervention(base.timeline, intervention.op);
  const pop = samplePopulation(population ?? base.sim.size, base.seed, base.context);
  const run = runCortexOnTimeline(tl, ontology, { seed: base.seed, context: base.context }, pop);
  const fr = base.fractures.find((x) => x.id === intervention.fractureId);
  const shift = intervention.op.kind === "compress" ? intervention.op.remove : 0;
  const evalAt = Math.min(base.timeline.duration, (fr?.end ?? base.timeline.duration / 2) + 3);
  const original = sampleAt(base.sim.retention, base.sim.hz, evalAt);
  // For compression, the same content point arrives `shift` seconds earlier in the counterfactual.
  const counterfactual = sampleAt(run.sim.retention, run.sim.hz, Math.max(0, evalAt - shift));
  const endOriginal = base.sim.retention[base.sim.n - 1];
  const endCounterfactual = run.sim.retention[run.sim.n - 1];
  return { intervention, run, evalAt, original, counterfactual, deltaPts: (counterfactual - original) * 100, endOriginal, endCounterfactual };
}

/** Provenanced readouts for the metrics overlay at time t. All are CORTEX outputs (Tier C); sources are calibration sources. */
export function readouts(run: CortexRun, t: number, cohortIndex: number | null) {
  const hz = run.sim.hz;
  const att = cohortIndex === null ? run.sim.attention : run.sim.attentionByCohort[cohortIndex];
  const ret = cohortIndex === null ? run.sim.retention : run.sim.retentionByCohort[cohortIndex];
  const out: Record<string, ProvenancedValue> = {
    attention: pv(sampleAt(att, hz, t), "derived", ["madsen2021", "ki2016", "neurascopeHeuristics"], "Survival-weighted mean latent attention of synthetic viewers"),
    load: pv(Math.min(1.5, sampleAt(run.drivers.load, hz, t)), "derived", ["lang2000"], "Information introduced per second relative to reference capacity"),
    reliability: pv(sampleAt(run.eeg.isc, hz, t), "derived", ["madsen2021", "ki2016"], "CORTEX attention mapped onto the Madsen 2021 gaze-ISC scale (distracted 0.12 → attentive 0.35); model-derived proxy, not measured ISC"),
    survival: pv(sampleAt(ret, hz, t), "derived", ["cohen2017", "neurascopeHeuristics"], "R̂(t) = mean_i S_i(t) from the viewer-level hazard simulation"),
  };
  return out;
}
