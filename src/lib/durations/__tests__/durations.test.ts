import { describe, expect, it, vi } from "vitest";
import { parseIsoDuration } from "../iso8601";
import { DurationCache } from "../cache";
import { QuotaBudget, RateLimiter, nextPacificMidnight } from "../guards";
import { createDurationsHandler, MAX_IDS } from "../handler";
import { mockBatch } from "../youtube";

const id = (n: number) => `vid${String(n).padStart(8, "0")}`; // 11 chars

function post(body: unknown, ip = "1.2.3.4") {
  return new Request("http://x/api/durations", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function ytFetch(durationFor: (id: string) => string | undefined) {
  return vi.fn(async (url: string) => {
    const ids = new URL(url).searchParams.get("id")!.split(",");
    const items = ids.flatMap((i) => {
      const d = durationFor(i);
      return d ? [{ id: i, contentDetails: { duration: d } }] : [];
    });
    return new Response(JSON.stringify({ items }), { status: 200 });
  });
}

describe("parseIsoDuration", () => {
  it.each([
    ["PT3M33S", 213],
    ["PT1H2M3S", 3723],
    ["P1DT2H", 93600],
    ["PT45S", 45],
    ["P0D", null],
    ["PT0S", null],
    ["", null],
    ["garbage", null],
    ["PT", null],
  ])("%s -> %s", (input, out) => expect(parseIsoDuration(input)).toBe(out));
});

describe("DurationCache", () => {
  it("evicts least recently used and expires entries", () => {
    let t = 0;
    const c = new DurationCache(2, 1000, 100, () => t);
    c.set("a", 1);
    c.set("b", null);
    c.get("a");
    c.set("c", 3);
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toBe(1);
    t = 2000;
    expect(c.get("a")).toBeUndefined();
  });
});

describe("guards", () => {
  it("rate limits per client within a window", () => {
    let t = 0;
    const r = new RateLimiter(2, 1000, () => t);
    expect(r.check("x")).toBe(0);
    expect(r.check("x")).toBe(0);
    expect(r.check("x")).toBeGreaterThan(0);
    expect(r.check("y")).toBe(0);
    t = 1000;
    expect(r.check("x")).toBe(0);
  });

  it("a limit of 0 blocks the very first request", () => {
    const r = new RateLimiter(0, 60_000);
    expect(r.check("x")).toBe(60);
    expect(r.check("x")).toBe(60);
  });

  it("next Pacific midnight is within 24h and in the future", () => {
    const now = Date.UTC(2026, 9, 8, 11, 0, 0);
    const next = nextPacificMidnight(now);
    expect(next).toBeGreaterThan(now);
    expect(next - now).toBeLessThanOrEqual(24 * 3600_000);
    // 2026-10-08 11:00 UTC is 04:00 PDT -> next midnight is 2026-10-09 07:00 UTC
    expect(next).toBe(Date.UTC(2026, 9, 9, 7, 0, 0));
  });

  it("budget refuses past the daily cap and after exhaustion", () => {
    const b = new QuotaBudget(5);
    expect(b.tryReserve(4)).toBe(true);
    expect(b.tryReserve(2)).toBe(false);
    expect(b.tryReserve(1)).toBe(true);
    const b2 = new QuotaBudget(100);
    b2.exhaust();
    expect(b2.tryReserve(1)).toBe(false);
  });
});

describe("POST /api/durations", () => {
  it("returns the agreed shape, batches by 50, nulls missing/live videos", async () => {
    const f = ytFetch((i) => (i === id(1) ? undefined : i === id(2) ? "P0D" : "PT3M33S"));
    const POST = createDurationsHandler({ apiKey: "k", fetchImpl: f });
    const ids = Array.from({ length: 120 }, (_, i) => id(i));
    const res = await POST(post({ ids }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const { durations } = await res.json();
    expect(Object.keys(durations)).toHaveLength(120);
    expect(durations[id(0)]).toBe(213);
    expect(durations[id(1)]).toBeNull();
    expect(durations[id(2)]).toBeNull();
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("serves repeat IDs from cache without calling YouTube", async () => {
    const f = ytFetch(() => "PT10S");
    const POST = createDurationsHandler({ apiKey: "k", fetchImpl: f });
    await POST(post({ ids: [id(1), id(2)] }));
    const res = await POST(post({ ids: [id(1), id(2), id(1)] }));
    expect((await res.json()).durations).toEqual({ [id(1)]: 10, [id(2)]: 10 });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["not json", "invalid_json"],
    [{}, "ids_required"],
    [{ ids: [] }, "ids_required"],
    [{ ids: ["short"] }, "invalid_id"],
    [{ ids: [id(1), 42] }, "invalid_id"],
    [{ ids: Array.from({ length: MAX_IDS + 1 }, (_, i) => id(i)) }, "too_many_ids"],
  ])("rejects %j with 400", async (body, error) => {
    const POST = createDurationsHandler({ apiKey: "k", fetchImpl: ytFetch(() => "PT1S") });
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ durations: {}, error });
  });

  it("accepts exactly 2,000 IDs in 40 calls", async () => {
    const f = ytFetch(() => "PT1M");
    const POST = createDurationsHandler({ apiKey: "k", fetchImpl: f });
    const res = await POST(post({ ids: Array.from({ length: MAX_IDS }, (_, i) => id(i)) }));
    expect(res.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(40);
  });

  it("rate limits a client", async () => {
    const POST = createDurationsHandler({
      apiKey: "k",
      fetchImpl: ytFetch(() => "PT1S"),
      limiter: new RateLimiter(1, 60_000),
    });
    expect((await POST(post({ ids: [id(1)] }))).status).toBe(200);
    const res = await POST(post({ ids: [id(1)] }));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
    expect((await res.json()).durations).toEqual({});
  });

  it("returns 429 with empty durations when the daily budget is spent", async () => {
    const POST = createDurationsHandler({ apiKey: "k", fetchImpl: ytFetch(() => "PT1S"), budget: new QuotaBudget(1) });
    const res = await POST(post({ ids: Array.from({ length: 51 }, (_, i) => id(i)) }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ durations: {}, error: "daily_budget_exhausted" });
  });

  it("drops partial data and stops when YouTube reports quotaExceeded", async () => {
    const f = vi.fn(async () =>
      new Response(JSON.stringify({ error: { errors: [{ reason: "quotaExceeded" }] } }), { status: 403 }),
    );
    const budget = new QuotaBudget(9000);
    const POST = createDurationsHandler({ apiKey: "k", fetchImpl: f, budget });
    const res = await POST(post({ ids: [id(1)] }));
    expect(res.status).toBe(429);
    expect((await res.json()).durations).toEqual({});
    expect(budget.tryReserve(1)).toBe(false);
  });

  it("returns 503 with empty durations when no API key is configured", async () => {
    const res = await createDurationsHandler({})(post({ ids: [id(1)] }));
    expect(res.status).toBe(503);
    expect((await res.json()).durations).toEqual({});
  });

  it("mock mode works without a key and is deterministic", async () => {
    const POST = createDurationsHandler({ mock: true });
    const { durations } = await (await POST(post({ ids: [id(1), id(2)] }))).json();
    expect(durations).toEqual(mockBatch([id(1), id(2)]));
  });

  it("never logs IDs", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m));
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response("boom", { status: 500 }))
      .mockImplementation(ytFetch(() => "PT1S"));
    const POST = createDurationsHandler({ apiKey: "k", fetchImpl: f });
    await POST(post({ ids: Array.from({ length: 60 }, (_, i) => id(i)) }));
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });
});
