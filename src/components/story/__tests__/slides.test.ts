import { describe, expect, it } from "vitest";
import { computeStats } from "@/lib/takeout/stats";
import type { TakeoutEvent } from "@/lib/takeout/types";
import { ALL_SLIDES, planSlides } from "../slides";

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
      "total-videos", "watch-time", "top-creator", "top-creators", "favorite-video", "busiest-month", "prime-time", "streak", "share",
    ]);
    expect(planSlides(s, { only: ["prime-time", "top-songs", "total-videos"] })).toEqual(["prime-time", "total-videos"]);
  });

  it("is 12 slides when everything is present, with the peak-hour badge on the prime-time slide (no separate badge slide)", () => {
    expect(ALL_SLIDES).toHaveLength(12);
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
    const plan = planSlides(full, { watchTime: est });
    expect(plan).toEqual([...ALL_SLIDES]);
    expect(plan).toHaveLength(12);
    expect(full.peakHourBadge).not.toBeNull();
  });
});
