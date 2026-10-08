import { describe, expect, it } from "vitest";
import { estimateShortsSplit } from "@/lib/takeout/shortsSplit";
import { computeStats } from "@/lib/takeout/stats";
import { buildDurationSample } from "@/lib/takeout/watchTime";
import { fakeDurations, fakeIsShort, makeDemoEvents } from "../demo-data";

describe("demo /api/durations mock: isShort", () => {
  const events = makeDemoEvents();
  const stats = computeStats(events, { timeZone: "UTC", range: { type: "allTime" } });
  const sample = buildDurationSample(stats, { cap: 2000, seed: 1 });
  const durations = fakeDurations(sample.ids);
  const isShort = fakeIsShort(sample.ids);

  it("follows the rule: null iff the duration is null, true only for ≤ 3 min", () => {
    for (const id of sample.ids) {
      if (durations[id] === null) expect(isShort[id]).toBeNull();
      else if (durations[id]! > 180) expect(isShort[id]).toBe(false);
    }
    expect(Object.values(isShort).some((v) => v === true)).toBe(true);
  });

  it("gives the demo a split with both sides", () => {
    const r = estimateShortsSplit(stats, isShort, durations, sample)!;
    expect(r.shorts.plays).toBeGreaterThan(0);
    expect(r.long.plays).toBeGreaterThan(r.shorts.plays);
    expect(r.long.topCreators.length).toBeGreaterThan(0);
  });
});
