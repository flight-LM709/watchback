"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { availableYears, computeStats, resolveRange, type DateRange } from "@/lib/takeout/stats";
import type { TakeoutEvent } from "@/lib/takeout/types";
import { runtimeTimeZone } from "@/lib/takeout/tz";
import { formatPeriodLabel } from "./format";
import type { PeriodOption } from "./PeriodPill";

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

const COARSE_QUERY = "(pointer: coarse), (hover: none)";
function subscribePointer(cb: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(COARSE_QUERY);
  mq.addEventListener?.("change", cb);
  return () => mq.removeEventListener?.("change", cb);
}
export type PointerKind = "coarse" | "fine";
/** "coarse" on touch devices (coarse pointer or no hover), "fine" otherwise; null until hydrated. */
export function usePointerKind(): PointerKind | null {
  return useSyncExternalStore(
    subscribePointer,
    () => (typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(COARSE_QUERY).matches ? "coarse" : "fine"),
    () => null,
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
  const periodLabel = formatPeriodLabel(range, stats.range, timeZone);
  // Picker options, labelled with the same copy templates as the pill.
  const periodOptions = useMemo<PeriodOption[]>(() => {
    const last12: DateRange = { type: "last12Months" };
    const r = resolveRange(events, last12, timeZone);
    return [
      { range: last12, label: formatPeriodLabel(last12, { start: new Date(r.start), end: new Date(r.end) }, timeZone) },
      ...years.map((year) => {
        const yr: DateRange = { type: "calendarYear", year };
        return { range: yr, label: formatPeriodLabel(yr, stats.range, timeZone) };
      }),
      { range: { type: "allTime" }, label: formatPeriodLabel({ type: "allTime" }, stats.range, timeZone) },
    ];
  }, [events, years, timeZone, stats.range]);
  return { stats, range, setRange, years, timeZone, periodLabel, periodOptions };
}
