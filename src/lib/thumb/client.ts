/**
 * Client for Backend Dev's thumbnail proxy (docs/api-durations.md, design/SPEC.md §7):
 *
 *   POST /api/thumb  { "id": "<11-char video id>" }  ->  image bytes | fast non-200
 *
 * The browser never talks to i.ytimg.com. Resolves to a same-origin blob: URL (so the share-card
 * export can inline it) or null for any failure: invalid ID, non-2xx (404 before the route existed, too),
 * network error, or longer than 3 s (the request is aborted, and a result that still shows up late is
 * thrown away, so the placeholder never swaps mid-view). The caller owns the URL and revokes it.
 */
import { VIDEO_ID_PATTERN } from "@/lib/takeout/normalize";

export const THUMB_TIMEOUT_MS = 3000;

export type ThumbLoader = (videoId: string) => Promise<string | null>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface FetchThumbOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  endpoint?: string;
  createObjectURL?: (blob: Blob) => string;
}

export function fetchThumbnail(videoId: string, opts: FetchThumbOptions = {}): Promise<string | null> {
  if (!VIDEO_ID_PATTERN.test(videoId)) return Promise.resolve(null);
  const timeoutMs = opts.timeoutMs ?? THUMB_TIMEOUT_MS;
  const fetchImpl: FetchLike = opts.fetchImpl ?? ((i, init) => fetch(i, init));
  const create = opts.createObjectURL ?? ((b: Blob) => URL.createObjectURL(b));
  const controller = new AbortController();

  return new Promise<string | null>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      controller.abort(new DOMException("thumbnail timeout", "TimeoutError"));
      resolve(null);
    }, timeoutMs);

    (async () => {
      try {
        const res = await fetchImpl(opts.endpoint ?? "/api/thumb", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: videoId }),
          signal: controller.signal,
        });
        if (!res.ok) return null;
        const blob = await res.blob();
        if (!blob.size || (blob.type && !blob.type.startsWith("image/"))) return null;
        return blob;
      } catch {
        return null;
      }
    })().then((blob) => {
      if (settled) return; // timed out: ignore the late result entirely
      settled = true;
      clearTimeout(timer);
      if (!blob) return resolve(null);
      try {
        resolve(create(blob));
      } catch {
        resolve(null);
      }
    });
  });
}
