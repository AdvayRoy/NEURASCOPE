import { beforeEach, describe, expect, it } from "vitest";
import { BoundedCache, rateLimit, resetRateLimits } from "./rateLimit";

const req = (ip: string) => new Request("http://x/api", { headers: { "x-forwarded-for": ip } });
const policy = { name: "test", capacity: 3, perMinute: 6 };

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());
  it("allows the burst, then returns 429 with Retry-After", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit(req("1.1.1.1"), policy, 0)).toBeNull();
    const r = rateLimit(req("1.1.1.1"), policy, 0);
    expect(r?.status).toBe(429);
    expect(Number(r?.headers.get("Retry-After"))).toBe(10);
  });
  it("isolates IPs and refills over time", () => {
    for (let i = 0; i < 3; i++) rateLimit(req("1.1.1.1"), policy, 0);
    expect(rateLimit(req("2.2.2.2"), policy, 0)).toBeNull();
    expect(rateLimit(req("1.1.1.1"), policy, 10_000)).toBeNull();
  });
  it("keys on the proxy-appended hop, not the client-supplied left entries", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit(req(`9.9.9.${i}, 1.1.1.1`), policy, 0)).toBeNull();
    expect(rateLimit(req("9.9.9.99, 1.1.1.1"), policy, 0)?.status).toBe(429);
  });
  it("caps the route globally when addresses rotate", () => {
    let ok = 0;
    for (let i = 0; i < 100; i++) if (rateLimit(req(`10.0.0.${i}`), policy, 0) === null) ok++;
    expect(ok).toBe(30);
  });
});

describe("BoundedCache", () => {
  it("evicts oldest and expires", () => {
    const c = new BoundedCache<number>(2, 100);
    c.set("a", 1, 0);
    c.set("b", 2, 0);
    c.set("c", 3, 0);
    expect(c.get("a", 0)).toBeUndefined();
    expect(c.get("c", 0)).toBe(3);
    expect(c.get("c", 200)).toBeUndefined();
  });
});
