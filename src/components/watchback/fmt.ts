/** Locale formatting for slide data (numbers, dates, hours). Words come from en.ts; these are data. */
import { fill } from "@/copy/format";
import { artistFromChannel } from "@/lib/takeout/normalize";

export const num = (n: number) => Math.round(n).toLocaleString("en-US");
export const perDay = (n: number) => (n >= 10 ? num(n) : n.toFixed(1));

const utc = (y: number, m: number, d = 15, h = 12) => new Date(Date.UTC(y, m - 1, d, h));
const f = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts });
const LONG_MONTH = f({ month: "long" });
const SHORT_MONTH_YEAR = f({ month: "short", year: "numeric" });
const MONTH_YEAR = f({ month: "long", year: "numeric" });
const NARROW_MONTH = f({ month: "narrow" });
const WEEKDAY_LONG = f({ weekday: "long" });
const WEEKDAY_SHORT = f({ weekday: "short" });
const WEEKDAY_NARROW = f({ weekday: "narrow" });
const HOUR = f({ hour: "numeric", hour12: true });
const MONTH_DAY = f({ month: "short", day: "numeric" });

export const monthName = (month: number) => LONG_MONTH.format(utc(2000, month));
export const monthInitial = (month: number) => NARROW_MONTH.format(utc(2000, month));
export const monthShortYear = (year: number, month: number) => SHORT_MONTH_YEAR.format(utc(year, month));
export const monthLongYear = (year: number, month: number) => MONTH_YEAR.format(utc(year, month));
/** dow: 0 = Sunday (stats convention). 2024-01-07 was a Sunday. */
export const dayName = (dow: number) => WEEKDAY_LONG.format(utc(2024, 1, 7 + dow));
export const dayShort = (dow: number) => WEEKDAY_SHORT.format(utc(2024, 1, 7 + dow));
export const dayNarrow = (dow: number) => WEEKDAY_NARROW.format(utc(2024, 1, 7 + dow));
/**
 * "10 PM" with a U+00A0 no-break space before AM/PM. ICU (Chrome, newer Node) emits U+202F there,
 * which Fraunces/Space Mono don't have and which reads as a cramped "6PM" at hero size.
 */
export const hourLabel = (h: number) => HOUR.format(new Date(Date.UTC(2024, 0, 1, h))).replace(/[\s\u202f\u2009\u200a]+(?=[AP]M$)/u, "\u00a0");
/** "2025-04-13" -> "Apr 13" (SPEC §5: dates as "Mar 3"). */
export const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return MONTH_DAY.format(utc(y, m, d));
};

/** Short zone label for the heatmap header, e.g. "GMT+7" for Asia/Jakarta, "PST" for Los Angeles. */
export function tzLabel(timeZone: string, at = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(at).find((p) => p.type === "timeZoneName");
    return part?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

/**
 * Split a copy template around one placeholder so the value can be laid out on its own
 * (e.g. the hero number). Other placeholders in each half are filled from vars.
 */
export function splitAround(template: string, key: string, vars: Record<string, string | number> = {}): [string, string] {
  const token = `{${key}}`;
  const i = template.indexOf(token);
  if (i < 0) return [fill(template, vars), ""];
  return [fill(template.slice(0, i), vars), fill(template.slice(i + token.length), vars)];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/**
 * Song title for display: drop a leading "{artist} - ", "{artist} – " or "{artist} — " (case-insensitive,
 * spaces required around the dash). The artist is compared after normalize.ts strips " - Topic", so a raw
 * channel "NOAH - Topic" still matches "NOAH - Lagu 8". If nothing would remain, the title is kept as is.
 */
export function songDisplayTitle(title: string, artist?: string | null): string {
  const a = artistFromChannel(artist ?? undefined)?.trim();
  if (!a) return title;
  const m = title.trim().match(new RegExp(`^${escapeRe(a)}\\s+[-\u2013\u2014]\\s+`, "iu"));
  if (!m) return title;
  const rest = title.trim().slice(m[0].length).trim();
  return rest || title;
}
