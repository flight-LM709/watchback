/**
 * Progress helpers shared by the worker (throttling) and the crunching screen (bar fraction, phase label).
 */
import type { ProgressInfo, ProgressPhase } from "./types";

/** Max one "in-between" progress post per this many ms (phase changes, 100% and done always go through). */
export const PROGRESS_THROTTLE_MS = 50;

/**
 * Wraps `post` so steady streams (inflate percent, parse counts) are throttled, while phase changes,
 * the end of a phase (processed ≥ total) and "done" are never dropped.
 */
export function throttleProgress(post: (p: ProgressInfo) => void, ms = PROGRESS_THROTTLE_MS, now: () => number = Date.now) {
  let last = -Infinity;
  let lastPhase: ProgressPhase | null = null;
  return (p: ProgressInfo) => {
    const t = now();
    const boundary = p.phase !== lastPhase || p.phase === "done" || (p.total > 0 && p.processed >= p.total);
    if (!boundary && t - last < ms) return;
    last = t;
    lastPhase = p.phase;
    post(p);
  };
}

/** Rough share of the bar per phase (measured on a 100k-entry export: inflate ≈ JSON.parse + loop). */
const BAR: Record<ProgressPhase, [number, number]> = {
  unzipping: [0, 0.05],
  locating: [0.05, 0.05],
  reading: [0.05, 0.55],
  parsing: [0.55, 1],
  done: [1, 1],
};

/** Overall 0–1 bar position for one progress event (callers keep the max so later files never move it back). */
export function progressFraction(p: ProgressInfo): number {
  const [from, to] = BAR[p.phase];
  const inner = p.total > 0 ? Math.min(1, Math.max(0, p.processed / p.total)) : 0;
  return from + (to - from) * inner;
}

/** True while nothing has been counted yet because the zip is still being opened/inflated. */
export function isPreparing(phase: ProgressPhase, count: number): boolean {
  return count === 0 && (phase === "unzipping" || phase === "locating" || phase === "reading");
}
