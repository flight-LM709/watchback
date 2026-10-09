import { createHash, randomBytes } from "node:crypto";

/**
 * Per-client fixed-window rate limiter. Client keys are salted hashes with a
 * per-process random salt, so raw IPs are never held, and entries expire with the window.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; windowStart: number }>();
  private salt = randomBytes(16);

  constructor(
    private limit = 10,
    private windowMs = 10 * 60_000,
    private now: () => number = Date.now,
  ) {}

  private key(client: string): string {
    return createHash("sha256").update(this.salt).update(client).digest("base64url").slice(0, 16);
  }

  /** Returns 0 if allowed, otherwise seconds until the client may retry. */
  check(client: string): number {
    const t = this.now();
    // A limit of 0 (or less) blocks every request.
    if (this.limit <= 0) return Math.ceil(this.windowMs / 1000);
    const k = this.key(client);
    const entry = this.hits.get(k);
    if (!entry || t - entry.windowStart >= this.windowMs) {
      this.hits.set(k, { count: 1, windowStart: t });
      this.sweep(t);
      return 0;
    }
    if (entry.count >= this.limit) {
      return Math.ceil((entry.windowStart + this.windowMs - t) / 1000);
    }
    entry.count++;
    return 0;
  }

  private sweep(t: number) {
    if (this.hits.size < 10_000) return;
    for (const [k, v] of this.hits) if (t - v.windowStart >= this.windowMs) this.hits.delete(k);
  }
}

/** Milliseconds timestamp of the next midnight in America/Los_Angeles (when YouTube quota resets). */
export function nextPacificMidnight(nowMs: number): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(nowMs)).map((p) => [p.type, p.value]));
  const h = Number(parts.hour) % 24;
  const elapsed = (h * 3600 + Number(parts.minute) * 60 + Number(parts.second)) * 1000;
  return nowMs - (nowMs % 1000) - elapsed + 24 * 3600_000;
}

/**
 * Daily YouTube quota budget (1 unit per videos.list call). Per instance, so it is a
 * soft guard; YouTube's own quotaExceeded error trips `exhaust()` as the hard stop.
 */
export class QuotaBudget {
  private used = 0;
  private resetAt: number;
  private exhaustedUntil = 0;

  constructor(
    private dailyUnits = 9_000,
    private now: () => number = Date.now,
  ) {
    this.resetAt = nextPacificMidnight(now());
  }

  private roll() {
    const t = this.now();
    if (t >= this.resetAt) {
      this.used = 0;
      this.resetAt = nextPacificMidnight(t);
    }
  }

  /** Reserve units; false if the budget can't cover them. */
  tryReserve(units: number): boolean {
    this.roll();
    if (this.now() < this.exhaustedUntil) return false;
    if (this.used + units > this.dailyUnits) return false;
    this.used += units;
    return true;
  }

  /**
   * Mark the quota as gone. Re-probe after a short pause instead of blocking until Pacific
   * midnight, so one bad response can't switch the feature off for the rest of the day.
   */
  exhaust(probeAfterMs = 15 * 60_000) {
    this.roll();
    this.exhaustedUntil = Math.min(this.resetAt, this.now() + probeAfterMs);
  }

  retryAfterSeconds(): number {
    const t = this.now();
    const until = t < this.exhaustedUntil ? this.exhaustedUntil : this.resetAt;
    return Math.max(1, Math.ceil((until - t) / 1000));
  }

  get unitsUsed() {
    return this.used;
  }
}
