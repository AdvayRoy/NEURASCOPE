import type { OrianePlatform } from "./types";

export interface ParsedContentUrl {
  platform: OrianePlatform;
  platformId: string;
  url: string;
}

/** Extracts the platform content id from a TikTok or Instagram URL. */
export function parseContentUrl(raw: string): ParsedContentUrl | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const m = u.pathname.match(/\/video\/(\d+)/) ?? u.pathname.match(/\/v\/(\d+)/);
    if (m) return { platform: "tiktok", platformId: m[1], url: u.toString() };
    return null;
  }
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    const m = u.pathname.match(/\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
    if (m) return { platform: "instagram", platformId: m[1], url: u.toString() };
  }
  return null;
}

const IG_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Instagram shortcode → numeric media id (base64url digits, big-endian). */
export function instagramShortcodeToMediaId(code: string): string | null {
  let id = BigInt(0);
  for (const ch of code) {
    const v = IG_ALPHABET.indexOf(ch);
    if (v < 0) return null;
    id = id * BigInt(64) + BigInt(v);
  }
  return id.toString();
}
