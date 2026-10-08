import { RateLimiter } from "../durations/guards";
import { clientKey } from "../durations/handler";
import type { FetchLike } from "../durations/youtube";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const MAX_BYTES = 2 * 1024 * 1024;
const OK_TYPES = /^image\/(jpeg|webp|png)$/;

export type ThumbDeps = {
  limiter?: RateLimiter;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

const fail = (status: number, error: string, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...extra },
  });

/**
 * Fetch one thumbnail from i.ytimg.com. Sends no headers from the user's request
 * (no IP, cookies, user agent, or referrer), only a fixed Accept header.
 * Returns null on 404 (YouTube's grey placeholder), a wrong type, oversize, or a timeout.
 */
async function fetchOne(url: string, fetchImpl: FetchLike, signal: AbortSignal): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  try {
    const res = await fetchImpl(url, {
      headers: { accept: "image/webp,image/jpeg,image/*" },
      referrerPolicy: "no-referrer",
      redirect: "follow",
      cache: "no-store",
      signal,
    });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !OK_TYPES.test(type)) return null;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return null;
    return { bytes, type };
  } catch {
    return null;
  }
}

/**
 * POST /api/thumb  { id }  ->  image bytes (200) | JSON error (400/404/429/504)
 *
 * The ID goes in the body, not the URL, so it doesn't show up in the host's request logs.
 * Tries the 1280×720 maxres image and the always-present 480×360 hq image in parallel and
 * prefers maxres. hq is 4:3 with black bars, which a 16:9 cover crop removes. Every failure is a fast non-200.
 */
export function createThumbHandler(deps: ThumbDeps = {}) {
  const limiter = deps.limiter ?? new RateLimiter(30, 10 * 60_000);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 2500;

  return async function POST(req: Request): Promise<Response> {
    const retry = limiter.check(clientKey(req));
    if (retry > 0) return fail(429, "rate_limited", { "retry-after": String(retry) });

    const raw = await req.text();
    if (raw.length > 1024) return fail(400, "invalid_request");
    let id: unknown;
    try {
      id = (JSON.parse(raw) as { id?: unknown })?.id;
    } catch {
      return fail(400, "invalid_json");
    }
    if (typeof id !== "string" || !VIDEO_ID.test(id)) return fail(400, "invalid_id");

    const signal = AbortSignal.timeout(timeoutMs);
    const base = `https://i.ytimg.com/vi/${id}`;
    const [maxres, hq] = await Promise.all([
      fetchOne(`${base}/maxresdefault.jpg`, fetchImpl, signal),
      fetchOne(`${base}/hqdefault.jpg`, fetchImpl, signal),
    ]);
    const img = maxres ?? hq;
    if (!img) return fail(signal.aborted ? 504 : 404, signal.aborted ? "timeout" : "not_found");

    return new Response(img.bytes, {
      status: 200,
      headers: {
        "content-type": img.type,
        "content-length": String(img.bytes.byteLength),
        "cache-control": "private, max-age=86400",
        "x-content-type-options": "nosniff",
        "cross-origin-resource-policy": "same-origin",
      },
    });
  };
}
