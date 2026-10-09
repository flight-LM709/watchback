/**
 * Client for Backend Dev's POST /api/durations (see docs/api-durations.md).
 *
 *   POST /api/durations  { ids: string[] }   // 1..2000 unique IDs, single request
 *   200                  { durations: { [id]: seconds | null }, isShort?: { [id]: true | false | null } }
 *   4xx/5xx              { durations: {}, error: "…" }
 *
 * Any failure (HTTP error, network error, bad JSON, timeout) resolves to `durations: {}`,
 * which makes estimateWatchTime() return null, which drops the watch-time slide.
 *
 * `isShort` is optional (older deployments don't send it). A missing or malformed map is
 * dropped (`isShort` stays undefined), which makes estimateShortsSplit() return null.
 *
 * Failures keep `status`, `error` and the `Retry-After` header (as `retryAfterSec`) so the story can
 * show the lookup-failed ("No split this time.") card with the right wording (see shortsUnavailable.ts).
 */
import { VIDEO_ID_PATTERN } from "./normalize";
import type { WatchStats } from "./stats";
import {
  buildDurationSample,
  estimateWatchTime,
  type DurationSample,
  type DurationSampleOptions,
  type DurationsResponse,
  type WatchTimeEstimate,
} from "./watchTime";

/** Per-ID Shorts flag from /api/durations. null = private/deleted/shape unreadable. A missing ID = not looked up. */
export type IsShortResponse = Record<string, boolean | null | undefined>;

/** Must match MAX_IDS in src/lib/durations/handler.ts. */
export const MAX_DURATION_IDS = 2000;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface FetchDurationsOptions {
  endpoint?: string;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface FetchDurationsResult {
  durations: DurationsResponse;
  /** Only present when the server sent a well-formed `isShort` object (new API). */
  isShort?: IsShortResponse;
  /** HTTP status, when a response arrived. */
  status?: number;
  /** Backend error code (e.g. "rate_limited") or a client-side reason ("network", "timeout", "bad_response"). */
  error?: string;
  /** `Retry-After` from the response, in seconds (delta-seconds or an HTTP date), when present and valid. */
  retryAfterSec?: number;
}

/** Retry-After → seconds from `now`: delta-seconds ("900") or an HTTP date. Invalid/missing → undefined. */
export function parseRetryAfter(value: string | null | undefined, now = Date.now()): number | undefined {
  if (value == null) return undefined;
  const v = value.trim();
  if (/^\d+$/.test(v)) return Number(v);
  // HTTP date ("Fri, 09 Oct 2026 08:15:00 GMT"); bare numbers like "-5" are not dates here.
  const t = /^[A-Za-z]{3},/.test(v) ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? undefined : Math.max(0, Math.round((t - now) / 1000));
}

export async function fetchDurations(ids: string[], opts: FetchDurationsOptions = {}): Promise<FetchDurationsResult> {
  const unique = [...new Set(ids)].filter((id) => VIDEO_ID_PATTERN.test(id));
  if (unique.length === 0) return { durations: {} };
  if (unique.length > MAX_DURATION_IDS) {
    throw new RangeError(`fetchDurations: ${unique.length} IDs > ${MAX_DURATION_IDS}. Use buildDurationSample() first.`);
  }
  const fetchImpl: FetchLike = opts.fetchImpl ?? ((input, init) => fetch(input, init));
  const timeout = AbortSignal.timeout(opts.timeoutMs ?? 20_000);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;

  let res: Response;
  try {
    res = await fetchImpl(opts.endpoint ?? "/api/durations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: unique }),
      signal,
      cache: "no-store",
    });
  } catch (e) {
    return { durations: {}, error: e instanceof DOMException && e.name === "TimeoutError" ? "timeout" : "network" };
  }

  const retryAfterSec = parseRetryAfter(res.headers?.get?.("retry-after"));
  const retry = retryAfterSec !== undefined ? { retryAfterSec } : {};
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { durations: {}, status: res.status, error: "bad_response", ...retry };
  }
  const errCode = typeof (body as { error?: unknown })?.error === "string" ? (body as { error: string }).error : undefined;
  if (!res.ok) return { durations: {}, status: res.status, error: errCode ?? `http_${res.status}`, ...retry };

  const raw = (body as { durations?: unknown })?.durations;
  if (!raw || typeof raw !== "object") return { durations: {}, status: res.status, error: "bad_response" };
  // Keep only IDs we asked for, with sane values.
  const asked = new Set(unique);
  const durations: DurationsResponse = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!asked.has(id)) continue;
    durations[id] = typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
  }
  const isShort = parseIsShort((body as { isShort?: unknown })?.isShort, asked);
  return { durations, ...(isShort ? { isShort } : {}), status: res.status, ...(errCode ? { error: errCode } : {}) };
}

/**
 * Optional `isShort` sibling map. Not an object (missing, null, array, string…) → undefined (old API).
 * Unknown IDs are dropped; any value other than true/false becomes null (unknown).
 */
export function parseIsShort(raw: unknown, asked: ReadonlySet<string>): IsShortResponse | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: IsShortResponse = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!asked.has(id)) continue;
    out[id] = typeof v === "boolean" ? v : null;
  }
  return out;
}

/**
 * Whole pipeline for the watch-time slide: sample ≤2000 IDs, one request, estimate.
 * Returns null when nothing usable came back (drop the slide).
 */
export async function lookupWatchTime(
  stats: Pick<WatchStats, "uniqueVideoIds" | "playCountsById">,
  opts: FetchDurationsOptions & DurationSampleOptions = {},
): Promise<{
  estimate: WatchTimeEstimate | null;
  error?: string;
  requestedIds: number;
  /** Raw lookup, for estimateShortsSplit(stats, isShort, durations, sample). */
  durations: DurationsResponse;
  isShort?: IsShortResponse;
  sample: DurationSample;
}> {
  const sample = buildDurationSample(stats, { cap: Math.min(opts.cap ?? MAX_DURATION_IDS, MAX_DURATION_IDS), topCount: opts.topCount, seed: opts.seed });
  const { durations, isShort, error } = await fetchDurations(sample.ids, opts);
  return { estimate: estimateWatchTime(durations, stats.playCountsById, sample), error, requestedIds: sample.ids.length, durations, isShort, sample };
}
