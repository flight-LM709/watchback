import { describe, expect, it } from "vitest";
import { computeStats } from "@/lib/takeout/stats";
import type { TakeoutEvent } from "@/lib/takeout/types";
import { planSlides } from "../slides";

const w = (iso: string, extra: Partial<TakeoutEvent> = {}): TakeoutEvent => ({
  kind: "watch", product: "youtube", title: "Video", videoId: "AAAAAAAAAAA", channelName: "Chan", channelUrl: "u1",
  timestamp: new Date(iso), isAd: false, ...extra,
});
const est = { seconds: 3600, isEstimate: true as const, coverage: 1, exactSeconds: 3600 };

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
      "total-videos", "watch-time", "top-creator", "top-creators", "favorite-video", "busiest-month", "peak-time", "peak-hour-badge", "streak", "share",
    ]);
    expect(planSlides(s, { only: ["peak-hour-badge", "top-songs", "total-videos"] })).toEqual(["peak-hour-badge", "total-videos"]);
  });
});
