import { describe, expect, it } from "vitest";
import { classifyShortsPlay, estimateShortsSplit, shortsSlides, shortsVerdict, splitTimeDisplay } from "../shortsSplit";
import { computeStats } from "../stats";
import type { TakeoutEvent } from "../types";
import { buildDurationSample, mulberry32, type DurationSample } from "../watchTime";

const id = (i: number | string) => String(i).padEnd(11, "_").slice(0, 11);
let clock = Date.UTC(2024, 0, 1);
function plays(n: number, vid: string, extra: Partial<TakeoutEvent> = {}): TakeoutEvent[] {
  return Array.from({ length: n }, () => ({
    kind: "watch" as const, product: "youtube" as const, title: "t", videoId: vid,
    channelName: "Chan", channelUrl: "https://www.youtube.com/channel/UCchan",
    timestamp: new Date((clock += 60_000)), isAd: false, ...extra,
  }));
}
const by = (name: string) => ({ channelName: name, channelUrl: `https://www.youtube.com/channel/UC${name.replace(/\W/g, "")}` });
const stats = (events: TakeoutEvent[]) => computeStats(events, { timeZone: "UTC", range: { type: "allTime" } });
/** Everything looked up (history under the cap). */
const all = (s: ReturnType<typeof stats>) => buildDurationSample(s, { cap: 2000 });

