"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { availableYears, computeStats, type DateRange } from "@/lib/takeout/stats";
import type { TakeoutEvent } from "@/lib/takeout/types";
import { runtimeTimeZone } from "@/lib/takeout/tz";

const noopSubscribe = () => () => {};

/** false during SSR/prerender + hydration, true after. Use to gate timezone-dependent UI. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const RM_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(cb: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(RM_QUERY);
  mq.addEventListener?.("change", cb);
  return () => mq.removeEventListener?.("change", cb);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => (typeof window !== "undefined" && !!window.matchMedia ? window.matchMedia(RM_QUERY).matches : false),
    () => false,
  );
}

/**
 * Holds the selected period and re-runs computeStats on the already-parsed events.
 * Changing the period never re-parses and never remounts the story.
 */
export function useStoryStats(events: TakeoutEvent[], opts: { timeZone?: string; initialRange?: DateRange } = {}) {
  const timeZone = opts.timeZone ?? runtimeTimeZone();
  const [range, setRange] = useState<DateRange>(opts.initialRange ?? { type: "last12Months" });
  const years = useMemo(() => availableYears(events, timeZone), [events, timeZone]);
  const stats = useMemo(() => computeStats(events, { range, timeZone }), [events, range, timeZone]);
  return { stats, range, setRange, years, timeZone };
}
