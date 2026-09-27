/**
 * FractureFingerprint: the retrieval-oriented description of one CORTEX attention fracture.
 * Built client-side from the fracture, the ontology and (optionally) a frame captured from the local file,
 * then sent to the server, which turns it into Oriane corpus queries. Nothing here feeds back into CORTEX.
 */
import type { DriverKey, Fracture } from "../cortex/fractures";
import type { PerceptionSource, VideoOntology } from "../ontology";
import type { OrianePlatform } from "./types";

/** Seconds added on each side of the fracture window when reading transcript / keyframes. */
export const FINGERPRINT_WINDOW_PAD = 3;

export const FINGERPRINT_LIMITS = {
  transcriptChars: 600,
  captionChars: 300,
  hashtags: 10,
  terms: 6,
  frameBase64Chars: 160_000,
} as const;

export interface FingerprintDriver {
  key: DriverKey;
  label: string;
  direction: "up" | "down";
  contribution: number;
}

export interface FractureFingerprint {
  fractureId: string;
  source: PerceptionSource;
  platform: OrianePlatform | null;
  /** Source content identity, used to exclude the video from its own corpus. */
  platformId: string | null;
  window: { start: number; end: number; peak: number };
  duration: number;
  /** Fracture start as a fraction of the video, 0..1. */
  relativePosition: number;
  drivers: FingerprintDriver[];
  /** Spoken words in and around the fracture window (±3 s). */
  transcriptWindow: string;
  transcriptLanguage: string | null;
  /** Content words extracted from the transcript window, caption and hashtags for fuzzy transcript retrieval. */
  terms: string[];
  caption: string | null;
  hashtags: string[];
  /** Nearest Oriane-indexed keyframe at or before the fracture peak (public HTTPS), when the source is live. */
  keyframeUrl: string | null;
  /** JPEG frame captured locally from the uploaded file at the fracture peak, when a file is present. */
  frame: { mediaType: "image/jpeg"; base64: string } | null;
  structure: {
    staticSeconds: number;
    wordsSinceCut: number;
    newConcepts: number;
    openLoopSeconds: number;
    payoff: Fracture["observed"]["payoff"]["status"];
    /** Words per second spoken in the fracture window (±3 s). */
    speechDensity: number | null;
    /** Words per second across the whole source transcript. */
    speechDensityOverall: number | null;
    /** Oriane-indexed keyframes per 10 s inside the ±3 s window (live sources only; local cuts are not the same measure). */
    keyframeCadence: number | null;
  };
}

const STOP = new Set(
  "a an the and or but so if then than that this these those there here is are was were be been being am do does did done have has had having i you he she it we they me him her us them my your his its our their mine yours what which who whom whose when where why how not no yes to of in on at by for with from as into onto up down out over under again further once about after before because while during very just also too only own same can could will would shall should may might must let like get got gonna wanna okay ok oh um uh yeah well really actually literally kind sort thing things something anything everything nothing way back all any both each few more most other some such really very good great bad little bit lot lots much many going want wants need needs know knows think thought make makes made take takes took look looks looking see saw say says said come comes came put use used using right now today still even one two three first new best better ever every always never maybe probably please guys everyone everybody people time day".split(
    " ",
  ),
);

function words(s: string) {
  return s
    .toLowerCase()
    .replace(/[’']s\b/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Ranks content words by frequency, preferring words near the fracture, then hashtags, then caption. */
export function extractTerms(transcriptWindow: string, caption: string | null, hashtags: string[], max = FINGERPRINT_LIMITS.terms): string[] {
  const score = new Map<string, number>();
  const bump = (w: string, by: number) => {
    if (w.length < 3 || STOP.has(w) || /^\d+$/.test(w)) return;
    score.set(w, (score.get(w) ?? 0) + by);
  };
  for (const w of words(transcriptWindow)) bump(w, 1);
  for (const h of hashtags) bump(h.replace(/^#/, "").toLowerCase(), 1.5);
  for (const w of words(caption ?? "")) bump(w, 0.5);
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, max)
    .map(([w]) => w);
}

export function buildFractureFingerprint(
  fr: Fracture,
  ontology: VideoOntology,
  frame: FractureFingerprint["frame"] = null,
): FractureFingerprint {
  const pad = FINGERPRINT_WINDOW_PAD;
  const w0 = Math.max(0, fr.start - pad);
  const w1 = Math.min(ontology.duration || fr.end + pad, fr.end + pad);
  const segs = ontology.transcript.filter((s) => s.end >= w0 && s.start <= w1);
  const transcriptWindow = segs.map((s) => s.text).join(" ").slice(0, FINGERPRINT_LIMITS.transcriptChars);
  const winWords = segs.reduce((n, s) => n + words(s.text).length, 0);
  const allWords = ontology.transcript.reduce((n, s) => n + words(s.text).length, 0);
  const speechDensity = segs.length && w1 > w0 ? winWords / (w1 - w0) : null;
  const speechDensityOverall = ontology.transcript.length && ontology.duration > 0 ? allWords / ontology.duration : null;
  const kf = ontology.source === "oriane-live"
    ? ontology.keyframes.filter((k) => k.t <= fr.peak + 0.5 && k.t >= fr.peak - 4 && /^https:\/\//.test(k.url)).at(-1) ?? null
    : null;
  const keyframeCadence =
    ontology.source === "oriane-live" && ontology.keyframes.length && w1 > w0 ? (ontology.keyframes.filter((k) => k.t >= w0 && k.t <= w1).length / (w1 - w0)) * 10 : null;
  const hashtags = ontology.hashtags.slice(0, FINGERPRINT_LIMITS.hashtags);
  const caption = ontology.caption?.slice(0, FINGERPRINT_LIMITS.captionChars) ?? null;
  return {
    fractureId: fr.id,
    source: ontology.source,
    platform: ontology.platform === "upload" ? null : ontology.platform,
    platformId: ontology.platformId,
    window: { start: fr.start, end: fr.end, peak: fr.peak },
    duration: ontology.duration,
    relativePosition: ontology.duration > 0 ? Math.min(1, fr.start / ontology.duration) : 0,
    drivers: fr.drivers.slice(0, 3).map((d) => ({ key: d.key, label: d.label, direction: d.direction, contribution: d.contribution })),
    transcriptWindow,
    transcriptLanguage: ontology.transcriptLanguage,
    terms: extractTerms(transcriptWindow, caption, hashtags),
    caption,
    hashtags,
    keyframeUrl: kf?.url ?? null,
    frame: frame && frame.base64.length <= FINGERPRINT_LIMITS.frameBase64Chars ? frame : null,
    structure: {
      staticSeconds: fr.observed.staticSeconds,
      wordsSinceCut: fr.observed.wordsSinceCut,
      newConcepts: fr.observed.newConcepts,
      openLoopSeconds: fr.observed.openLoopSeconds,
      payoff: fr.observed.payoff.status,
      speechDensity,
      speechDensityOverall,
      keyframeCadence,
    },
  };
}
