import type { DateRange } from "@/lib/takeout/stats";

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function monthYear(d: Date, timeZone: string): string {
  let f = fmtCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone });
    fmtCache.set(timeZone, f);
  }
  return f.format(d);
}

/**
 * '{Mon YYYY} – {Mon YYYY}' for rolling/custom ranges, '{year}' for a calendar year, 'All time'.
 * `end` is exclusive (as returned by computeStats().range).
 */
export function formatPeriodLabel(range: DateRange, resolved: { start: Date; end: Date }, timeZone: string): string {
  if (range.type === "allTime") return "All time";
  if (range.type === "calendarYear") return String(range.year);
  if (resolved.end.getTime() <= resolved.start.getTime()) return "No activity";
  const a = monthYear(resolved.start, timeZone);
  const b = monthYear(new Date(resolved.end.getTime() - 1), timeZone);
  return a === b ? a : `${a} – ${b}`;
}

export function rangeKey(r: DateRange): string {
  switch (r.type) {
    case "calendarYear":
      return `year:${r.year}`;
    case "custom":
      return `custom:${r.start.getTime()}-${r.end.getTime()}`;
    default:
      return r.type;
  }
}
