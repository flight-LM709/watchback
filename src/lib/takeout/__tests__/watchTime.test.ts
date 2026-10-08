import { describe, expect, it } from "vitest";
import { buildDurationSample, estimateWatchTime, mulberry32 } from "../watchTime";

/** Build a stats-like object: ids sorted by plays desc, like computeStats does. */
function makeStats(n: number, playsFor: (i: number) => number) {
  const playCountsById: Record<string, number> = {};
  const ids = Array.from({ length: n }, (_, i) => {
    const id = ("x" + i.toString(36)).padEnd(11, "_");
    playCountsById[id] = playsFor(i);
    return id;
  });
  ids.sort((a, b) => playCountsById[b] - playCountsById[a]);
  return { uniqueVideoIds: ids, playCountsById };
}

describe("buildDurationSample", () => {
  it("sends everything with scale 1 when total <= cap", () => {
    const stats = makeStats(2000, (i) => (i % 7) + 1);
    const s = buildDurationSample(stats, { cap: 2000 });
    expect(s.ids).toHaveLength(2000);
    expect(new Set(s.ids).size).toBe(2000);
    expect(s.sampleIds).toEqual([]);
    expect(s.topIds).toEqual(s.ids);
    expect(s.scale).toBe(1);
    expect(s.restPlays).toBe(0);

    const durations = Object.fromEntries(stats.uniqueVideoIds.map((id) => [id, 100]));
    const est = estimateWatchTime(durations, stats.playCountsById, s)!;
    const exact = stats.uniqueVideoIds.reduce((t, id) => t + 100 * stats.playCountsById[id], 0);
    expect(est.seconds).toBe(exact);
    expect(est.coverage).toBe(1);
    expect(est.isEstimate).toBe(true);
  });

  it("caps a large history at 2000 unique IDs: top 1000 + uniform sample", () => {
    const stats = makeStats(30000, (i) => 1 + (i % 50));
    const s = buildDurationSample(stats, { cap: 2000, seed: 42 });
    expect(s.ids).toHaveLength(2000);
    expect(new Set(s.ids).size).toBe(2000);
    expect(s.topIds).toEqual(stats.uniqueVideoIds.slice(0, 1000));
    expect(s.sampleIds).toHaveLength(1000);
    const top = new Set(s.topIds);
    expect(s.sampleIds.every((id) => !top.has(id))).toBe(true);
    expect(s.scale).toBeCloseTo(s.restPlays / s.sampledPlays);
    expect(s.topPlays + s.restPlays).toBe(s.totalPlays);
    // seedable
    expect(buildDurationSample(stats, { cap: 2000, seed: 42 }).sampleIds).toEqual(s.sampleIds);
    expect(buildDurationSample(stats, { cap: 2000, seed: 7 }).sampleIds).not.toEqual(s.sampleIds);
  });

  it("respects small caps", () => {
    const s = buildDurationSample(makeStats(100, (i) => i + 1), { cap: 10, seed: 1 });
    expect(s.ids).toHaveLength(10);
    expect(s.topIds).toHaveLength(5);
  });
});

describe("estimateWatchTime", () => {
  it("returns null when no durations came back", () => {
    const stats = makeStats(10, () => 1);
    const s = buildDurationSample(stats);
    expect(estimateWatchTime({}, stats.playCountsById, s)).toBeNull();
    expect(estimateWatchTime(Object.fromEntries(s.ids.map((id) => [id, null])), stats.playCountsById, s)).toBeNull();
  });

  it("fills null top durations at the top group's average seconds per play", () => {
    const stats = makeStats(4, () => 2); // 8 plays
    const s = buildDurationSample(stats);
    const [a, b, c, d] = s.topIds;
    const est = estimateWatchTime({ [a]: 100, [b]: 300, [c]: null }, stats.playCountsById, s)!;
    // known: 2*100 + 2*300 = 800 over 4 plays -> 200/play; 4 unknown plays -> +800
    expect(est.seconds).toBe(1600);
    expect(est.exactSeconds).toBe(800);
    expect(est.coverage).toBe(0.5);
    void d;
  });

  it("scaled estimate is close to the true total on a synthetic dataset", () => {
    const rand = mulberry32(123);
    const N = 40000;
    // Zipf-ish plays, log-normal-ish durations (30s .. ~2h), 5% private/removed (null).
    const stats = makeStats(N, (i) => Math.max(1, Math.round(400 / (1 + i) ** 0.8 + rand() * 2)));
    const trueDur: Record<string, number> = {};
    const returned: Record<string, number | null> = {};
    let trueTotal = 0;
    for (const id of stats.uniqueVideoIds) {
      const d = Math.round(Math.min(7200, 30 + Math.exp(5 + rand() * 2.5)));
      trueDur[id] = d;
      trueTotal += d * stats.playCountsById[id];
      returned[id] = rand() < 0.05 ? null : d;
    }
    const errors: number[] = [];
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = buildDurationSample(stats, { cap: 2000, seed });
      expect(s.ids.length).toBe(2000);
      const resp = Object.fromEntries(s.ids.map((id) => [id, returned[id]]));
      const est = estimateWatchTime(resp, stats.playCountsById, s)!;
      expect(est.coverage).toBeGreaterThan(0);
      expect(est.coverage).toBeLessThan(1);
      errors.push(Math.abs(est.seconds - trueTotal) / trueTotal);
    }
    console.log("watch-time relative errors:", errors.map((e) => (e * 100).toFixed(2) + "%").join(", "));
    expect(Math.max(...errors)).toBeLessThan(0.08);
    expect(errors.reduce((a, b) => a + b) / errors.length).toBeLessThan(0.04);
  });
});
