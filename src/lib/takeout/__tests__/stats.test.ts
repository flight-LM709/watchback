import { describe, expect, it } from "vitest";
import { parseJsonHistory } from "../parseJson";
import { availableYears, computeStats } from "../stats";
import type { TakeoutEvent } from "../types";
import { fixture } from "./helpers";

const JKT = "Asia/Jakarta";
const watch = (iso: string, extra: Partial<TakeoutEvent> = {}): TakeoutEvent => ({
  kind: "watch", product: "youtube", title: "v", videoId: "VVVVVVVVVVV", timestamp: new Date(iso), isAd: false, ...extra,
});

describe("computeStats on the English fixture (Asia/Jakarta)", () => {
  const { events } = parseJsonHistory(fixture("watch-history.en.json"), { role: "watch" });
  const searches = parseJsonHistory(fixture("search-history.en.json"), { role: "search" }).events;
  const s = computeStats([...events, ...searches], { timeZone: JKT });

  it("totals exclude ads", () => {
    expect(s.totalVideos).toBe(8);
    expect(s.totalSongs).toBe(3);
    expect(s.totalPlays).toBe(11);
    expect(s.adsExcluded).toBe(1);
    expect(s.unavailableVideos).toBe(2);
    expect(s.shortsWatched).toBe(1);
  });

  it("default range = 12 local months ending at the latest watch", () => {
    expect(s.range.type).toBe("last12Months");
    expect(s.range.start.toISOString()).toBe("2023-03-31T17:00:00.000Z"); // Apr 1 2023 00:00 WIB
    expect(s.monthly).toHaveLength(12);
    expect(s.monthly[0].key).toBe("2023-04");
    expect(s.monthly[11]).toMatchObject({ key: "2024-03", count: 10 });
    expect(s.busiestMonth).toMatchObject({ key: "2024-03", count: 10 });
    expect(s.monthOfYear[0]).toBe(1);
    expect(s.range.days).toBe(345); // Apr 1 2023 .. Mar 10 2024
    expect(s.avgVideosPerDay).toBeCloseTo(8 / 345);
  });

  it("top lists", () => {
    expect(s.topCreators[0]).toEqual({ name: "Cat Channel", url: "https://www.youtube.com/channel/UCcat", count: 3 });
    expect(s.topCreators.map((c) => c.name)).toEqual(["Cat Channel", "Chef Ana", "Night Owl TV"]);
    expect(s.favoriteVideo).toMatchObject({ videoId: "AAAAAAAAAA1", title: "Cat compilation 2024", count: 2 });
    expect(s.topArtists).toEqual([{ name: "Queen", count: 3 }]);
    expect(s.topSongs.map((x) => [x.title, x.count])).toEqual([["Bohemian Rhapsody", 2], ["Don't Stop Me Now", 1]]);
  });

  it("top searches are case-insensitive", () => {
    expect(s.totalSearches).toBe(4);
    expect(s.topSearches[0]).toEqual({ query: "lofi beats", count: 2 });
  });

  it("streak uses local dates (Mar 7 only had an ad)", () => {
    expect(s.longestStreak).toEqual({ days: 6, start: "2024-03-01", end: "2024-03-06" });
  });

  it("unique video ids for the duration lookup (ads excluded, most played first)", () => {
    expect(s.uniqueVideoIds).toEqual([
      "AAAAAAAAAA1", "MUSIC000001", "BBBBBBBBBB2", "CCCCCCCCCC3", "DDDDDDDDDD4", "MUSIC000002", "PRIVATE0001", "SHORTS00001",
    ]);
    expect(s.playCountsById.AAAAAAAAAA1).toBe(2);
    expect(s.uniqueVideoIds).not.toContain("ADADADADAD1");
  });
});

