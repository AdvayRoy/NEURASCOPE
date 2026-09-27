import type {
  OrianeContentQuery,
  OrianeCreateAssetRequest,
  OrianeCreateAssetResponse,
  OrianeErrorBody,
  OrianeSearchContentsResponse,
  OrianeSearchParams,
} from "./types";

export class OrianeError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface OrianeClientConfig {
  apiKey: string;
  baseUrl?: string;
  /** Header used for the key. Defaults to `Authorization: Bearer <key>`. */
  authHeader?: string;
}

/** Thin typed client for the Oriane Integration Connect REST API. Server-side only. */
export class OrianeClient {
  private readonly base: string;

  constructor(private readonly cfg: OrianeClientConfig) {
    this.base = (cfg.baseUrl ?? "https://connect.oriane.xyz").replace(/\/$/, "");
  }

  static fromEnv(): OrianeClient | null {
    const apiKey = process.env.ORIANE_API_KEY;
    if (!apiKey) return null;
    return new OrianeClient({
      apiKey,
      baseUrl: process.env.ORIANE_BASE_URL,
      authHeader: process.env.ORIANE_AUTH_HEADER,
    });
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    const name = this.cfg.authHeader ?? "Authorization";
    h[name] = name.toLowerCase() === "authorization" ? `Bearer ${this.cfg.apiKey}` : this.cfg.apiKey;
    return h;
  }

  private async post<T>(path: string, body: unknown, params?: Record<string, string | number | undefined>): Promise<T> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined) qs.set(k, String(v));
    const url = `${this.base}${path}${qs.size ? `?${qs}` : ""}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const json = (await res.json().catch(() => null)) as T | OrianeErrorBody | null;
    if (!res.ok || !json || (typeof json === "object" && "error" in json)) {
      const err = (json as OrianeErrorBody | null)?.error;
      throw new OrianeError(res.status, err?.code ?? "HTTP_ERROR", err?.message ?? `Oriane request failed (${res.status})`);
    }
    return json as T;
  }

  searchContents(query: OrianeContentQuery, params: OrianeSearchParams = {}) {
    return this.post<OrianeSearchContentsResponse>("/rest/contents/search", query, {
      sort: params.sort,
      offset: params.offset,
      limit: params.limit,
      projection: params.projection,
      aiSearchAnchor: params.aiSearchAnchor,
    });
  }

  createAsset(body: OrianeCreateAssetRequest) {
    return this.post<OrianeCreateAssetResponse>("/rest/assets", body);
  }
}