describe("estimateShortsSplit", () => {
  it("/shorts/ URL plays are Shorts even when the API says long-form", () => {
    const s = stats([...plays(2, id("A"), { isShort: true }), ...plays(3, id("A")), ...plays(5, id("B"))]);
    const r = estimateShortsSplit(s, { [id("A")]: false, [id("B")]: false }, { [id("A")]: 600, [id("B")]: 600 }, all(s))!;
    expect(r.shorts.count).toBe(2);
    expect(r.long.count).toBe(8);
    expect(r.shorts.pct).toBe(20);
    expect(r.long.pct).toBe(80);
  });

  it("isShort null and IDs not looked up are left out (never counted as long-form)", () => {
    const s = stats([...plays(4, id("S")), ...plays(6, id("L")), ...plays(5, id("P")), ...plays(3, id("X")), ...plays(2, undefined as never, { videoId: undefined, unavailable: true })]);
    const r = estimateShortsSplit(
      s,
      { [id("S")]: true, [id("L")]: false, [id("P")]: null }, // X missing: not looked up
      { [id("S")]: 30, [id("L")]: 600, [id("P")]: null },
      all(s),
    )!;
    expect(r.shorts.count).toBe(4);
    expect(r.long.count).toBe(6);
    expect(r.shorts.pct).toBe(40);
    expect(r.unknownPlays).toBe(5 + 3 + 2);
    expect(r.coverage).toBeCloseTo(10 / 20);
  });

  it("old API (no isShort map), an empty map, or all-null → null (slides drop)", () => {
    const s = stats([...plays(3, id("A"), { isShort: true }), ...plays(3, id("B"))]);
    const d = { [id("A")]: 30, [id("B")]: 600 };
    expect(estimateShortsSplit(s, undefined, d, all(s))).toBeNull();
    expect(estimateShortsSplit(s, {}, d, all(s))).toBeNull();
    expect(estimateShortsSplit(s, { [id("A")]: null, [id("B")]: null }, d, all(s))).toBeNull();
  });

  it("scales the sampled group like watch time: restPlays / looked-up sampled plays; sampled nulls stay unknown", () => {
    const s = stats([
      ...plays(10, id("T")), // top, long-form, exact
      ...plays(2, id("S1")), // sampled, Short
      ...plays(2, id("S2")), // sampled, null → unknown
      ...plays(2, id("S3")), // sampled but missing from the response → not in the denominator
      ...plays(2, id("R1")), // not sampled
      ...plays(2, id("R2")), // not sampled
      ...plays(1, id("R3"), { isShort: true }), // not sampled, /shorts/ URL → exact Short
    ]);
    const sample: DurationSample = {
      ids: [id("T"), id("S1"), id("S2"), id("S3")], topIds: [id("T")], sampleIds: [id("S1"), id("S2"), id("S3")],
      scale: 1, totalPlays: 21, topPlays: 10, restPlays: 11, sampledPlays: 6,
    };
    const r = estimateShortsSplit(s, { [id("T")]: false, [id("S1")]: true, [id("S2")]: null }, { [id("T")]: 1200, [id("S1")]: 45, [id("S2")]: null }, sample)!;
    // rest non-/shorts/ plays = 2+2+2+2+2 = 10; looked up in the sample = S1 + S2 = 4 → weight 2.5
    expect(r.shorts.count).toBe(Math.round(2 * 2.5 + 1)); // 6
    expect(r.long.count).toBe(10);
    expect(r.unknownPlays).toBe(21 - 6 - 10);
    // Shorts time: S1 known (5 weighted plays × 45s); the R3 /shorts/ play has no duration → Shorts average
    expect(r.shorts.seconds).toBe(6 * 45);
    expect(r.long.seconds).toBe(10 * 1200);
  });

  it("scaled estimate tracks the truth on a 6,000-video history (≈25% Shorts)", () => {
    const rand = mulberry32(7);
    const events: TakeoutEvent[] = [];
    const isShort: Record<string, boolean> = {};
    const durations: Record<string, number> = {};
    let trueShorts = 0, trueLong = 0;
    for (let i = 0; i < 6000; i++) {
      const v = ("v" + i.toString(36)).padEnd(11, "_");
      const short = i % 4 === 0;
      const n = 1 + Math.floor(rand() * rand() * 12);
      events.push(...plays(n, v, by(`c${i % 50}`)));
      isShort[v] = short;
      durations[v] = short ? 40 : 700;
      if (short) trueShorts += n; else trueLong += n;
    }
    const s = stats(events);
    for (const seed of [1, 2, 3]) {
      const sample = buildDurationSample(s, { cap: 2000, seed });
      const looked = Object.fromEntries(sample.ids.map((v) => [v, isShort[v]]));
      const r = estimateShortsSplit(s, looked, durations, sample)!;
      expect(Math.abs(r.shorts.count - trueShorts) / trueShorts).toBeLessThan(0.08);
      expect(Math.abs(r.long.count - trueLong) / trueLong).toBeLessThan(0.04);
      expect(r.shorts.count + r.long.count).toBeCloseTo(s.totalVideos, -1);
      expect(r.shorts.seconds! / r.shorts.count).toBeCloseTo(40, 0);
    }
  });

  it("top creators per side, with counts, and a creator topping both lists", () => {
    const s = stats([
      ...plays(5, id("a1"), by("Alpha")), // Short
      ...plays(2, id("b1"), by("Beta")), // Short
      ...plays(9, id("a2"), by("Alpha")), // long
      ...plays(4, id("g1"), by("Gamma")), // long
      ...plays(3, id("p1"), { channelName: undefined, channelUrl: undefined }), // long, no channel
    ]);
    const isShort = { [id("a1")]: true, [id("b1")]: true, [id("a2")]: false, [id("g1")]: false, [id("p1")]: false };
    // long-form durations only: the Shorts side has no known length
    const r = estimateShortsSplit(s, isShort, { [id("a2")]: 600, [id("g1")]: 300, [id("p1")]: 900 }, all(s), { topN: 2 })!;
    expect(r.shorts.topCreators).toEqual([
      { name: "Alpha", url: "https://www.youtube.com/channel/UCAlpha", count: 5 },
      { name: "Beta", url: "https://www.youtube.com/channel/UCBeta", count: 2 },
    ]);
    expect(r.long.topCreators.map((c) => [c.name, c.count])).toEqual([["Alpha", 9], ["Gamma", 4]]);
    expect(r.long.count).toBe(16);
    expect(r.sameTopCreator).toBe("Alpha");
    expect(r.shorts.showEmptyState).toBe(false);
    expect(r.slides).toEqual({ shortsVsLong: true, creatorsByFormat: true });
    // no Shorts duration known → Shorts time unknown → plays-only sub (7 vs 16 plays → long-form)
    expect(r.shorts.seconds).toBeNull();
    expect(r.timeWinner).toBeNull();
    expect(r.sub).toBe("longPlaysOnly");
  });

  it("YouTube Music plays are excluded, even for an ID the API calls a Short", () => {
    const s = stats([...plays(7, id("M"), { product: "music", channelName: "Band - Topic", channelUrl: undefined }), ...plays(2, id("M")), ...plays(3, id("L"))]);
    const r = estimateShortsSplit(s, { [id("M")]: true, [id("L")]: false }, { [id("M")]: 50, [id("L")]: 500 }, all(s))!;
    expect(r.shorts.count).toBe(2);
    expect(r.long.count).toBe(3);
    expect(r.unknownPlays).toBe(0);
    expect(r.shorts.seconds).toBe(100);
  });

  it("no Shorts: noShorts, 0% / 100%, empty Shorts column, no sub", () => {
    const s = stats([...plays(4, id("L1"), by("Long")), ...plays(2, id("L2"), by("Long"))]);
    const r = estimateShortsSplit(s, { [id("L1")]: false, [id("L2")]: false }, { [id("L1")]: 600, [id("L2")]: 300 }, all(s))!;
    expect(r.noShorts).toBe(true);
    expect(r.shorts).toEqual({ count: 0, seconds: 0, pct: 0, topCreators: [], showEmptyState: true });
    expect(r.long).toMatchObject({ count: 6, seconds: 4 * 600 + 2 * 300, pct: 100, showEmptyState: true });
    // Project Lead: slide 16 stays (noShorts copy), slide 17 is skipped
    expect(r.slides).toEqual({ shortsVsLong: true, creatorsByFormat: false });
    expect(r.sub).toBeNull();
    expect(r.sameTopCreator).toBeNull();
  });

  it("picks the sub from plays vs time winners; each play capped at 3h", () => {
    const s = stats([...plays(8, id("S")), ...plays(2, id("L"))]);
    const r = estimateShortsSplit(s, { [id("S")]: true, [id("L")]: false }, { [id("S")]: 30, [id("L")]: 50_000 }, all(s))!;
    expect(r.long.seconds).toBe(2 * 10800);
    expect([r.playsWinner, r.timeWinner, r.sub]).toEqual(["shorts", "long", "shortsPlaysLongTime"]);
    const r2 = estimateShortsSplit(s, { [id("S")]: true, [id("L")]: false }, { [id("S")]: 30, [id("L")]: 60 }, all(s))!;
    expect(r2.sub).toBe("shortsBoth");
  });

  it("durations unavailable (empty / all null) → null even with an isShort map; both slides skipped", () => {
    const s = stats([...plays(3, id("A")), ...plays(3, id("B"))]);
    const flags = { [id("A")]: true, [id("B")]: false };
    expect(estimateShortsSplit(s, flags, {}, all(s))).toBeNull();
    expect(estimateShortsSplit(s, flags, { [id("A")]: null, [id("B")]: null }, all(s))).toBeNull();
    expect(shortsSlides(null)).toEqual({ shortsVsLong: false, creatorsByFormat: false });
  });

  it("classifyShortsPlay: the rule in one place", () => {
    expect(classifyShortsPlay({ shortsUrl: true, apiIsShort: false })).toBe("shorts");
    expect(classifyShortsPlay({ shortsUrl: true, apiIsShort: undefined })).toBe("shorts");
    expect(classifyShortsPlay({ shortsUrl: false, apiIsShort: true })).toBe("shorts");
    expect(classifyShortsPlay({ shortsUrl: false, apiIsShort: false })).toBe("long");
    expect(classifyShortsPlay({ shortsUrl: false, apiIsShort: null, durationSec: 30 })).toBe("unknown");
    expect(classifyShortsPlay({ shortsUrl: false, apiIsShort: undefined })).toBe("unknown");
  });
});

