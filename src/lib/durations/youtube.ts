import { parseIsoDuration } from "./iso8601";

export const YT_BATCH_SIZE = 50;

export class QuotaExceededError extends Error {
  constructor() {
    super("YouTube API quota exceeded");
  }
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Look up durations for up to 50 IDs with one videos.list call (1 quota unit).
 * IDs missing from the response (removed / private) map to null.
 * Throws QuotaExceededError on a quota 403; throws Error on other failures.
 */
export async function fetchBatch(
  ids: string[],
  apiKey: string,
  fetchImpl: FetchLike = fetch,
): Promise<Record<string, number | null>> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "contentDetails");
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("fields", "items(id,contentDetails/duration)");
  url.searchParams.set("maxResults", String(YT_BATCH_SIZE));
  url.searchParams.set("key", apiKey);

  const res = await fetchImpl(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    let reason = "";
    try {
      const body = (await res.json()) as { error?: { errors?: { reason?: string }[] } };
      reason = body.error?.errors?.[0]?.reason ?? "";
    } catch {
      /* ignore */
    }
    if (res.status === 403 && /quota|dailyLimit|rateLimit/i.test(reason)) throw new QuotaExceededError();
    throw new Error(`YouTube API ${res.status}${reason ? ` (${reason})` : ""}`);
  }
  const body = (await res.json()) as { items?: { id?: string; contentDetails?: { duration?: string } }[] };
  const out: Record<string, number | null> = Object.fromEntries(ids.map((id) => [id, null]));
  for (const item of body.items ?? []) {
    if (item.id && item.id in out) out[item.id] = parseIsoDuration(item.contentDetails?.duration);
  }
  return out;
}

/** Deterministic fake durations for local dev / QA without an API key (YOUTUBE_API_MOCK=1). */
export function mockBatch(ids: string[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const id of ids) {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
    const r = (h >>> 0) % 1000;
    // ~3% unavailable, ~2% very long streams, the rest 30s–40min
    out[id] = r < 30 ? null : r < 50 ? 4 * 3600 + r * 60 : 30 + ((h >>> 0) % 2370);
  }
  return out;
}

/** Run async tasks with a concurrency limit. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}
