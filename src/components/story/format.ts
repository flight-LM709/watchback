import { en } from "@/copy/en";
import { fill, type PeriodCopy } from "@/copy/format";
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
 * Period label from Copywriter's en.period templates:
 * '{startMonth} – {endMonth}' for rolling/custom ranges, '{year}' for a calendar year, 'All time'.
 * `end` is exclusive (as returned by computeStats().range).
 */
export function formatPeriodLabel(
  range: DateRange,
  resolved: { start: Date; end: Date },
  timeZone: string,
  copy: PeriodCopy = en.period,
): string {
  if (range.type === "allTime") return copy.allTime;
  if (range.type === "calendarYear") return fill(copy.year, { year: range.year });
  const a = monthYear(resolved.start, timeZone);
  const b = resolved.end.getTime() > resolved.start.getTime() ? monthYear(new Date(resolved.end.getTime() - 1), timeZone) : a;
  return a === b ? a : fill(copy.last12, { startMonth: a, endMonth: b });
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
