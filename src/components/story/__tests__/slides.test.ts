import { describe, expect, it } from "vitest";
import { computeStats } from "@/lib/takeout/stats";
import type { TakeoutEvent } from "@/lib/takeout/types";
import type { ShortsSplitEstimate } from "@/lib/takeout/shortsSplit";
import { ALL_SLIDES, planSlides } from "../slides";

const w = (iso: string, extra: Partial<TakeoutEvent> = {}): TakeoutEvent => ({
  kind: "watch", product: "youtube", title: "Video", videoId: "AAAAAAAAAAA", channelName: "Chan", channelUrl: "u1",
  timestamp: new Date(iso), isAd: false, ...extra,
});
const est = { seconds: 3600, isEstimate: true as const, coverage: 1, exactSeconds: 3600 };
const side = (count: number) => ({ count, seconds: count * 60, pct: 50, topCreators: [], showEmptyState: true });
const split = (shorts: number): ShortsSplitEstimate => ({
  isEstimate: true, shorts: side(shorts), long: side(10), noShorts: shorts === 0,
  slides: { shortsVsLong: true, creatorsByFormat: shorts > 0 },
  playsWinner: "long", playsTie: false, timeWinner: "long", timeTie: false, sub: shorts ? "longBoth" : null, sameTopCreator: null, unknownPlays: 0, coverage: 1,
});

describe("planSlides", () => {
  const base = [w("2024-03-01T05:00:00Z"), w("2024-03-02T05:00:00Z"), w("2024-03-03T05:00:00Z", { channelName: "Other", channelUrl: "u2", videoId: "BBBBBBBBBBB" })];

  it("drops watch-time when estimateWatchTime returned null", () => {
    const s = computeStats(base, { timeZone: "UTC" });
    expect(planSlides(s, { watchTime: est })).toContain("watch-time");
    expect(planSlides(s, { watchTime: null })).not.toContain("watch-time");
    expect(planSlides(s)).not.toContain("watch-time");
  });

  it("drops music slides when there's no YouTube Music data", () => {
    const s = computeStats(base, { timeZone: "UTC" });
    expect(planSlides(s)).not.toContain("music-total");
    expect(planSlides(s)).not.toContain("top-songs");
    const withMusic = computeStats([...base, w("2024-03-03T06:00:00Z", { product: "music", channelName: "Queen - Topic", videoId: "MMMMMMMMMMM" })], { timeZone: "UTC" });
    expect(planSlides(withMusic)).toEqual(expect.arrayContaining(["music-total", "top-songs"]));
  });

  it("keeps the canonical order and supports a subset", () => {
    const s = computeStats(base, { timeZone: "UTC" });
    expect(planSlides(s, { watchTime: est })).toEqual([
      "total-videos", "watch-time", "top-creator", "top-creators", "favorite-video", "busiest-month", "prime-time", "streak", "share",
    ]);
    expect(planSlides(s, { only: ["prime-time", "top-songs", "total-videos"] })).toEqual(["prime-time", "total-videos"]);
  });

  it("Shorts slides: after watch time, before #1 creator; null split drops both; zero Shorts keeps slide 3 only", () => {
    const s = computeStats(base, { timeZone: "UTC" });
    expect(planSlides(s, { watchTime: est, shortsSplit: split(5) }).slice(0, 5)).toEqual(["total-videos", "watch-time", "shorts-vs-long", "creators-by-format", "top-creator"]);
    expect(planSlides(s, { watchTime: est, shortsSplit: null })).not.toEqual(expect.arrayContaining(["shorts-vs-long"]));
    expect(planSlides(s, { watchTime: est })).not.toContain("creators-by-format");
    const zero = planSlides(s, { watchTime: est, shortsSplit: split(0) });
    expect(zero).toContain("shorts-vs-long");
    expect(zero).not.toContain("creators-by-format");
  });

  it("is 14 slides when everything is present, with the peak-hour badge on the prime-time slide (no separate badge slide)", () => {
    expect(ALL_SLIDES).toHaveLength(15); // incl. shorts-unavailable, which only stands in for 3 + 4
    expect(ALL_SLIDES).not.toContain("peak-hour-badge" as never);
    const music = (iso: string, id: string) => w(iso, { product: "music", channelName: "Queen - Topic", videoId: id, title: "Song" });
    const full = computeStats(
      [
        ...base,
        w("2024-03-04T05:00:00Z"),
        { kind: "search", product: "youtube", title: "lofi", timestamp: new Date("2024-03-04T06:00:00Z"), isAd: false },
        music("2024-03-04T07:00:00Z", "MMMMMMMMMMM"),
      ],
      { timeZone: "UTC" },
    );
    const plan = planSlides(full, { watchTime: est, shortsSplit: split(3), shortsUnavailable: "later" });
    expect(plan).toEqual(ALL_SLIDES.filter((k) => k !== "shorts-unavailable"));
    expect(plan).toHaveLength(14);
    expect(full.peakHourBadge).not.toBeNull();
  });

  it("lookup failed: skips 16/17 and the watch-time slide, plans one shorts-unavailable card where 16 would be", () => {
    const s = computeStats(base, { timeZone: "UTC" });
    const failed = planSlides(s, { watchTime: null, shortsSplit: null, shortsUnavailable: "soon" });
    expect(failed.slice(0, 3)).toEqual(["total-videos", "shorts-unavailable", "top-creator"]);
    expect(failed).not.toContain("shorts-vs-long");
    expect(failed).not.toContain("creators-by-format");
    expect(failed).not.toContain("watch-time");
    expect(failed.filter((k) => k === "shorts-unavailable")).toHaveLength(1);
    expect(planSlides(s, { watchTime: est, shortsSplit: null, shortsUnavailable: "later" }).slice(0, 3)).toEqual(["total-videos", "watch-time", "shorts-unavailable"]);
    // no failure → no card (as before); a split wins over a stale failure flag
    expect(planSlides(s, { watchTime: null, shortsSplit: null })).not.toContain("shorts-unavailable");
    expect(planSlides(s, { watchTime: est, shortsSplit: split(2), shortsUnavailable: "later" })).not.toContain("shorts-unavailable");
    expect(planSlides(s, { watchTime: est, shortsSplit: split(0), shortsUnavailable: "later" })).not.toContain("shorts-unavailable");
  });
});
