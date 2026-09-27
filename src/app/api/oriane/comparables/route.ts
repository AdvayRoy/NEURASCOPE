import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isPublicHttpsUrl, retrieveCorpusEvidence, type CorpusResult } from "@/lib/oriane/comparables";
import { FINGERPRINT_LIMITS, type FractureFingerprint } from "@/lib/oriane/fingerprint";
import { BoundedCache, rateLimit } from "@/lib/server/rateLimit";

const cache = new BoundedCache<CorpusResult>(200, 30 * 60_000);
const MAX_BODY = 256 * 1024;

const num = (v: unknown, lo: number, hi: number, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);
const strs = (v: unknown, max: number, each: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max).map((x) => x.slice(0, each)) : []);

/** Bounds an untrusted fingerprint to what retrieval actually consumes. */
function sanitize(raw: unknown): FractureFingerprint | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  const fractureId = str(f.fractureId, 16);
  if (!fractureId) return null;
  const platform = f.platform === "tiktok" || f.platform === "instagram" ? f.platform : null;
  const w = (f.window ?? {}) as Record<string, unknown>;
  const st = (f.structure ?? {}) as Record<string, unknown>;
  const fr = f.frame as Record<string, unknown> | null | undefined;
  const frame =
    fr && fr.mediaType === "image/jpeg" && typeof fr.base64 === "string" && fr.base64.length <= FINGERPRINT_LIMITS.frameBase64Chars && /^[A-Za-z0-9+/=]+$/.test(fr.base64)
      ? { mediaType: "image/jpeg" as const, base64: fr.base64 }
      : null;
  const keyframeUrl = str(f.keyframeUrl, 2048);
  const opt = (v: unknown, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(0, v)) : null);
  const drivers = Array.isArray(f.drivers) ? (f.drivers as FractureFingerprint["drivers"]).slice(0, 3) : [];
  return {
    fractureId,
    source: f.source === "oriane-live" || f.source === "dev-fixture" ? f.source : "local-only",
    platform,
    platformId: str(f.platformId, 64),
    window: { start: num(w.start, 0, 36_000), end: num(w.end, 0, 36_000), peak: num(w.peak, 0, 36_000) },
    duration: num(f.duration, 0, 36_000),
    relativePosition: num(f.relativePosition, 0, 1),
    drivers,
    transcriptWindow: str(f.transcriptWindow, FINGERPRINT_LIMITS.transcriptChars) ?? "",
    transcriptLanguage: str(f.transcriptLanguage, 8),
    terms: strs(f.terms, FINGERPRINT_LIMITS.terms, 40),
    caption: str(f.caption, FINGERPRINT_LIMITS.captionChars),
    hashtags: strs(f.hashtags, FINGERPRINT_LIMITS.hashtags, 60),
    keyframeUrl: keyframeUrl && isPublicHttpsUrl(keyframeUrl) ? keyframeUrl : null,
    frame,
    structure: {
      staticSeconds: num(st.staticSeconds, 0, 36_000),
      wordsSinceCut: num(st.wordsSinceCut, 0, 100_000),
      newConcepts: num(st.newConcepts, 0, 10_000),
      openLoopSeconds: num(st.openLoopSeconds, 0, 36_000),
      payoff: st.payoff === "resolved" || st.payoff === "unresolved" ? st.payoff : "none-open",
      speechDensity: opt(st.speechDensity, 100),
      speechDensityOverall: opt(st.speechDensityOverall, 100),
      keyframeCadence: opt(st.keyframeCadence, 10_000),
    },
  };
}

/** Cache key over exactly the fields that determine the provider queries. */
function cacheKey(fp: FractureFingerprint) {
  const h = createHash("sha256");
  h.update(
    JSON.stringify([
      fp.platform,
      fp.platformId,
      fp.transcriptLanguage,
      fp.terms,
      fp.keyframeUrl,
      fp.relativePosition.toFixed(3),
      fp.duration,
      fp.structure.speechDensity,
      fp.structure.keyframeCadence,
      fp.frame?.base64 ?? null,
    ]),
  );
  return h.digest("hex");
}

export async function POST(req: Request) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) return NextResponse.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Fingerprint too large." } }, { status: 413 });
  const text = await req.text().catch(() => "");
  if (text.length > MAX_BODY) return NextResponse.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Fingerprint too large." } }, { status: 413 });
  let body: { fingerprint?: unknown } = {};
  try {
    body = JSON.parse(text) as { fingerprint?: unknown };
  } catch {
    /* handled below */
  }
  const fp = sanitize(body.fingerprint);
  if (!fp) return NextResponse.json({ error: { code: "INVALID_FINGERPRINT", message: "A fracture fingerprint is required." } }, { status: 400 });
  const key = cacheKey(fp);
  const hit = cache.get(key);
  if (hit) return NextResponse.json({ ...hit, fractureId: fp.fractureId } satisfies CorpusResult, { headers: { "x-neurascope-cache": "hit" } });
  if (process.env.ORIANE_API_KEY) {
    const limited = rateLimit(req, { name: "comparables", capacity: 6, perMinute: 4 });
    if (limited) return limited;
  }
  const result = await retrieveCorpusEvidence(fp);
  if (result.available) cache.set(key, result);
  return NextResponse.json(result);
}
