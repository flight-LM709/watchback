import { DurationCache } from "./cache";
import { QuotaBudget, RateLimiter } from "./guards";
import { fetchBatch, mapLimit, mockBatch, QuotaExceededError, YT_BATCH_SIZE, type FetchLike } from "./youtube";

export const MAX_IDS = 2000;
export const MAX_BODY_BYTES = 64 * 1024;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export type DurationsDeps = {
  apiKey?: string;
  mock?: boolean;
  cache?: DurationCache;
  limiter?: RateLimiter;
  /** Skip the per-client limiter, for local test passes. Only honoured in mock mode
   *  (never with a real key); defaults to DURATIONS_RATE_LIMIT=off. */
  skipRateLimit?: boolean;
  budget?: QuotaBudget;
  fetchImpl?: FetchLike;
  concurrency?: number;
};

type Durations = Record<string, number | null>;
type ShortFlags = Record<string, boolean | null>;

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  });
}

/** Empty `durations` on every failure, so the client always falls back cleanly. */
const fail = (status: number, error: string, extra?: Record<string, string>) =>
  json(status, { durations: {}, error }, extra);

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}

/**
 * POST /api/durations  { ids: string[] }
 *   -> { durations: { [id]: seconds | null }, isShort: { [id]: true | false | null } }
 * `isShort` is additive; clients that only read `durations` are unaffected.
 * Never logs or persists IDs; the only state is an id->metadata cache and anonymous counters.
 */
export function createDurationsHandler(deps: DurationsDeps = {}) {
  const cache = deps.cache ?? new DurationCache();
  const limiter = deps.limiter ?? new RateLimiter();
  const budget = deps.budget ?? new QuotaBudget();
  const concurrency = deps.concurrency ?? 8;
  const skipRateLimit =
    !!deps.mock && (deps.skipRateLimit ?? process.env.DURATIONS_RATE_LIMIT === "off");

  return async function POST(req: Request): Promise<Response> {
    const retry = skipRateLimit ? 0 : limiter.check(clientKey(req));
    if (retry > 0) return fail(429, "rate_limited", { "retry-after": String(retry) });

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return fail(413, "body_too_large");
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return fail(400, "invalid_json");
    }
    const ids = (body as { ids?: unknown })?.ids;
    if (!Array.isArray(ids) || ids.length === 0) return fail(400, "ids_required");
    if (!ids.every((id) => typeof id === "string" && VIDEO_ID.test(id))) return fail(400, "invalid_id");
    const unique = [...new Set(ids as string[])];
    if (unique.length > MAX_IDS) return fail(400, "too_many_ids");

    const durations: Durations = {};
    const isShort: ShortFlags = {};
    const misses: string[] = [];
    for (const id of unique) {
      const hit = cache.get(id);
      if (hit === undefined) misses.push(id);
      else {
        durations[id] = hit.seconds;
        isShort[id] = hit.isShort;
      }
    }
    if (misses.length === 0) return json(200, { durations, isShort });

    if (!deps.mock && !deps.apiKey) return fail(503, "not_configured");

    const batches: string[][] = [];
    for (let i = 0; i < misses.length; i += YT_BATCH_SIZE) batches.push(misses.slice(i, i + YT_BATCH_SIZE));

    if (!deps.mock && !budget.tryReserve(batches.length)) {
      return fail(429, "daily_budget_exhausted", { "retry-after": String(budget.retryAfterSeconds()) });
    }

    let quotaHit = false;
    await mapLimit(batches, concurrency, async (batch) => {
      if (quotaHit) return;
      try {
        const result = deps.mock ? mockBatch(batch) : await fetchBatch(batch, deps.apiKey!, deps.fetchImpl);
        for (const [id, meta] of Object.entries(result)) {
          durations[id] = meta.seconds;
          isShort[id] = meta.isShort;
          cache.set(id, meta);
        }
      } catch (err) {
        if (err instanceof QuotaExceededError) quotaHit = true;
        // other batch failures: leave those IDs out (client treats missing as null), don't cache
      }
    });

    if (quotaHit) {
      budget.exhaust();
      // Partial data would skew the estimate; drop it so the client falls back.
      return fail(429, "daily_budget_exhausted", { "retry-after": String(budget.retryAfterSeconds()) });
    }
    if (Object.keys(durations).length === 0) return fail(502, "upstream_failed");
    return json(200, { durations, isShort });
  };
}
