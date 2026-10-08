/**
 * QA fixture suite: runs QA's synthetic Takeout zips (not committed here; they live in
 * QA's folder) through parseTakeoutZip + computeStats({ range: allTime, timeZone: Asia/Jakarta })
 * and compares against QA's expected-*.json.
 *
 *   pnpm test:fixtures                     # this suite only
 *   WATCHBACK_FIXTURES_DIR=/path pnpm test:fixtures
 *
 * Skips when the fixtures directory is absent. QA's files are only read, never modified.
 *
 * Definitions (see QA README): ads not counted; removed videos count toward totals but never
 * top creator/favorite; Music counted separately. QA computes busiest month, prime time,
 * streak and unique IDs over *linked YouTube videos only*. Our product stats compute those
 * over all non-ad plays (videos + removed + songs), and uniqueVideoIds includes Music (it
 * feeds the duration lookup). So those fields are checked two ways:
 *   - "parser" lens: the same QA definition recomputed from our parsed events must match exactly
 *   - "product" lens: our computeStats value, reported (not asserted) when it differs by definition
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { planSlides, MUSIC_SLIDES } from "@/components/story/slides";
import { computeStats, type WatchStats } from "../stats";
import { NoWatchHistoryError, NotTakeoutZipError, type ProgressInfo, type TakeoutEvent } from "../types";
import { parseTakeoutZip } from "../zip";

const DIR = process.env.WATCHBACK_FIXTURES_DIR ?? "/workspace/watchback-fixtures/out";
const HAVE = existsSync(join(DIR, "expected-small.json"));
const TZ = "Asia/Jakarta";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Pair = [string, number];
interface Expected {
  videos: number;
  videos_with_link: number;
  ads_excluded: number;
  removed_videos: number;
  unique_video_ids: number;
  music_plays: number;
  top_creators: Pair[];
  most_rewatched: Pair;
  busiest_month: Pair;
  prime_time: [[string, number], number];
  longest_streak_days: number;
  top_searches: Pair[];
  top_artists: Pair[];
}

interface Row { fixture: string; field: string; expected: string; actual: string; status: "pass" | "FAIL" | "definition" }
const rows: Row[] = [];
const fmt = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));

/** Record + assert (status FAIL makes the test fail). */
function check(fixture: string, field: string, expected: unknown, actual: unknown, ok = JSON.stringify(expected) === JSON.stringify(actual)) {
  rows.push({ fixture, field, expected: fmt(expected), actual: fmt(actual), status: ok ? "pass" : "FAIL" });
  expect.soft(ok, `${fixture}: ${field} expected ${fmt(expected)} got ${fmt(actual)}`).toBe(true);
}
/** Record a known definition difference (not asserted). */
function note(fixture: string, field: string, expected: unknown, actual: unknown) {
  const same = JSON.stringify(expected) === JSON.stringify(actual);
  rows.push({ fixture, field, expected: fmt(expected), actual: fmt(actual), status: same ? "pass" : "definition" });
}

/** Compare top-N lists where Counter.most_common and we may order ties differently. */
function sameRanking(expected: Pair[], actual: Pair[]): boolean {
  if (expected.length !== actual.length) return false;
  if (expected.some((e, i) => e[1] !== actual[i][1])) return false;
  const boundary = expected.at(-1)?.[1];
  const key = (p: Pair) => `${p[0]}\u0000${p[1]}`;
  const exp = new Set(expected.filter((p) => p[1] !== boundary).map(key));
  const act = new Set(actual.filter((p) => p[1] !== boundary).map(key));
  return exp.size === act.size && [...exp].every((k) => act.has(k));
}

const zip = (name: string) => new Uint8Array(readFileSync(join(DIR, name)));
const expected = (name: string): Expected => JSON.parse(readFileSync(join(DIR, name), "utf8"));
const stripTopic = (n: string) => n.replace(/\s+-\s+Topic$/, "");
const allTime = (events: TakeoutEvent[]) => computeStats(events, { range: { type: "allTime" }, timeZone: TZ });

async function run(files: string[], onProgress?: (p: ProgressInfo) => void) {
  const r = await parseTakeoutZip(files.map(zip), { fallbackTimeZone: TZ, onProgress });
  return { ...r, stats: allTime(r.events) };
}

