/**
 * Small, dependency-free timezone helpers built on Intl (available in browsers and workers).
 */

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

export function runtimeTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    getFormatter(tz);
    return true;
  } catch {
    return false;
  }
}

/** UTC offset of `timeZone` at instant `ms`, in minutes (e.g. +420 for Asia/Jakarta). */
export function tzOffsetMinutes(timeZone: string, ms: number): number {
  if (timeZone === "UTC" || timeZone === "Etc/UTC") return 0;
  const parts = getFormatter(timeZone).formatToParts(new Date(ms));
  let y = 0, mo = 0, d = 0, h = 0, mi = 0, s = 0;
  for (const p of parts) {
    switch (p.type) {
      case "year": y = +p.value; break;
      case "month": mo = +p.value; break;
      case "day": d = +p.value; break;
      case "hour": h = +p.value; break;
      case "minute": mi = +p.value; break;
      case "second": s = +p.value; break;
    }
  }
  const asUtc = Date.UTC(y, mo - 1, d, h === 24 ? 0 : h, mi, s);
  const truncated = ms - (((ms % 1000) + 1000) % 1000);
  return Math.round((asUtc - truncated) / 60000);
}

/** Convert a wall-clock time in `timeZone` to a UTC epoch ms. */
export function zonedWallTimeToUtc(
  timeZone: string,
  y: number, mo: number, d: number, h = 0, mi = 0, s = 0,
): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const off1 = tzOffsetMinutes(timeZone, guess);
  let t = guess - off1 * 60000;
  const off2 = tzOffsetMinutes(timeZone, t);
  if (off2 !== off1) t = guess - off2 * 60000;
  return t;
}

/**
 * Fast "local parts" lookup for many timestamps. Offsets are cached per UTC day
 * (falling back to 15-minute buckets on DST-change days), so 100k+ events cost
 * only ~2 Intl calls per distinct day.
 */
export class LocalClock {
  /** UTC day -> offset ms for the whole day, or null when a DST change happens that day. */
  private dayCache = new Map<number, number | null>();
  private fineCache = new Map<number, number>();
  constructor(readonly timeZone: string) {}

  offsetMs(ms: number): number {
    if (this.timeZone === "UTC" || this.timeZone === "Etc/UTC") return 0;
    const day = Math.floor(ms / 86400000);
    let off = this.dayCache.get(day);
    if (off === undefined) {
      const a = tzOffsetMinutes(this.timeZone, day * 86400000);
      const b = tzOffsetMinutes(this.timeZone, (day + 1) * 86400000 - 1000);
      off = a === b ? a * 60000 : null;
      this.dayCache.set(day, off);
    }
    if (off !== null) return off;
    // Transition day: resolve per 15-minute bucket (covers :30/:45 offsets).
    const bucket = Math.floor(ms / 900000);
    let fine = this.fineCache.get(bucket);
    if (fine === undefined) {
      fine = tzOffsetMinutes(this.timeZone, bucket * 900000) * 60000;
      this.fineCache.set(bucket, fine);
    }
    return fine;
  }

  /** A Date whose getUTC* methods return local wall-clock fields. */
  shifted(ms: number): Date {
    return new Date(ms + this.offsetMs(ms));
  }

  /** Days since epoch for the local calendar date. */
  dayNumber(ms: number): number {
    return Math.floor((ms + this.offsetMs(ms)) / 86400000);
  }
}

export function dayNumberToIso(day: number): string {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}
