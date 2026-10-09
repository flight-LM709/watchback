import { describe, expect, it, vi } from "vitest";
import { parseIsoDuration } from "../iso8601";
import { DurationCache } from "../cache";
import { QuotaBudget, RateLimiter, nextPacificMidnight } from "../guards";
import { createDurationsHandler, MAX_IDS } from "../handler";
import { classifyShort, mockBatch } from "../youtube";

const id = (n: number) => `vid${String(n).padStart(8, "0")}`; // 11 chars

function post(body: unknown, ip = "1.2.3.4") {
  return new Request("http://x/api/durations", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function ytFetch(
  durationFor: (id: string) => string | undefined,
  shapeFor: (id: string) => [w: string, h: string] | undefined = () => ["1280", "720"],
) {
  return vi.fn(async (url: string) => {
    const ids = new URL(url).searchParams.get("id")!.split(",");
    const items = ids.flatMap((i) => {
      const d = durationFor(i);
      const shape = shapeFor(i);
      const player = shape ? { embedWidth: shape[0], embedHeight: shape[1] } : undefined;
      return d ? [{ id: i, contentDetails: { duration: d }, ...(player ? { player } : {}) }] : [];
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
    const a = { seconds: 1, isShort: true };
    c.set("a", a);
    c.set("b", { seconds: null, isShort: null });
    c.get("a");
    c.set("c", { seconds: 3, isShort: false });
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toEqual(a);
    t = 2000;
    expect(c.get("a")).toBeUndefined();
  });

  it("keeps unavailable videos for the shorter null TTL", () => {
    let t = 0;
    const c = new DurationCache(10, 1000, 100, () => t);
    c.set("gone", { seconds: null, isShort: null });
    c.set("ok", { seconds: 50, isShort: true });
    t = 150;
    expect(c.get("gone")).toBeUndefined();
    expect(c.get("ok")).toEqual({ seconds: 50, isShort: true });
  });
});

describe("classifyShort", () => {
  it.each([
    [45, 405, 720, true], // vertical Short
    [180, 720, 720, true], // square, exactly 3 minutes
    [181, 405, 720, false], // vertical but too long
    [150, 1280, 720, false], // 2.5-minute landscape music video
    [600, 1280, 720, false],
    [30, undefined, undefined, null], // shape unknown
    [30, 0, 0, null],
    [900, undefined, undefined, false], // too long to be a Short whatever the shape
    [null, 405, 720, null], // unavailable
  ])("%s s at %sx%s -> %s", (s, w, h, out) => expect(classifyShort(s, w, h)).toBe(out));
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

  it("re-probes 15 minutes after exhaustion instead of blocking until Pacific midnight", () => {
    let t = Date.UTC(2026, 9, 9, 8, 0, 0); // 01:00 PDT, ~23h before reset
    const b = new QuotaBudget(100, () => t);
    b.exhaust();
    expect(b.tryReserve(1)).toBe(false);
    expect(b.retryAfterSeconds()).toBe(900);
    t += 15 * 60_000;
    expect(b.tryReserve(1)).toBe(true);
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
    const { durations, isShort } = await res.json();
    expect(Object.keys(durations)).toHaveLength(120);
    expect(Object.keys(isShort)).toHaveLength(120);
    expect(durations[id(0)]).toBe(213);
    expect(durations[id(1)]).toBeNull();
    expect(durations[id(2)]).toBeNull();
    expect(isShort[id(0)]).toBe(false);
    expect(isShort[id(1)]).toBeNull();
    expect(isShort[id(2)]).toBeNull();
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("asks for the player shape in the same 1-unit call", async () => {
    const f = ytFetch(() => "PT30S");
    const POST = createDurationsHandler({ apiKey: "k", fetchImpl: f });
    await POST(post({ ids: [id(1)] }));
    const url = new URL(f.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/youtube/v3/videos");
    expect(url.searchParams.get("part")).toBe("contentDetails,player");
    expect(url.searchParams.get("maxHeight")).toBeTruthy();
    expect(url.searchParams.get("fields")).toContain("player(embedWidth,embedHeight)");
  });

  it("flags Shorts from length and player shape, and caches the flag", async () => {
    const durationFor = (i: string) =>
      ({ [id(1)]: "PT45S", [id(2)]: "PT2M30S", [id(3)]: "PT2M59S", [id(4)]: "PT12M", [id(5)]: "PT20S" })[i];
    const shapeFor = (i: string): [string, string] | undefined =>
      i === id(1) || i === id(3) || i === id(4) ? ["405", "720"] : i === id(2) ? ["1280", "720"] : undefined;
    const f = ytFetch(durationFor, shapeFor);
    const POST = createDurationsHandler({ apiKey: "k", fetchImpl: f });
    const ids = [id(1), id(2), id(3), id(4), id(5), id(6)];
    const expected = {
      [id(1)]: true, // 45 s vertical
      [id(2)]: false, // 2:30 landscape music video
      [id(3)]: true, // 2:59 vertical
      [id(4)]: false, // 12 min, vertical doesn't matter
      [id(5)]: null, // no player shape
      [id(6)]: null, // unavailable
    };
    expect((await (await POST(post({ ids }))).json()).isShort).toEqual(expected);
    const again = await (await POST(post({ ids }))).json();
    expect(again.isShort).toEqual(expected);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("serves repeat IDs from cache without calling YouTube", async () => {
    const f = ytFetch(() => "PT10S");
    const POST = createDurationsHandler({ apiKey: "k", fetchImpl: f });
    await POST(post({ ids: [id(1), id(2)] }));
    const res = await POST(post({ ids: [id(1), id(2), id(1)] }));
    const body = await res.json();
    expect(body.durations).toEqual({ [id(1)]: 10, [id(2)]: 10 });
    expect(body.isShort).toEqual({ [id(1)]: false, [id(2)]: false });
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

  it("can skip the rate limit in mock mode only", async () => {
    const mocked = createDurationsHandler({ mock: true, skipRateLimit: true, limiter: new RateLimiter(1, 60_000) });
    for (let n = 0; n < 12; n++) expect((await mocked(post({ ids: [id(1)] }))).status).toBe(200);
    const real = createDurationsHandler({
      apiKey: "k",
      fetchImpl: ytFetch(() => "PT1S"),
      skipRateLimit: true,
      limiter: new RateLimiter(1, 60_000),
    });
    expect((await real(post({ ids: [id(1)] }))).status).toBe(200);
    expect((await real(post({ ids: [id(1)] }))).status).toBe(429);
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

  it("treats a YouTube rate-limit 403 as a throttle: retries once and never trips the daily stop", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const ok = ytFetch(() => "PT2M");
    const f = vi.fn(async (url: string) => {
      calls++;
      if (calls === 1)
        return new Response(JSON.stringify({ error: { errors: [{ reason: "rateLimitExceeded" }] } }), { status: 403 });
      return ok(url);
    });
    const budget = new QuotaBudget(9000);
    const POST = createDurationsHandler({ apiKey: "k", fetchImpl: f, budget });
    const pending = POST(post({ ids: [id(1)] }));
    await vi.advanceTimersByTimeAsync(1500);
    const res = await pending;
    vi.useRealTimers();
    expect(res.status).toBe(200);
    expect((await res.json()).durations[id(1)]).toBe(120);
    expect(calls).toBe(2);
    expect(budget.tryReserve(1)).toBe(true);
  });

  it("returns 503 with empty durations when no API key is configured", async () => {
    const res = await createDurationsHandler({})(post({ ids: [id(1)] }));
    expect(res.status).toBe(503);
    expect((await res.json()).durations).toEqual({});
  });

  it("mock mode works without a key and is deterministic", async () => {
    const POST = createDurationsHandler({ mock: true });
    const ids = Array.from({ length: 200 }, (_, i) => id(i));
    const { durations, isShort } = await (await POST(post({ ids }))).json();
    const expected = mockBatch(ids);
    for (const i of ids) {
      expect(durations[i]).toBe(expected[i].seconds);
      expect(isShort[i]).toBe(expected[i].isShort);
    }
    const flags = Object.values(isShort);
    expect(flags).toContain(true);
    expect(flags).toContain(false);
    expect(flags).toContain(null);
  });

  it("never logs IDs or the key (only status + reason on upstream errors)", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response("boom", { status: 500 }))
      .mockImplementation(ytFetch(() => "PT1S"));
    const POST = createDurationsHandler({ apiKey: "k", fetchImpl: f });
    const ids = Array.from({ length: 60 }, (_, i) => id(i));
    await POST(post({ ids }));
    const logged = spies.flatMap((s) => s.mock.calls.flat().map(String)).join(" ");
    for (const v of ids) expect(logged).not.toContain(v);
    expect(logged).not.toMatch(/\bk\b|key=/);
    for (const s of spies) s.mockRestore();
  });
});
