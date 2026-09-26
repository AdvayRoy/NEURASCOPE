import type { VideoOntology } from "../ontology";
import { OrianeClient, OrianeError } from "./client";
import { normalizeOrianeContent } from "./normalize";
import type { OrianeContentFull } from "./types";
import { instagramShortcodeToMediaId, parseContentUrl } from "./url";
import fixture from "./fixtures/dev-fixture.json";

export type ResolveResult =
  | { ok: true; ontology: VideoOntology }
  | { ok: false; status: number; code: "INVALID_URL" | "NO_CREDENTIALS" | "NOT_INDEXED" | "ORIANE_ERROR"; message: string };

/** Resolves a published TikTok/Instagram URL through the live Oriane API. Never falls back to fixture data. */
export async function resolveLive(url: string, client = OrianeClient.fromEnv()): Promise<ResolveResult> {
  const parsed = parseContentUrl(url);
  if (!parsed) return { ok: false, status: 400, code: "INVALID_URL", message: "Enter a TikTok video or Instagram reel URL." };
  if (!client) {
    return { ok: false, status: 503, code: "NO_CREDENTIALS", message: "ORIANE_API_KEY is not configured. Live Oriane perception is unavailable in this environment." };
  }
  const ids = [parsed.platformId];
  if (parsed.platform === "instagram") {
    const media = instagramShortcodeToMediaId(parsed.platformId);
    if (media) ids.push(media);
  }
  try {
    const res = await client.searchContents(
      {
        operator: "and",
        filters: { platformId: { includes: ids.map((platformId) => ({ platform: parsed.platform, platformId })) } },
      },
      { projection: "full", limit: 1 },
    );
    const hit = res.data.results[0];
    if (!hit) return { ok: false, status: 404, code: "NOT_INDEXED", message: "Oriane has not indexed this content yet." };
    return {
      ok: true,
      ontology: normalizeOrianeContent(hit, "oriane-live", {
        url: parsed.url,
        requestId: res.metadata.requestId,
        sourceNote: `Oriane Integration Connect · searchContents (full projection) · request ${res.metadata.requestId}`,
      }),
    };
  } catch (e) {
    const err = e as OrianeError;
    return { ok: false, status: err.status ?? 502, code: "ORIANE_ERROR", message: `${err.code ?? "ERROR"}: ${err.message}` };
  }
}

interface FixtureFile {
  _fixture: { label: string; note: string };
  result: OrianeContentFull;
}

/** Development fixture in Oriane wire shape. Labeled as such everywhere it appears. */
export function resolveFixture(): VideoOntology {
  const f = fixture as unknown as FixtureFile;
  return normalizeOrianeContent(f.result, "dev-fixture", {
    url: null,
    requestId: null,
    sourceNote: f._fixture.note,
  });
}
