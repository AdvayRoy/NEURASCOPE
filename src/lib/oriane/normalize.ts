import type { PerceptionSource, VideoOntology } from "../ontology";
import type { OrianeContentFull } from "./types";

/** Maps an Oriane full-projection content record into the internal ontology. */
export function normalizeOrianeContent(
  c: OrianeContentFull,
  source: Extract<PerceptionSource, "oriane-live" | "dev-fixture">,
  opts: { url: string | null; requestId: string | null; sourceNote: string },
): VideoOntology {
  const chunks = (c.transcriptChunks ?? [])
    .filter((ch) => Number.isFinite(ch.startSeconds) && Number.isFinite(ch.endSeconds) && ch.text.trim())
    .sort((a, b) => a.startSeconds - b.startSeconds)
    .map((ch) => ({ start: ch.startSeconds, end: Math.max(ch.endSeconds, ch.startSeconds + 0.05), text: ch.text.trim() }));
  const frames = (c.frames ?? []).slice().sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  const lastT = Math.max(chunks.at(-1)?.end ?? 0, frames.at(-1)?.timestampSeconds ?? 0);
  const duration = c.duration && c.duration > 0 ? c.duration : lastT;
  const unavailable: string[] = [];
  if (!chunks.length) unavailable.push(c.transcript ? "transcript timing" : "transcript");
  if (!frames.length) unavailable.push("keyframes");
  return {
    id: `${c.platform}:${c.platformId}`,
    source,
    sourceNote: opts.sourceNote,
    platform: c.platform,
    url: opts.url,
    platformId: c.platformId,
    caption: c.caption,
    hashtags: c.hashtags ?? [],
    duration,
    transcript: chunks,
    transcriptLanguage: c.transcriptLanguage,
    keyframes: frames.map((f) => ({ t: f.timestampSeconds, url: f.url })),
    thumbnailUrl: c.thumbnailMediaUrl,
    metrics: {
      views: c.viewsCount,
      likes: c.likesCount,
      shares: c.sharesCount,
      comments: c.commentsCount,
      engagementRatePerViews: c.engagementRatePerViews,
      followers: c.profileFollowersCount,
    },
    creator: {
      handle: c.profileHandle,
      displayName: c.profileDisplayName,
      verified: c.profileVerified,
      followers: c.profileFollowersCount,
    },
    audio: c.audioTitle || c.audioAuthor ? { title: c.audioTitle, author: c.audioAuthor } : null,
    signals: null,
    unavailable,
    requestId: opts.requestId,
  };
}

/** Ontology for an uploaded file with no provider record. */
export function localOnlyOntology(name: string, duration: number): VideoOntology {
  return {
    id: `upload:${name}`,
    source: "local-only",
    sourceNote:
      "Local file only. Oriane indexes published TikTok/Instagram content; it has no upload endpoint, so transcript, keyframes, metrics and creator context are unavailable unless a published URL is linked.",
    platform: "upload",
    url: null,
    platformId: null,
    caption: null,
    hashtags: [],
    duration,
    transcript: [],
    transcriptLanguage: null,
    keyframes: [],
    thumbnailUrl: null,
    metrics: null,
    creator: null,
    audio: null,
    signals: null,
    unavailable: ["transcript", "keyframes", "engagement metrics", "creator context", "corpus comparables"],
    requestId: null,
  };
}
