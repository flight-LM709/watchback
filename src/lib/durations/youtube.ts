import { parseIsoDuration } from "./iso8601";

export const YT_BATCH_SIZE = 50;

/** Longest video YouTube accepts as a Short (3 minutes, since Oct 2024). */
export const SHORTS_MAX_SECONDS = 180;

/**
 * What we know about one video. `isShort` is a best guess from official metadata only:
 * true  = 3 minutes or shorter AND the player is vertical or square (Shorts are never landscape),
 * false = longer than 3 minutes, or landscape,
 * null  = unavailable video, or its shape couldn't be read.
 * (A `/shorts/` link in the user's history is a stronger signal; the client applies that on top.)
 */
export type VideoMeta = { seconds: number | null; isShort: boolean | null };

export function classifyShort(seconds: number | null, width?: number, height?: number): boolean | null {
  if (seconds === null) return null;
  if (seconds > SHORTS_MAX_SECONDS) return false;
  if (!width || !height || width <= 0 || height <= 0) return null;
  return height >= width;
}

export class QuotaExceededError extends Error {
  constructor() {
    super("YouTube API quota exceeded");
  }
}

/** Short-lived per-user/per-minute throttle from YouTube; not the daily quota. */
export class UpstreamThrottledError extends Error {
  constructor(reason: string) {
    super(`YouTube API throttled (${reason})`);
  }
}

/** Only these reasons mean the project's daily quota is gone. */
const DAILY_QUOTA_REASONS = new Set(["quotaExceeded", "dailyLimitExceeded"]);
const THROTTLE_REASONS = /rateLimitExceeded|userRateLimitExceeded/i;

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Look up duration and player shape for up to 50 IDs with one videos.list call (1 quota unit;
 * adding `part=player` doesn't change the cost). `maxHeight` makes YouTube return
 * `embedWidth`/`embedHeight` in the video's own aspect ratio.
 * IDs missing from the response (removed / private) map to { seconds: null, isShort: null }.
 * Throws QuotaExceededError only for the daily quota, UpstreamThrottledError for short-term
 * rate limits, and Error on other failures. Logs status + reason only, never IDs or the key.
 */
export async function fetchBatch(
  ids: string[],
  apiKey: string,
  fetchImpl: FetchLike = fetch,
): Promise<Record<string, VideoMeta>> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "contentDetails,player");
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("maxHeight", "720");
  url.searchParams.set("fields", "items(id,contentDetails/duration,player(embedWidth,embedHeight))");
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
    console.warn("youtube_api_error", res.status, reason || "-");
    if (res.status === 403 && DAILY_QUOTA_REASONS.has(reason)) throw new QuotaExceededError();
    if ((res.status === 403 || res.status === 429) && THROTTLE_REASONS.test(reason)) throw new UpstreamThrottledError(reason);
    throw new Error(`YouTube API ${res.status}${reason ? ` (${reason})` : ""}`);
  }
  const body = (await res.json()) as {
    items?: {
      id?: string;
      contentDetails?: { duration?: string };
      player?: { embedWidth?: string | number; embedHeight?: string | number };
    }[];
  };
  const out: Record<string, VideoMeta> = Object.fromEntries(ids.map((id) => [id, { seconds: null, isShort: null }]));
  for (const item of body.items ?? []) {
    if (!item.id || !(item.id in out)) continue;
    const seconds = parseIsoDuration(item.contentDetails?.duration);
    const w = Number(item.player?.embedWidth);
    const h = Number(item.player?.embedHeight);
    out[item.id] = { seconds, isShort: classifyShort(seconds, w, h) };
  }
  return out;
}

/** Deterministic fake data for local dev / QA without an API key (YOUTUBE_API_MOCK=1). */
export function mockBatch(ids: string[]): Record<string, VideoMeta> {
  const out: Record<string, VideoMeta> = {};
  for (const id of ids) {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
    const r = (h >>> 0) % 1000;
    // ~3% unavailable, ~2% very long streams, ~35% Shorts-length, the rest 30s–40min
    const u = h >>> 0;
    const seconds = r < 30 ? null : r < 50 ? 4 * 3600 + r * 60 : r < 400 ? 10 + (u % 170) : 30 + (u % 2370);
    // most Shorts-length mock videos are vertical; ~1 in 6 is a landscape clip
    const vertical = r >= 50 && r < 400 && (u >>> 10) % 6 !== 0;
    out[id] = { seconds, isShort: classifyShort(seconds, vertical ? 405 : 1280, 720) };
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
