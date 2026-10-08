/**
 * Helpers for using Copywriter's strings (src/copy/en.ts) without hardcoding text in components.
 */
import { Fragment, createElement, type ReactNode } from "react";
import type { DateRange, PeakHourBadge } from "@/lib/takeout/stats";
import { en } from "./en";

export type Copy = typeof en;
/** Same shape as en.player, but any strings (for other locales / overrides). */
export type PlayerCopy = { [K in keyof Copy["player"]]: string };
export type PeriodCopy = { [K in keyof Copy["period"]]: string };

const PLACEHOLDER = /\{(\w+)\}/g;

/** Fill "{name}" placeholders. Unknown placeholders are left as-is so they're easy to spot. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(PLACEHOLDER, (all, k: string) => (k in vars ? String(vars[k]) : all));
}

/** Like fill(), but values can be React nodes (e.g. a clamped title inside a sentence). */
export function fillNodes(template: string, vars: Record<string, ReactNode>): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of template.matchAll(PLACEHOLDER)) {
    if (m.index! > last) out.push(template.slice(last, m.index));
    out.push(m[1] in vars ? createElement(Fragment, { key: `v${i++}` }, vars[m[1]]) : m[0]);
    last = m.index! + m[0].length;
  }
  if (last < template.length) out.push(template.slice(last));
  return out;
}

export type PeriodVariant = "last12" | "year" | "allTime";

/** Which period-dependent copy variant to use. Custom ranges use the rolling ("last12") wording. */
export function periodVariant(range: DateRange): PeriodVariant {
  return range.type === "calendarYear" ? "year" : range.type === "allTime" ? "allTime" : "last12";
}

const BADGE_KEYS: Record<PeakHourBadge, keyof Copy["slides"]["primeTime"]["badges"]> = {
  "early-bird": "earlyBird",
  "coffee-break": "coffeeBreak",
  "lunch-break": "lunchBreak",
  "afternoon-drifter": "afternoonDrifter",
  "evening-regular": "eveningRegular",
  "night-owl": "nightOwl",
};

export function badgeName(badge: PeakHourBadge, copy: Copy = en): string {
  return copy.slides.primeTime.badges[BADGE_KEYS[badge]];
}

/** Error code from the parser → user-facing message. */
export function errorMessage(code: string, copy: Copy = en): string {
  return code === "NOT_TAKEOUT_ZIP" ? copy.errors.notTakeout : copy.errors.noHistory;
}
