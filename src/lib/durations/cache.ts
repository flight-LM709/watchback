import type { VideoMeta } from "./youtube";

/**
 * Tiny in-memory LRU with TTL. Holds only `videoId -> { seconds, isShort }`.
 * No user data, no request metadata, never written to disk.
 */
export class DurationCache {
  private map = new Map<string, { value: VideoMeta; expires: number }>();

  constructor(
    private maxEntries = 50_000,
    private ttlMs = 7 * 24 * 3600_000,
    private nullTtlMs = 24 * 3600_000,
    private now: () => number = Date.now,
  ) {}

  /** Returns undefined on miss, otherwise the cached value (whose fields may be null). */
  get(id: string): VideoMeta | undefined {
    const hit = this.map.get(id);
    if (!hit) return undefined;
    if (hit.expires <= this.now()) {
      this.map.delete(id);
      return undefined;
    }
    // refresh LRU position
    this.map.delete(id);
    this.map.set(id, hit);
    return hit.value;
  }

  set(id: string, value: VideoMeta): void {
    this.map.delete(id);
    this.map.set(id, {
      value,
      expires: this.now() + (value.seconds === null ? this.nullTtlMs : this.ttlMs),
    });
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  get size(): number {
    return this.map.size;
  }
}
