/**
 * lookup-failed ("No split this time.") card (slide kind `shorts-unavailable`): shown ONCE in place of slides 16
 * and 17 when the length lookup was attempted and failed. Copy: slides.shortsVsLong.unavailable*.
 *
 * Wording rule (Project Lead / Copywriter):
 *   "soon"  → 502 (upstream_failed, no wait) or a 429 whose Retry-After is ≤ 15 minutes (900 s,
 *             e.g. YouTube's quota or the per-IP rate limit).
 *   "later" → everything else: a 429 with a longer or missing Retry-After (our own daily cap),
 *             503 not_configured, timeouts / network errors (no info), bad responses, an OK
 *             response without `isShort` or without any usable duration, unknown.
 */
import type { FetchDurationsResult } from "./durationsClient";

export type ShortsUnavailable = "soon" | "later";

/** Longest Retry-After (seconds) that still reads "Try again in a few minutes". */
export const SOON_MAX_RETRY_AFTER_SEC = 900;

type LookupResult = Pick<FetchDurationsResult, "durations" | "isShort" | "status" | "error" | "retryAfterSec">;

const hasDuration = (d: LookupResult["durations"]) => Object.values(d).some((v) => typeof v === "number" && Number.isFinite(v) && v >= 0);

/** A request went out (or was tried): there's a status or an error. fetchDurations() with no IDs sends nothing. */
export const lookupAttempted = (r: LookupResult) => r.status !== undefined || r.error !== undefined;

/** Attempted and unusable for the split: HTTP/network failure, no usable duration, or no `isShort` map. */
export function lookupFailed(r: LookupResult): boolean {
  if (!lookupAttempted(r)) return false;
  const ok = r.status !== undefined && r.status >= 200 && r.status < 300;
  return !ok || !hasDuration(r.durations) || !r.isShort;
}

/** Which line to show for a failed lookup (see the rule above). */
export function shortsUnavailableReason(r: Pick<LookupResult, "status" | "retryAfterSec">): ShortsUnavailable {
  if (r.status === 502) return "soon";
  if (r.status === 429 && r.retryAfterSec !== undefined && r.retryAfterSec <= SOON_MAX_RETRY_AFTER_SEC) return "soon";
  return "later";
}

/** null when the lookup wasn't attempted or worked; otherwise "soon" / "later". */
export function shortsUnavailableFor(r: LookupResult | null | undefined): ShortsUnavailable | null {
  return r && lookupFailed(r) ? shortsUnavailableReason(r) : null;
}
