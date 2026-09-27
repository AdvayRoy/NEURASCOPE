import type { CortexDrivers, FeatureTimeline } from "./features";
import { DYNAMICS } from "./params";

export type NetworkId = "visual" | "dorsal" | "ventral" | "salience" | "language" | "semantic" | "control";

export interface NetworkSpec {
  id: NetworkId;
  label: string;
  short: string;
  /** Desikan–Killiany parcels (without hemisphere prefix) and which hemispheres. */
  parcels: string[];
  hemis: ("lh" | "rh")[];
  drivenBy: string;
  sources: string[];
}

export const NETWORKS: NetworkSpec[] = [
  {
    id: "visual",
    label: "Visual processing",
    short: "VIS",
    parcels: ["pericalcarine", "cuneus", "lingual", "lateraloccipital", "fusiform"],
    hemis: ["lh", "rh"],
    drivenBy: "Visual change in the source × current attention",
    sources: ["yeo2011", "itti2009"],
  },
  {
    id: "dorsal",
    label: "Dorsal attention",
    short: "DAN",
    parcels: ["superiorparietal", "caudalmiddlefrontal", "precentral"],
    hemis: ["lh", "rh"],
    drivenBy: "Sustained attention × gaze concentration",
    sources: ["corbetta2002", "yeo2011", "madsen2021"],
  },
  {
    id: "ventral",
    label: "Ventral attention / reorienting",
    short: "VAN",
    parcels: ["supramarginal", "parsopercularis"],
    hemis: ["rh", "lh"],
    drivenBy: "Orienting events: cuts, audio onsets, product mentions",
    sources: ["corbetta2002", "lang2000"],
  },
  {
    id: "salience",
    label: "Salience",
    short: "SAL",
    parcels: ["insula", "caudalanteriorcingulate", "rostralanteriorcingulate"],
    hemis: ["lh", "rh"],
    drivenBy: "Orienting salience and novelty",
    sources: ["yeo2011", "itti2009"],
  },
  {
    id: "language",
    label: "Auditory / language",
    short: "LANG",
    parcels: ["transversetemporal", "superiortemporal", "bankssts", "parstriangularis", "parsopercularis"],
    hemis: ["lh", "rh"],
    drivenBy: "Speech rate × attention",
    sources: ["yeo2011"],
  },
  {
    id: "semantic",
    label: "Semantic / narrative integration",
    short: "SEM",
    parcels: ["middletemporal", "inferiorparietal", "precuneus", "posteriorcingulate", "isthmuscingulate", "medialorbitofrontal", "temporalpole"],
    hemis: ["lh", "rh"],
    drivenBy: "Semantic progression × attention",
    sources: ["yeo2011", "cohen2017"],
  },
  {
    id: "control",
    label: "Executive control / load",
    short: "CTRL",
    parcels: ["rostralmiddlefrontal", "parstriangularis", "superiorfrontal"],
    hemis: ["lh", "rh"],
    drivenBy: "Processing load × attention",
    sources: ["yeo2011", "lang2000", "jensen2002"],
  },
];

export type NetworkSeries = Record<NetworkId, Float32Array>;

/** Computational demand per network, 0..1. Tier C (CORTEX output); Yeo 2011 / Corbetta 2002 inform the grouping only. Not measured or predicted biological activation. */
export function networkSeries(f: FeatureTimeline, d: CortexDrivers, attention: Float32Array): NetworkSeries {
  const n = f.n;
  const mk = () => new Float32Array(n);
  const s: NetworkSeries = { visual: mk(), dorsal: mk(), ventral: mk(), salience: mk(), language: mk(), semantic: mk(), control: mk() };
  for (let k = 0; k < n; k++) {
    const a = attention[k];
    s.visual[k] = f.visualChange[k] * (0.35 + 0.65 * a);
    s.dorsal[k] = a * (0.4 + 0.6 * d.gazeConcentration[k]);
    s.ventral[k] = d.salience[k];
    s.salience[k] = Math.min(1, 0.6 * d.salience[k] + 0.4 * d.novelty[k]);
    s.language[k] = Math.min(1, f.speechRate[k] / DYNAMICS.speechRef) * (0.4 + 0.6 * a);
    s.semantic[k] = d.progression[k] * a;
    s.control[k] = Math.min(1, d.load[k]) * (0.4 + 0.6 * a);
  }
  return s;
}
