/**
 * QA's Shorts fixtures (watchback-fixtures/shorts/gen_shorts.py → out/shorts-*.zip + expected-shorts-*.json),
 * run through the same pipeline as the app: parse → computeStats (default period, Asia/Jakarta) →
 * buildDurationSample(seed 1) → one /api/durations call against Backend Dev's real handler in
 * YOUTUBE_API_MOCK mode → estimateShortsSplit. Expected values hold only with that mock.
 * ≤ 2,000 IDs: exact match on every field QA writes (incl. playsTie, timeTie, each side's displayed
 * time unit, the tie / plays-only sub, each side's top1Lead / acceptableTop1, and the window note).
 * shorts-sampled (5,000 IDs): QA's README tolerance (SAMPLED_TOL) on the app's sample (seed 1) and
 * seeds 2–10; the #1 must be one of the file's `acceptableTop1` (exactly #1 when it leads #2 by > 15%).
 * No hard-coded seconds: everything is read from QA's current expected files.
 * Skips when QA's folder is absent; files are only read.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDurationsHandler } from "@/lib/durations/handler";
import { RateLimiter } from "@/lib/durations/guards";
import { planSlides } from "@/components/story/slides";
import { itemText, splitTimeAria, splitTimeText } from "@/components/watchback/slides";
import { fetchDurations, type FetchLike } from "../durationsClient";
import { estimateShortsSplit, splitTimeDisplay, type ShortsSplitEstimate } from "../shortsSplit";
import { computeStats } from "../stats";
import { buildDurationSample } from "../watchTime";
import { parseTakeoutZip } from "../zip";

const DIR = process.env.WATCHBACK_FIXTURES_DIR ?? "/workspace/watchback-fixtures/out";
const NAMES = ["shorts-mix", "shorts-heavy", "shorts-flip", "shorts-none", "shorts-one", "shorts-tiny", "shorts-sampled"];
const HAVE = NAMES.every((n) => existsSync(join(DIR, `${n}.zip`)) && existsSync(join(DIR, `expected-${n}.json`)));
const TZ = "Asia/Jakarta";

type Side = {
  count: number; seconds: number | null; hours?: number | null; pct: number; showEmptyState: boolean;
  topCreators: { name: string; count: number }[]; display: [string, number];
  /** (#1 − #2) / #2, 4 decimals; null with fewer than 2 creators. */
  top1Lead: number | null;
  /** Names that pass as the shown #1: just #1 when top1Lead > 0.15, else #1 or #2. */
  acceptableTop1: string[];
};
/** QA README (shorts-sampled): counts ±10%, pct ±3 points, seconds ±15%, shown creators within 25%; #1 rule via acceptableTop1. */
const SAMPLED_TOL = { count: 0.1, pct: 3, seconds: 0.15, creator: 0.25 };
/** QA's #1 rule threshold, used only to check the files' own acceptableTop1 against their top1Lead. */
const LEAD_RULE = 0.15;
type Expected = Omit<ShortsSplitEstimate, "shorts" | "long" | "isEstimate" | "coverage"> & { mode: string; window: string; totalVideos: number; distinctIds: number; shorts: Side; long: Side };
/** QA's window note (same in every file): the app's default period keeps every fixture play. */
const WINDOW = "app: 12 months ending at the latest watch; every play here is within Oct 2025 - Sep 2026, so all count";
/** QA's `display` pair: [unit, n] with n = 0 for "none" / "under". */
const display = (seconds: number | null): [string, number] => {
  const d = splitTimeDisplay(seconds);
  return [d.unit, "n" in d ? d.n : 0];
};

function handlerFetch(deps: Parameters<typeof createDurationsHandler>[0] = { mock: true }): FetchLike {
  const handler = createDurationsHandler({ limiter: new RateLimiter(1000, 60_000), ...deps });
  return async (url, init) => handler(new Request(`http://localhost${url}`, { method: init?.method, headers: init?.headers, body: String(init?.body ?? "") }));
}