function compare(fixture: string, exp: Expected, events: TakeoutEvent[], s: WatchStats, opts: { skipTies?: boolean } = {}) {
  check(fixture, "videos", exp.videos, s.totalVideos);
  check(fixture, "videos_with_link", exp.videos_with_link, s.totalVideos - s.unavailableVideos);
  check(fixture, "ads_excluded", exp.ads_excluded, s.adsExcluded);
  check(fixture, "removed_videos", exp.removed_videos, s.unavailableVideos);
  check(fixture, "music_plays", exp.music_plays, s.totalSongs);
  check(fixture, "top_creators", exp.top_creators, s.topCreators.map((c) => [c.name, c.count]), sameRanking(exp.top_creators, s.topCreators.map((c) => [c.name, c.count])));
  if (!opts.skipTies) check(fixture, "most_rewatched", exp.most_rewatched, s.favoriteVideo && [s.favoriteVideo.videoId, s.favoriteVideo.count]);
  const searches = s.topSearches.slice(0, 5).map((q) => [q.query, q.count] as Pair);
  check(fixture, "top_searches", exp.top_searches, searches, sameRanking(exp.top_searches, searches));
  const artists = s.topArtists.slice(0, 3).map((a) => [a.name, a.count] as Pair);
  const expArtists = exp.top_artists.map(([n, c]) => [stripTopic(n), c] as Pair); // we display artists without " - Topic"
  check(fixture, "top_artists (sans ' - Topic')", expArtists, artists, sameRanking(expArtists, artists));

  // Parser lens: QA's definition (linked, non-ad YouTube videos only) recomputed from our events.
  const linked = events.filter((e) => e.kind === "watch" && e.product === "youtube" && !e.isAd && !e.unavailable);
  const v = allTime(linked);
  check(fixture, "unique_video_ids (YouTube linked)", exp.unique_video_ids, new Set(linked.map((e) => e.videoId)).size);
  const [mKey, mCount] = exp.busiest_month;
  check(fixture, "busiest_month (linked videos)", exp.busiest_month,
    [v.busiestMonth?.key, v.busiestMonth?.count],
    v.busiestMonth?.count === mCount && v.monthly.find((b) => b.key === mKey)?.count === mCount);
  check(fixture, "longest_streak_days (linked videos)", exp.longest_streak_days, v.longestStreak?.days ?? 0);
  if (!opts.skipTies) {
    const [[day, hour], count] = exp.prime_time;
    const d = DAYS.indexOf(day);
    check(fixture, "prime_time (linked videos)", exp.prime_time, v.peak && [[DAYS[v.peak.day], v.peak.hour], v.peak.count],
      v.peak?.count === count && v.heatmap[d][hour] === count);
  }

  // Product lens: what the slides actually show (all plays incl. removed + Music).
  note(fixture, "uniqueVideoIds (product: incl. Music)", exp.unique_video_ids, s.uniqueVideoIds.length);
  note(fixture, "busiest_month (product: all plays)", exp.busiest_month, [s.busiestMonth?.key, s.busiestMonth?.count]);
  note(fixture, "longest_streak_days (product: all plays)", exp.longest_streak_days, s.longestStreak?.days ?? 0);
  if (!opts.skipTies) note(fixture, "prime_time (product: all plays)", exp.prime_time, s.peak && [[DAYS[s.peak.day], s.peak.hour], s.peak.count]);
}

