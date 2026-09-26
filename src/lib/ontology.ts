/**
 * NEURASCOPE internal temporal video ontology.
 * CORTEX consumes only these types; provider responses are normalized into them by adapters.
 */

export type PerceptionSource =
  /** Real response from the Oriane Integration Connect API. */
  | "oriane-live"
  /** Development fixture in Oriane wire shape. Never presented as Oriane output. */
  | "dev-fixture"
  /** No provider record: only signals measured locally from the uploaded file. */
  | "local-only";

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface Keyframe {
  t: number;
  url: string;
}

export interface EngagementMetrics {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  engagementRatePerViews: number | null;
  followers: number;
}

export interface CreatorContext {
  handle: string;
  displayName: string | null;
  verified: boolean;
  followers: number;
}

/** Per-timestep signals measured from the media itself (browser-side decoding). */
export interface MediaSignals {
  /** Sampling rate in Hz of every array below. */
  hz: number;
  /** Mean absolute luminance difference between consecutive sampled frames, 0..1. */
  frameDiff: number[];
  /** Mean luminance 0..1. */
  luminance: number[];
  /** Spatial entropy of gradient energy, 0..1 (1 = maximally dispersed). */
  spatialEntropy: number[];
  /** Audio RMS 0..1 (empty when the file has no audio track). */
  audioRms: number[];
  /** Detected hard cuts, seconds. */
  cuts: number[];
  measuredFrom: "decoded-video" | "oriane-keyframes";
}

export interface VideoOntology {
  id: string;
  source: PerceptionSource;
  /** Human-readable explanation of the source (shown in the UI). */
  sourceNote: string;
  platform: "tiktok" | "instagram" | "upload";
  url: string | null;
  platformId: string | null;
  caption: string | null;
  hashtags: string[];
  duration: number;
  transcript: TranscriptSegment[];
  transcriptLanguage: string | null;
  keyframes: Keyframe[];
  thumbnailUrl: string | null;
  metrics: EngagementMetrics | null;
  creator: CreatorContext | null;
  audio: { title: string | null; author: string | null } | null;
  /** Filled in client-side once the media is decoded. */
  signals: MediaSignals | null;
  /** Capabilities that were requested but are not available in this context. */
  unavailable: string[];
  /** Orianes request id, when live. */
  requestId: string | null;
}
