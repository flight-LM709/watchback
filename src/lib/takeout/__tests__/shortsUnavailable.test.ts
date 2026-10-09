import { describe, expect, it } from "vitest";
import { fetchDurations, parseRetryAfter, type FetchLike } from "../durationsClient";
import { lookupFailed, shortsUnavailableFor, shortsUnavailableReason, SOON_MAX_RETRY_AFTER_SEC } from "../shortsUnavailable";

const ID = "dQw4w9WgXcQ";
const reply = (status: number, body: unknown, headers: Record<string, string> = {}): FetchLike =>
  async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const lookup = (f: FetchLike) => fetchDurations([ID], { fetchImpl: f });

describe("lookup-failed card: soon / later", () => {
  it("502 upstream_failed → soon", async () => {
    const r = await lookup(reply(502, { durations: {}, error: "upstream_failed" }));
    expect([r.status, r.error, r.retryAfterSec]).toEqual([502, "upstream_failed", undefined]);
    expect(shortsUnavailableFor(r)).toBe("soon");
  });

  it("429 daily_budget_exhausted with retry-after 900 (YouTube quota) → soon; 901 and 3600 (our daily cap) → later", async () => {
    const r900 = await lookup(reply(429, { durations: {}, error: "daily_budget_exhausted" }, { "retry-after": "900" }));
    expect(r900.retryAfterSec).toBe(900);
    expect(shortsUnavailableFor(r900)).toBe("soon");
    expect(SOON_MAX_RETRY_AFTER_SEC).toBe(900);
    const r901 = await lookup(reply(429, { durations: {}, error: "daily_budget_exhausted" }, { "retry-after": "901" }));
    expect(shortsUnavailableFor(r901)).toBe("later");
    const r3600 = await lookup(reply(429, { durations: {}, error: "daily_budget_exhausted" }, { "retry-after": "3600" }));
    expect(r3600.retryAfterSec).toBe(3600);
    expect(shortsUnavailableFor(r3600)).toBe("later");
  });

  it("429 with no or an invalid retry-after → later; per-IP rate_limited with a short wait → soon", async () => {
    expect(shortsUnavailableFor(await lookup(reply(429, { durations: {}, error: "daily_budget_exhausted" })))).toBe("later");
    expect(shortsUnavailableFor(await lookup(reply(429, { durations: {}, error: "daily_budget_exhausted" }, { "retry-after": "soon-ish" })))).toBe("later");
    expect(shortsUnavailableFor(await lookup(reply(429, { durations: {}, error: "rate_limited" }, { "retry-after": "120" })))).toBe("soon");
  });

  it("503 not_configured → later", async () => {
    const r = await lookup(reply(503, { durations: {}, error: "not_configured" }));
    expect(r.status).toBe(503);
    expect(shortsUnavailableFor(r)).toBe("later");
  });

  it("network error and timeout → soon (no response, usually brief); bad JSON → later", async () => {
    const net = await lookup(async () => { throw new TypeError("Failed to fetch"); });
    expect([net.error, net.status]).toEqual(["network", undefined]);
    expect(shortsUnavailableFor(net)).toBe("soon");
    const timeout = await fetchDurations([ID], { fetchImpl: (_u, init) => new Promise((_r, rej) => init?.signal?.addEventListener("abort", () => rej(init.signal!.reason))), timeoutMs: 5 });
    expect(timeout.error).toBe("timeout");
    expect(shortsUnavailableFor(timeout)).toBe("soon");
    const badOk = await lookup(async () => new Response("not json", { status: 200 }));
    expect([badOk.status, badOk.error]).toEqual([200, "bad_response"]);
    expect(shortsUnavailableFor(badOk)).toBe("later");
    const bad = await lookup(async () => new Response("<html>", { status: 502 }));
    expect([bad.status, bad.error]).toEqual([502, "bad_response"]);
    expect(shortsUnavailableFor(bad)).toBe("soon"); // a 502 is a 502
  });

  it("an OK lookup → no card; OK but no isShort (old API) or no usable duration → later", async () => {
    const ok = await lookup(reply(200, { durations: { [ID]: 212 }, isShort: { [ID]: false } }));
    expect(lookupFailed(ok)).toBe(false);
    expect(shortsUnavailableFor(ok)).toBeNull();
    expect(shortsUnavailableFor(await lookup(reply(200, { durations: { [ID]: 212 } })))).toBe("later");
    expect(shortsUnavailableFor(await lookup(reply(200, { durations: { [ID]: null }, isShort: { [ID]: null } })))).toBe("later");
  });

  it("no request (no IDs to look up) → no card", async () => {
    const none = await fetchDurations([], { fetchImpl: reply(503, {}) });
    expect(shortsUnavailableFor(none)).toBeNull();
    expect(shortsUnavailableFor(null)).toBeNull();
  });

  it("reason ignores everything but status + retry-after", () => {
    expect(shortsUnavailableReason({ status: 500 })).toBe("later");
    expect(shortsUnavailableReason({ status: 429, retryAfterSec: 0 })).toBe("soon");
    expect(shortsUnavailableReason({})).toBe("later");
    expect(shortsUnavailableReason({ error: "network" })).toBe("soon");
    expect(shortsUnavailableReason({ error: "timeout" })).toBe("soon");
    // a timeout/network code only counts when no response arrived
    expect(shortsUnavailableReason({ status: 503, error: "network" })).toBe("later");
    expect(shortsUnavailableReason({ error: "bad_response" })).toBe("later");
  });
});

describe("parseRetryAfter", () => {
  it("delta-seconds, HTTP date, junk", () => {
    const now = Date.UTC(2026, 9, 9, 8, 0, 0);
    expect(parseRetryAfter("900")).toBe(900);
    expect(parseRetryAfter(" 60 ")).toBe(60);
    expect(parseRetryAfter(new Date(now + 3600_000).toUTCString(), now)).toBe(3600);
    expect(parseRetryAfter(new Date(now - 5000).toUTCString(), now)).toBe(0);
    expect(parseRetryAfter("-5")).toBeUndefined();
    expect(parseRetryAfter("later")).toBeUndefined();
    expect(parseRetryAfter(null)).toBeUndefined();
  });
});