describe("shortsVerdict: every sub, from DISPLAYED shares and times", () => {
  const H = 3600, M = 60;
  const v = (sp: number, ss: number | null, ls: number | null) => shortsVerdict({ pct: sp, seconds: ss }, { pct: 100 - sp, seconds: ls }, false).sub;
  it.each([
    // [shorts %, shorts s, long s, sub]
    [70, 10 * H, 2 * H, "shortsBoth"],
    [30, 2 * H, 10 * H, "longBoth"],
    [70, 2 * H, 10 * H, "shortsPlaysLongTime"],
    [30, 10 * H, 2 * H, "longPlaysShortsTime"],
    [50, 5 * H, 5 * H, "tieBoth"],
    [50, 10 * H, 2 * H, "tiePlaysShortsTime"],
    [50, 21, 64, "tiePlaysLongTime"], // shorts-tiny: under a minute vs ≈ 1 minute
    [70, 3 * H + 10 * M, 2 * H + 50 * M, "shortsPlaysTieTime"], // both "≈ 3 hours" though seconds differ
    [30, 12 * M + 10, 11 * M + 40, "longPlaysTieTime"], // both "≈ 12 minutes"
    [70, null, 2 * H, "shortsPlaysOnly"],
    [30, 2 * H, null, "longPlaysOnly"],
    [50, null, null, "tiePlaysOnly"],
    [50, 10, 25, "tieBoth"], // both "under a minute"
  ] as const)("%i%% · %s s vs %s s → %s", (sp, ss, ls, sub) => {
    expect(v(sp, ss, ls)).toBe(sub);
  });
  it("time tie needs the same unit AND number; plays tie needs both shares at 50%", () => {
    expect(v(70, 59 * M + 40, 60 * M + 20)).toBe("shortsPlaysTieTime"); // both promote to "≈ 1 hour"
    expect(v(70, 59 * M + 20, 59 * M + 40)).toBe("shortsPlaysLongTime"); // "≈ 59 minutes" vs "≈ 1 hour"
    expect(v(70, 45, 75)).toBe("shortsPlaysTieTime"); // 45 s and 75 s both show "≈ 1 minute"
    expect(v(70, 29, 31)).toBe("shortsPlaysLongTime"); // "under a minute" vs "≈ 1 minute"
    expect(shortsVerdict({ pct: 51, seconds: 1 }, { pct: 49, seconds: 1 }, false).playsTie).toBe(false);
    const t = shortsVerdict({ pct: 50, seconds: 21 }, { pct: 50, seconds: 64 }, false);
    expect(t).toEqual({ playsWinner: "long", playsTie: true, timeWinner: "long", timeTie: false, sub: "tiePlaysLongTime" });
    expect(shortsVerdict({ pct: 0, seconds: 0 }, { pct: 100, seconds: 50 }, true).sub).toBeNull();
  });
  it("splitTimeDisplay: unknown, none, under, minutes, hours (59.5 min promoted)", () => {
    expect(splitTimeDisplay(null)).toEqual({ unit: "unknown" });
    expect(splitTimeDisplay(0)).toEqual({ unit: "none" });
    expect(splitTimeDisplay(29)).toEqual({ unit: "under" });
    expect(splitTimeDisplay(30)).toEqual({ unit: "minutes", n: 1 });
    expect(splitTimeDisplay(59 * 60 + 29)).toEqual({ unit: "minutes", n: 59 });
    expect(splitTimeDisplay(59 * 60 + 30)).toEqual({ unit: "hours", n: 1 });
  });
  it("end to end: a side with plays but no known duration → seconds null, plays-only sub", () => {
    // Shorts only via /shorts/ links on IDs that weren't looked up (no duration); long-form looked up.
    const s = stats([...plays(6, id("S"), { isShort: true }), ...plays(4, id("L"))]);
    const r = estimateShortsSplit(s, { [id("L")]: false }, { [id("L")]: 600 }, { topIds: [id("L")], sampleIds: [] })!;
    expect(r.shorts).toMatchObject({ count: 6, seconds: null, pct: 60 });
    expect([r.timeWinner, r.timeTie, r.sub]).toEqual([null, false, "shortsPlaysOnly"]);
  });
});

