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

/** "between 5 and 9 AM" etc. for a badge. */
export function badgeWindow(badge: PeakHourBadge, copy: Copy = en): string {
  return copy.slides.primeTime.badgeWindows[BADGE_KEYS[badge]];
}

/** Second line of the badge sticker: "19% of plays between 5 and 9 AM". */
export function badgeDetail(b: { badge: PeakHourBadge; pct: number }, copy: Copy = en): string {
  return fill(copy.slides.primeTime.badgeDetail, { pct: b.pct, window: badgeWindow(b.badge, copy) });
}

/** One-line badge (screen readers): "Early bird: 19% of plays between 5 and 9 AM". */
export function badgeShareLine(b: { badge: PeakHourBadge; pct: number }, copy: Copy = en): string {
  return fill(copy.slides.primeTime.badgeShare, { badge: badgeName(b.badge, copy), pct: b.pct, window: badgeWindow(b.badge, copy) });
}

/** "Prime time: Sundays at 6 PM." `day` is a Date.getDay() index; `hour` is already formatted. */
export function primeTimeHeadline(day: number, hour: string, copy: Copy = en): string {
  return fill(copy.slides.primeTime.headline, { days: copy.slides.primeTime.daysPlural[day] ?? "", hour });
}

/** Peak tile value: "Sun 5 AM". */
export function peakValue(day: number, hour: string, copy: Copy = en): string {
  return fill(copy.slides.primeTime.peakValue, { day: copy.slides.primeTime.daysShort[day] ?? "", hour });
}

/** Share-card footer URL from location.host, without a leading "www.". Empty host → empty string. */
export function siteLabel(host: string, copy: Copy = en): string {
  const h = host.trim().replace(/^www\./i, "");
  return h ? fill(copy.shareCard.site, { host: h }) : "";
}