describe("local timezone bucketing", () => {
  it("defaults to the runtime zone", () => {
    const s = computeStats([watch("2024-01-05T15:30:00Z")]);
    expect(s.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it("a 22:30 WIB watch (15:30Z) is a night-owl watch at hour 22 on Friday in Jakarta", () => {
    const ev = [watch("2024-01-05T15:30:00Z"), watch("2024-01-12T15:30:00Z"), watch("2024-01-13T07:00:00Z")];
    const jkt = computeStats(ev, { timeZone: JKT });
    expect(jkt.heatmap[5][22]).toBe(2); // Friday 22:00
    expect(jkt.hourOfDay[22]).toBe(2);
    expect(jkt.peak).toEqual({ day: 5, hour: 22, count: 2 });
    expect(jkt.nightOwl.count).toBe(2);
    expect(jkt.nightOwl.isNightOwl).toBe(true);

    const utc = computeStats(ev, { timeZone: "UTC" });
    expect(utc.heatmap[5][15]).toBe(2);
    expect(utc.nightOwl.count).toBe(0);
    expect(utc.nightOwl.isNightOwl).toBe(false);
  });

  it("streaks use the local calendar date", () => {
    const ev = [
      watch("2024-01-04T10:00:00Z"), // Jan 4 17:00 WIB
      watch("2024-01-05T15:30:00Z"), // Jan 5 22:30 WIB
      watch("2024-01-06T17:30:00Z"), // Jan 7 00:30 WIB  (UTC: Jan 6)
    ];
    expect(computeStats(ev, { timeZone: JKT }).longestStreak).toEqual({ days: 2, start: "2024-01-04", end: "2024-01-05" });
    expect(computeStats(ev, { timeZone: "UTC" }).longestStreak).toEqual({ days: 3, start: "2024-01-04", end: "2024-01-06" });

    const ev2 = [
      watch("2024-01-09T20:00:00Z"), // Jan 10 03:00 WIB (UTC: Jan 9)
      watch("2024-01-11T02:00:00Z"), // Jan 11 09:00 WIB
    ];
    expect(computeStats(ev2, { timeZone: JKT }).longestStreak).toEqual({ days: 2, start: "2024-01-10", end: "2024-01-11" });
    expect(computeStats(ev2, { timeZone: "UTC" }).longestStreak!.days).toBe(1);
  });

  it("month buckets and calendar-year boundaries are local", () => {
    const ev = [
      watch("2023-12-31T17:30:00Z"), // Jan 1 2024 00:30 WIB
      watch("2024-01-31T18:00:00Z"), // Feb 1 2024 01:00 WIB
    ];
    const jkt = computeStats(ev, { timeZone: JKT, range: { type: "calendarYear", year: 2024 } });
    expect(jkt.totalVideos).toBe(2);
    expect(jkt.monthly).toHaveLength(12);
    expect(jkt.monthly[0].count).toBe(1);
    expect(jkt.monthly[1].count).toBe(1);
    expect(jkt.range.start.toISOString()).toBe("2023-12-31T17:00:00.000Z");

    const utc = computeStats(ev, { timeZone: "UTC", range: { type: "calendarYear", year: 2024 } });
    expect(utc.totalVideos).toBe(1);
    expect(utc.monthly[0].count).toBe(1);
    expect(utc.monthly[1].count).toBe(0);

    expect(availableYears(ev, JKT)).toEqual([2024]);
    expect(availableYears(ev, "UTC")).toEqual([2024, 2023]);
  });

  it("works across DST (America/New_York)", () => {
    const ev = [watch("2024-03-10T06:30:00Z"), watch("2024-03-10T07:30:00Z")]; // 01:30 EST, 03:30 EDT
    const s = computeStats(ev, { timeZone: "America/New_York", range: { type: "allTime" } });
    expect(s.hourOfDay[1]).toBe(1);
    expect(s.hourOfDay[3]).toBe(1);
  });
});

describe("ranges", () => {
  const ev = [watch("2022-06-01T00:00:00Z"), watch("2023-06-01T00:00:00Z"), watch("2024-06-01T00:00:00Z")];
  it("allTime", () => {
    const s = computeStats(ev, { timeZone: "UTC", range: { type: "allTime" } });
    expect(s.totalVideos).toBe(3);
    expect(s.monthly).toHaveLength(25);
  });
  it("last12Months ignores older history", () => {
    expect(computeStats(ev, { timeZone: "UTC" }).totalVideos).toBe(1);
  });
  it("custom", () => {
    const s = computeStats(ev, { timeZone: "UTC", range: { type: "custom", start: new Date("2023-01-01Z"), end: new Date("2024-01-01Z") } });
    expect(s.totalVideos).toBe(1);
  });
  it("empty input", () => {
    const s = computeStats([], { timeZone: "UTC" });
    expect(s.totalPlays).toBe(0);
    expect(s.longestStreak).toBeNull();
    expect(s.busiestMonth).toBeNull();
    expect(s.favoriteVideo).toBeNull();
  });
});
