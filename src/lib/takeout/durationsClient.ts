/**
 * Client for Backend Dev's POST /api/durations (see docs/api-durations.md).
 *
 *   POST /api/durations  { ids: string[] }   // 1..2000 unique IDs, single request
 *   200                  { durations: { [id]: seconds | null } }
 *   4xx/5xx              { durations: {}, error: "…" }
 *
 * Any failure (HTTP error, network error, bad JSON, timeout) resolves to `durations: {}`,
 * which makes estimateWatchTime() return null, which drops the watch-time slide.
 */
import { VIDEO_ID_PATTERN } from "./normalize";
import type { WatchStats } from "./stats";
import {
  buildDurationSample,
  estimateWatchTime,
  type DurationSampleOptions,
  type DurationsResponse,
  type WatchTimeEstimate,
} from "./watchTime";

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
  /** HTTP status, when a response arrived. */
  status?: number;
  /** Backend error code (e.g. "rate_limited") or a client-side reason ("network", "timeout", "bad_response"). */
  error?: string;
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

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { durations: {}, status: res.status, error: "bad_response" };
  }
  const errCode = typeof (body as { error?: unknown })?.error === "string" ? (body as { error: string }).error : undefined;
  if (!res.ok) return { durations: {}, status: res.status, error: errCode ?? `http_${res.status}` };

  const raw = (body as { durations?: unknown })?.durations;
  if (!raw || typeof raw !== "object") return { durations: {}, status: res.status, error: "bad_response" };
  // Keep only IDs we asked for, with sane values.
  const asked = new Set(unique);
  const durations: DurationsResponse = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!asked.has(id)) continue;
    durations[id] = typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
  }
  return { durations, status: res.status, ...(errCode ? { error: errCode } : {}) };
}

/**
 * Whole pipeline for the watch-time slide: sample ≤2000 IDs, one request, estimate.
 * Returns null when nothing usable came back (drop the slide).
 */
export async function lookupWatchTime(
  stats: Pick<WatchStats, "uniqueVideoIds" | "playCountsById">,
  opts: FetchDurationsOptions & DurationSampleOptions = {},
): Promise<{ estimate: WatchTimeEstimate | null; error?: string; requestedIds: number }> {
  const sample = buildDurationSample(stats, { cap: Math.min(opts.cap ?? MAX_DURATION_IDS, MAX_DURATION_IDS), topCount: opts.topCount, seed: opts.seed });
  const { durations, error } = await fetchDurations(sample.ids, opts);
  return { estimate: estimateWatchTime(durations, stats.playCountsById, sample), error, requestedIds: sample.ids.length };
}
