import { describe, expect, it, vi } from "vitest";
import { createDurationsHandler, MAX_IDS } from "@/lib/durations/handler";
import { RateLimiter } from "@/lib/durations/guards";
import { fetchDurations, lookupWatchTime, MAX_DURATION_IDS, type FetchLike } from "../durationsClient";
import { MAX_SECONDS_PER_PLAY } from "../watchTime";

const id = (i: number) => ("v" + i.toString(36)).padEnd(11, "_");

/** Route client fetches straight into Backend Dev's real handler (mock YouTube). */
function backendFetch(overrides: Parameters<typeof createDurationsHandler>[0] = {}) {
  const handler = createDurationsHandler({ mock: true, limiter: new RateLimiter(1000, 60_000), ...overrides });
  const calls: Array<{ ids: string[]; bytes: number }> = [];
  const f: FetchLike = async (url, init) => {
    const body = String(init?.body ?? "");
    calls.push({ ids: JSON.parse(body).ids, bytes: body.length });
    return handler(new Request(`http://localhost${url}`, { method: init?.method, headers: init?.headers, body }));
  };
  return { f, calls };
}

describe("client ↔ /api/durations contract", () => {
  it("client cap equals the server cap", () => {
    expect(MAX_DURATION_IDS).toBe(MAX_IDS);
  });

  it("sends one POST {ids} with ≤2000 unique IDs under the 64KB body limit, and gets durations back", async () => {
    const playCountsById: Record<string, number> = {};
    const uniqueVideoIds = Array.from({ length: 25_000 }, (_, i) => {
      playCountsById[id(i)] = 1 + ((i * 7) % 13);
      return id(i);
    }).sort((a, b) => playCountsById[b] - playCountsById[a]);
    const { f, calls } = backendFetch();
    const r = await lookupWatchTime({ uniqueVideoIds, playCountsById }, { fetchImpl: f, seed: 1 });
    expect(calls).toHaveLength(1);
    expect(calls[0].ids).toHaveLength(2000);
    expect(new Set(calls[0].ids).size).toBe(2000);
    expect(calls[0].bytes).toBeLessThan(64 * 1024);
    expect(r.requestedIds).toBe(2000);
    expect(r.error).toBeUndefined();
    expect(r.estimate!.seconds).toBeGreaterThan(0);
    expect(r.estimate!.coverage).toBeGreaterThan(0);
  });

  it("mock livestreams (4h+) are capped at 3h per play", async () => {
    // find IDs the backend mock reports as > 3h
    const { f } = backendFetch();
    const ids = Array.from({ length: 2000 }, (_, i) => id(i));
    const { durations } = await fetchDurations(ids, { fetchImpl: f });
    const long = ids.filter((x) => (durations[x] ?? 0) > MAX_SECONDS_PER_PLAY);
    expect(long.length).toBeGreaterThan(0);
    const stats = { uniqueVideoIds: [long[0]], playCountsById: { [long[0]]: 1 } };
    const r = await lookupWatchTime(stats, { fetchImpl: backendFetch().f });
    expect(r.estimate!.seconds).toBe(MAX_SECONDS_PER_PLAY);
  });

  it.each([
    ["503 not_configured", { mock: false }, 0],
    ["429 rate_limited", { limiter: new RateLimiter(1, 60_000) }, 1],
  ])("server error (%s) → durations {} → estimate null (slide dropped)", async (_name, deps, warmups) => {
    const { f } = backendFetch(deps as Parameters<typeof createDurationsHandler>[0]);
    for (let i = 0; i < (warmups as number); i++) await fetchDurations([id(99)], { fetchImpl: f });
    const r = await lookupWatchTime({ uniqueVideoIds: [id(1)], playCountsById: { [id(1)]: 3 } }, { fetchImpl: f });
    expect(r.estimate).toBeNull();
    expect(r.error).toMatch(/not_configured|rate_limited/);
  });

  it("network error / bad JSON / timeout → durations {}", async () => {
    const net: FetchLike = async () => { throw new TypeError("Failed to fetch"); };
    expect(await fetchDurations([id(1)], { fetchImpl: net })).toEqual({ durations: {}, error: "network" });
    const bad: FetchLike = async () => new Response("<html>oops</html>", { status: 200 });
    expect((await fetchDurations([id(1)], { fetchImpl: bad })).durations).toEqual({});
    vi.useFakeTimers();
    try {
      const hang: FetchLike = (_u, init) =>
        new Promise((_res, rej) => init?.signal?.addEventListener("abort", () => rej(init.signal!.reason)));
      const p = fetchDurations([id(1)], { fetchImpl: hang, timeoutMs: 50 });
      await vi.advanceTimersByTimeAsync(60);
      expect((await p).durations).toEqual({});
    } finally {
      vi.useRealTimers();
    }
  });

  it("dedupes, drops malformed IDs, refuses >2000, skips the request when empty", async () => {
    const f = vi.fn<FetchLike>(async () => Response.json({ durations: {} }));
    await fetchDurations([id(1), id(1), "bad id", id(2)], { fetchImpl: f });
    expect(JSON.parse(String(f.mock.calls[0][1]!.body))).toEqual({ ids: [id(1), id(2)] });
    await expect(fetchDurations(Array.from({ length: 2001 }, (_, i) => id(i)), { fetchImpl: f })).rejects.toThrow(RangeError);
    f.mockClear();
    expect(await fetchDurations([], { fetchImpl: f })).toEqual({ durations: {} });
    expect(f).not.toHaveBeenCalled();
  });

  it("ignores IDs it didn't ask for and non-numeric values", async () => {
    const f: FetchLike = async () => Response.json({ durations: { [id(1)]: 100, [id(2)]: "x", [id(9)]: 5 } });
    const r = await fetchDurations([id(1), id(2)], { fetchImpl: f });
    expect(r.durations).toEqual({ [id(1)]: 100, [id(2)]: null });
  });

  describe("optional isShort map", () => {
    it("keeps true/false/null for asked IDs; other values → null; unknown IDs dropped", async () => {
      const f: FetchLike = async () =>
        Response.json({
          durations: { [id(1)]: 30, [id(2)]: 900, [id(3)]: null, [id(4)]: 40 },
          isShort: { [id(1)]: true, [id(2)]: false, [id(3)]: null, [id(4)]: "yes", [id(9)]: true },
        });
      const r = await fetchDurations([id(1), id(2), id(3), id(4)], { fetchImpl: f });
      expect(r.isShort).toEqual({ [id(1)]: true, [id(2)]: false, [id(3)]: null, [id(4)]: null });
      expect(r.durations).toEqual({ [id(1)]: 30, [id(2)]: 900, [id(3)]: null, [id(4)]: 40 });
    });

    it("old API (no isShort) → isShort undefined, durations unchanged", async () => {
      const f: FetchLike = async () => Response.json({ durations: { [id(1)]: 30 } });
      const r = await fetchDurations([id(1)], { fetchImpl: f });
      expect(r).toEqual({ durations: { [id(1)]: 30 }, status: 200 });
      expect("isShort" in r).toBe(false);
    });

    it.each([["null", null], ["array", [true]], ["string", "true"], ["number", 1]])(
      "malformed isShort (%s) is ignored",
      async (_n, isShort) => {
        const f: FetchLike = async () => Response.json({ durations: { [id(1)]: 30 }, isShort });
        const r = await fetchDurations([id(1)], { fetchImpl: f });
        expect(r.isShort).toBeUndefined();
        expect(r.durations).toEqual({ [id(1)]: 30 });
      },
    );

    it("error responses never carry isShort", async () => {
      const f: FetchLike = async () => Response.json({ durations: {}, isShort: { [id(1)]: true }, error: "rate_limited" }, { status: 429 });
      const r = await fetchDurations([id(1)], { fetchImpl: f });
      expect(r.isShort).toBeUndefined();
      expect(r.error).toBe("rate_limited");
    });
  });
});