describe.skipIf(!HAVE)(`QA fixtures (${DIR})`, () => {
  afterAll(() => {
    const out = rows.map((r) => `${r.status.padEnd(10)} ${r.fixture.padEnd(22)} ${r.field.padEnd(42)} exp=${r.expected}  got=${r.actual}`);
    console.log(`\nQA fixture report (${rows.filter((r) => r.status === "pass").length} pass, ${rows.filter((r) => r.status === "FAIL").length} fail, ${rows.filter((r) => r.status === "definition").length} definition diffs)\n` + out.join("\n"));
  });

  it("small-json.zip matches expected-small.json", async () => {
    const r = await run(["small-json.zip"]);
    compare("small-json", expected("expected-small.json"), r.events, r.stats);
  });

  it("small-html.zip matches expected-small.json and is identical to the JSON version", async () => {
    const [j, h] = await Promise.all([run(["small-json.zip"]), run(["small-html.zip"])]);
    compare("small-html", expected("expected-small.json"), h.events, h.stats);
    const ok = JSON.stringify(j.stats) === JSON.stringify(h.stats);
    check("small-html", "JSON vs HTML: identical computeStats", "identical", ok ? "identical" : "different", ok);
    expect(h.stats).toEqual(j.stats);
  });

  it("indonesian-folders.zip finds history under 'YouTube dan YouTube Music'", async () => {
    const r = await run(["indonesian-folders.zip"]);
    expect(r.diagnostics.sources.map((s) => s.path)).toEqual(expect.arrayContaining([expect.stringContaining("YouTube dan YouTube Music")]));
    compare("indonesian-folders", expected("expected-small.json"), r.events, r.stats);
  });

  it("split-001.zip + split-002.zip together give the full stats", async () => {
    const r = await run(["split-001.zip", "split-002.zip"]);
    compare("split-001+002", expected("expected-small.json"), r.events, r.stats);
    // parts alone: watch-only works, search-only is "no watch history"
    const w = await run(["split-001.zip"]);
    check("split-001", "videos (watch part alone)", 519, w.stats.totalVideos);
    await expect(run(["split-002.zip"])).rejects.toBeInstanceOf(NoWatchHistoryError);
  });

  it("large-100k.zip matches expected-large.json, reports progress, and is fast", async () => {
    const progress: ProgressInfo[] = [];
    const t0 = performance.now();
    const r = await run(["large-100k.zip"], (p) => progress.push(p));
    const ms = performance.now() - t0;
    compare("large-100k", expected("expected-large.json"), r.events, r.stats);
    const counts = progress.filter((p) => p.phase === "parsing").map((p) => p.watchCount);
    check("large-100k", "progress: >10 updates, monotonic", true, counts.length > 10 && counts.every((c, i) => i === 0 || c >= counts[i - 1]));
    check("large-100k", "progress: final watchCount", r.diagnostics.watchEvents, progress.at(-1)?.watchCount);
    check("large-100k", "parse+stats under 15s", true, ms < 15_000);
    console.log(`large-100k: parse + stats in ${ms.toFixed(0)} ms`);
  });

  it("no-music.zip has no Music, so music slides are dropped", async () => {
    const r = await run(["no-music.zip"]);
    const exp = expected("expected-small.json");
    check("no-music", "music_plays", 0, r.stats.totalSongs);
    check("no-music", "videos", exp.videos, r.stats.totalVideos);
    check("no-music", "removed_videos", exp.removed_videos, r.stats.unavailableVideos);
    const plan = planSlides(r.stats, { watchTime: null });
    check("no-music", "music slides in plan", [], plan.filter((k) => MUSIC_SLIDES.has(k)));
  });

  it("tz-edge-jakarta.zip: night-owl badge and a 5-day streak in Asia/Jakarta", async () => {
    const r = await run(["tz-edge-jakarta.zip"]);
    const exp = expected("expected-tz-edge.json");
    compare("tz-edge-jakarta", exp, r.events, r.stats, { skipTies: true }); // README: prime time + favorite tie here
    check("tz-edge-jakarta", "peakHourBadge", "night-owl", r.stats.peakHourBadge?.badge);
    check("tz-edge-jakarta", "longest_streak_days (product)", 5, r.stats.longestStreak?.days);
    // Sanity: the same events in UTC give the "wrong" answers QA describes.
    const utc = computeStats(r.events, { range: { type: "allTime" }, timeZone: "UTC" });
    check("tz-edge-jakarta", "UTC control: badge / streak", ["afternoon-drifter", 4], [utc.peakHourBadge?.badge, utc.longestStreak?.days]);
  });

  it.each([
    ["empty-history.zip", NoWatchHistoryError, "NO_WATCH_HISTORY"],
    ["not-takeout.zip", NotTakeoutZipError, "NOT_TAKEOUT_ZIP"],
    ["not-a-zip.zip", NotTakeoutZipError, "NOT_TAKEOUT_ZIP"],
  ] as const)("%s → %s", async (file, Err, code) => {
    const err = await run([file]).then(() => null, (e) => e);
    check(file.replace(".zip", ""), "typed error", code, err?.code ?? (err ? String(err) : "no error"), err instanceof Err && err.code === code);
  });
});