async function statsOf(name: string) {
  const { events } = await parseTakeoutZip(new Uint8Array(readFileSync(join(DIR, `${name}.zip`))), { fallbackTimeZone: TZ });
  return Object.assign(computeStats(events, { timeZone: TZ }), { events });
}
async function run(name: string, fetchImpl = handlerFetch(), seed = 1) {
  const stats = await statsOf(name);
  const sample = buildDurationSample(stats, { cap: 2000, seed });
  const { durations, isShort } = await fetchDurations(sample.ids, { fetchImpl });
  return { stats, split: estimateShortsSplit(stats, isShort, durations, sample) };
}
/** Ground truth for the 5,000-ID file: every ID looked up (test-only, in 2,000-ID requests), all creators ranked. */
async function truth(name: string) {
  const stats = await statsOf(name);
  const ids = stats.uniqueVideoIds;
  const durations: Record<string, number | null> = {};
  const isShort: Record<string, boolean | null> = {};
  for (let i = 0; i < ids.length; i += 2000) {
    const r = await fetchDurations(ids.slice(i, i + 2000), { fetchImpl: handlerFetch() });
    Object.assign(durations, r.durations);
    Object.assign(isShort, r.isShort);
  }
  return estimateShortsSplit(stats, isShort, durations, { topIds: ids, sampleIds: [] }, { topN: 50 })!;
}
const load = (name: string): Expected => JSON.parse(readFileSync(join(DIR, `expected-${name}.json`), "utf8"));
/** top1Lead / acceptableTop1 from a ranked creator list (QA's definitions). */
function leadOf(top: { name: string; count: number }[]) {
  if (top.length < 2) return { top1Lead: null, acceptableTop1: top.slice(0, 1).map((c) => c.name) };
  const top1Lead = Math.round(((top[0].count - top[1].count) / top[1].count) * 10_000) / 10_000;
  return { top1Lead, acceptableTop1: top1Lead > LEAD_RULE ? [top[0].name] : [top[0].name, top[1].name] };
}
const side = (s: ShortsSplitEstimate["shorts"]) => ({
  count: s.count, seconds: s.seconds, pct: s.pct, showEmptyState: s.showEmptyState,
  topCreators: s.topCreators.map(({ name, count }) => ({ name, count })), display: display(s.seconds),
  ...leadOf(s.topCreators),
});
const verdict = (s: Pick<Expected, "noShorts" | "slides" | "playsWinner" | "playsTie" | "timeWinner" | "timeTie" | "sub" | "sameTopCreator" | "unknownPlays">) => ({
  noShorts: s.noShorts, slides: s.slides, playsWinner: s.playsWinner, playsTie: s.playsTie, timeWinner: s.timeWinner,
  timeTie: s.timeTie, sub: s.sub, sameTopCreator: s.sameTopCreator, unknownPlays: s.unknownPlays,
});

