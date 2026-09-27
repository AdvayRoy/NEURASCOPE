import { NextResponse } from "next/server";

interface Bucket {
  tokens: number;
  updated: number;
}

export interface RateLimitPolicy {
  /** Bucket name; each provider-backed route gets its own budget. */
  name: string;
  /** Burst capacity. */
  capacity: number;
  /** Sustained refill, requests per minute. */
  perMinute: number;
}

const MAX_KEYS = 5000;
const buckets = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return (req.headers.get("x-real-ip") ?? "local").slice(0, 64);
}

/** In-memory per-IP token bucket. Returns a 429 response when exhausted, otherwise null. */
export function rateLimit(req: Request, p: RateLimitPolicy, now = Date.now()): NextResponse | null {
  const key = `${p.name}:${clientIp(req)}`;
  const rate = p.perMinute / 60_000;
  const b = buckets.get(key) ?? { tokens: p.capacity, updated: now };
  b.tokens = Math.min(p.capacity, b.tokens + (now - b.updated) * rate);
  b.updated = now;
  buckets.delete(key);
  if (buckets.size >= MAX_KEYS) buckets.delete(buckets.keys().next().value as string);
  if (b.tokens < 1) {
    buckets.set(key, b);
    const retry = Math.max(1, Math.ceil((1 - b.tokens) / rate / 1000));
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: `Too many ${p.name} requests. Retry in ${retry} s.` } },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return null;
}

export function resetRateLimits() {
  buckets.clear();
}

/** Small bounded LRU with TTL. */
export class BoundedCache<V> {
  private map = new Map<string, { v: V; exp: number }>();
  constructor(private readonly max: number, private readonly ttlMs: number) {}
  get(k: string, now = Date.now()): V | undefined {
    const e = this.map.get(k);
    if (!e) return undefined;
    this.map.delete(k);
    if (e.exp < now) return undefined;
    this.map.set(k, e);
    return e.v;
  }
  set(k: string, v: V, now = Date.now()) {
    this.map.delete(k);
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value as string);
    this.map.set(k, { v, exp: now + this.ttlMs });
  }
}