describe.skipIf(!HAVE)("QA Shorts fixtures (YOUTUBE_API_MOCK)", () => {
  it.each(NAMES.filter((n) => n !== "shorts-sampled"))("%s matches exactly", async (name) => {
    const exp = load(name);
    const { stats, split } = await run(name);
    // every key QA writes is checked below; a new one fails here until the suite covers it
    expect(Object.keys(exp).sort()).toEqual(["distinctIds", "long", "mode", "noShorts", "playsTie", "playsWinner", "sameTopCreator", "shorts", "slides", "sub", "timeTie", "timeWinner", "totalVideos", "unknownPlays", "window"]);
    expect(exp.mode).toBe("YOUTUBE_API_MOCK=1 only");
    // window: the app's default (12 local months ending with the latest watch's month) keeps every play
    expect(exp.window).toBe(WINDOW);
    expect(stats.range.type).toBe("last12Months");
    const yt = stats.events.filter((e) => e.kind === "watch" && e.product === "youtube" && !e.isAd);
    const latest = Math.max(...yt.map((e) => e.timestamp.getTime()));
    expect(yt.every((e) => e.timestamp >= stats.range.start && e.timestamp < stats.range.end)).toBe(true);
    expect(stats.range.end.getTime() - latest).toBeLessThanOrEqual(31 * 86_400_000);
    expect(stats.totalVideos).toBe(exp.totalVideos);
    expect(new Set(stats.videoPlays.map((r) => r.videoId)).size).toBe(exp.distinctIds);
    expect(split).not.toBeNull();
    const s = split!;
    // QA's files also carry `hours` (seconds / 3600, 1 decimal) for humans; compare it separately.
    for (const k of ["shorts", "long"] as const) {
      const { hours, ...want } = exp[k];
      expect(side(s[k])).toEqual(want);
      expect(hours).toBe(s[k].seconds === null ? null : Math.round((s[k].seconds! / 3600) * 10) / 10);
    }
    expect(verdict(s)).toEqual(verdict(exp));
    const plan = planSlides(stats, { shortsSplit: s });
    expect(plan.includes("shorts-vs-long")).toBe(true);
    expect(plan.includes("creators-by-format")).toBe(!exp.noShorts);
  });

  it("shorts-mix spot check: counts, shares and seconds from QA's current file; different #1s", async () => {
    const exp = load("shorts-mix");
    const s = (await run("shorts-mix")).split!;
    expect([s.shorts.count, s.shorts.pct, s.shorts.seconds, s.long.count, s.long.pct, s.long.seconds]).toEqual([exp.shorts.count, exp.shorts.pct, exp.shorts.seconds, exp.long.count, exp.long.pct, exp.long.seconds]);
    expect(s.sub).toBe("shortsPlaysLongTime");
    expect(s.shorts.topCreators[0].name).not.toBe(s.long.topCreators[0].name);
  });

  it("shorts-one: singular lines (≈ 1 video, ≈ 3 minutes vs ≈ 1 hour, a 1-play creator row)", async () => {
    const s = (await run("shorts-one")).split!;
    expect(splitTimeText(s.shorts.seconds)).toBe("≈ 3 minutes");
    expect(splitTimeText(s.long.seconds)).toBe("≈ 1 hour");
    expect([splitTimeAria(s.shorts.seconds), splitTimeAria(s.long.seconds)]).toEqual(["about 3 minutes", "about 1 hour"]);
    expect(itemText(s.long.topCreators.at(-1)!.count)).toBe("≈ 1 video");
    expect(itemText(s.shorts.topCreators[0].count)).toBe("≈ 1 video");
  });

  it("shorts-tiny: under a minute vs ≈ 1 minute; 1–1 plays tie → tiePlaysLongTime", async () => {
    const s = (await run("shorts-tiny")).split!;
    expect(splitTimeText(s.shorts.seconds)).toBe("under a minute");
    expect(splitTimeText(s.long.seconds)).toBe("≈ 1 minute");
    expect([s.playsTie, s.timeTie, s.sub]).toEqual([true, false, "tiePlaysLongTime"]);
  });

  // shorts-sampled: QA's truth must equal our full lookup; the app's own sample (seed 1) is held to QA's tolerance.
  it("shorts-sampled: full-lookup truth equals QA's expected file exactly (incl. top1Lead / acceptableTop1)", async () => {
    const exp = load("shorts-sampled");
    const all = await truth("shorts-sampled");
    for (const k of ["shorts", "long"] as const) {
      expect([all[k].count, all[k].seconds, all[k].pct, display(all[k].seconds)]).toEqual([exp[k].count, exp[k].seconds, exp[k].pct, exp[k].display]);
      expect(all[k].topCreators.slice(0, 3).map(({ name, count }) => ({ name, count }))).toEqual(exp[k].topCreators);
      expect(leadOf(all[k].topCreators)).toEqual({ top1Lead: exp[k].top1Lead, acceptableTop1: exp[k].acceptableTop1 });
    }
    expect(verdict(all)).toEqual({ ...verdict(exp), unknownPlays: all.unknownPlays });
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])("shorts-sampled, seed %i (1 = the app's sample): QA's tolerance and #1 rule", async (seed) => {
    const exp = load("shorts-sampled");
    const { stats, split } = await run("shorts-sampled", handlerFetch(), seed);
    expect(stats.totalVideos).toBe(exp.totalVideos);
    const s = split!;
    const all = await truth("shorts-sampled");
    for (const k of ["shorts", "long"] as const) {
      const e = exp[k];
      expect(Math.abs(s[k].count - e.count) / e.count, `${k} count`).toBeLessThanOrEqual(SAMPLED_TOL.count);
      expect(Math.abs(s[k].pct - e.pct), `${k} pct`).toBeLessThanOrEqual(SAMPLED_TOL.pct);
      expect(Math.abs(s[k].seconds! - e.seconds!) / e.seconds!, `${k} seconds`).toBeLessThanOrEqual(SAMPLED_TOL.seconds);
      // #1 rule straight from the file: acceptableTop1 is [#1] when top1Lead > 15%, else [#1, #2]
      expect(e.acceptableTop1, `${k} #1 (top1Lead ${e.top1Lead})`).toContain(s[k].topCreators[0].name);
      for (const c of s[k].topCreators) {
        const t = all[k].topCreators.find((x) => x.name === c.name)!.count;
        expect(Math.abs(c.count - t) / t, `${k}: ${c.name} ≈${c.count} vs true ${t}`).toBeLessThanOrEqual(SAMPLED_TOL.creator);
      }
    }
    expect([s.playsWinner, s.playsTie, s.timeWinner, s.timeTie, s.sub, s.noShorts]).toEqual([exp.playsWinner, exp.playsTie, exp.timeWinner, exp.timeTie, exp.sub, exp.noShorts]);
  });

  it("durations unavailable (no key, no mock → 503) → no split, both slides skipped", async () => {
    const { stats, split } = await run("shorts-mix", handlerFetch({ mock: false }));
    expect(split).toBeNull();
    const plan = planSlides(stats, { shortsSplit: split });
    expect(plan).not.toContain("shorts-vs-long");
    expect(plan).not.toContain("creators-by-format");
  });
});
