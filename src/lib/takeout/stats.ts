/**
 * Pure stats over normalized events. ALL calendar bucketing (hour, weekday, date,
 * month, streaks, range boundaries) happens in `timeZone`, which defaults to the
 * browser's zone. Takeout JSON times are UTC; this is where they become local.
 */
import { artistFromChannel } from "./normalize";
import type { TakeoutEvent } from "./types";
import { dayNumberToIso, LocalClock, runtimeTimeZone, zonedWallTimeToUtc } from "./tz";

export type DateRange =
  | { type: "last12Months" }
  | { type: "calendarYear"; year: number }
  | { type: "allTime" }
  | { type: "custom"; start: Date; end: Date };

export interface StatsOptions {
  /** Default: last 12 months (month-aligned) ending at the latest watch. */
  range?: DateRange;
  /** IANA zone for all bucketing. Default: Intl.DateTimeFormat().resolvedOptions().timeZone */
  timeZone?: string;
  /** Size of top lists (creators, artists, songs). Default 5. */
  topN?: number;
  /** Size of the top searches list. Default 10. */
  topSearchesN?: number;
  /** Which plays feed the time-based slides. Default TIME_STATS_BASIS. */
  timeBasis?: TimeStatsBasis;
}

/**
 * Which plays count toward the TIME-BASED slides: busiest month (monthly / monthOfYear),
 * prime-time heatmap (heatmap / hourOfDay / dayOfWeek / peak), peak-hour badge, streak,
 * and the per-day average.
 *  - "youtube-videos": YouTube (non-Music) plays, including removed/private videos. Ads and Music excluded.
 *  - "all-plays":      every non-ad play, YouTube + Music.
 *  - "linked-videos":  YouTube plays that still have a video link (QA's definition; removed excluded).
 * Totals, top lists and uniqueVideoIds don't depend on this (Music always has its own stats,
 * and uniqueVideoIds always includes Music because it feeds the duration lookup).
 */
export type TimeStatsBasis = "youtube-videos" | "all-plays" | "linked-videos";

/** TENTATIVE default, pending Project Lead. Change this one line to switch the definition. */
export const TIME_STATS_BASIS: TimeStatsBasis = "youtube-videos";

/** Does this event count toward the time-based slides under `basis`? (Ads never do.) */
export function countsForTimeStats(e: TakeoutEvent, basis: TimeStatsBasis = TIME_STATS_BASIS): boolean {
  if (e.kind !== "watch" || e.isAd) return false;
  switch (basis) {
    case "all-plays":
      return true;
    case "youtube-videos":
      return e.product === "youtube";
    case "linked-videos":
      return e.product === "youtube" && !e.unavailable && !!e.videoId;
  }
}

export interface CountedName { name: string; url?: string; count: number }
export interface CountedSong { videoId?: string; title: string; artist?: string; count: number }
/** One video × creator pair of non-ad YouTube (non-Music) plays. Feeds the Shorts/long-form split. */
export interface VideoPlayRow {
  videoId: string;
  /** Plays in range (a video counted under two channel keys, e.g. a channel URL change, gets two rows). */
  plays: number;
  /** Of those, plays opened from a /shorts/ URL (always Shorts, whatever the API says). */
  shortsUrlPlays: number;
  /** Key into WatchStats.channels; absent when Takeout had no channel for these plays. */
  channel?: string;
}
export interface MonthBucket { key: string; year: number; month: number; count: number }

export interface WatchStats {
  timeZone: string;
  range: { type: DateRange["type"]; start: Date; end: Date; days: number };
  /** Non-ad YouTube (non-Music) watches in range. Includes removed/private videos. */
  totalVideos: number;
  /** Non-ad YouTube Music plays in range. */
  totalSongs: number;
  /** totalVideos + totalSongs. */
  totalPlays: number;
  /** "From Google Ads" watches in range (excluded from every other number). */
  adsExcluded: number;
  unavailableVideos: number;
  shortsWatched: number;
  /** Time-basis plays (see TIME_STATS_BASIS) per local day in range. */
  avgVideosPerDay: number;
  /** All non-ad plays (YouTube + Music) per local day in range. */
  avgPlaysPerDay: number;
  /** Which plays fed the time-based fields below. */
  timeBasis: TimeStatsBasis;
  topCreators: CountedName[];
  /** Most-rewatched YouTube video with a known title (removed/private ones can't win). */
  favoriteVideo: { videoId: string; title: string; channelName?: string; count: number } | null;
  topArtists: CountedName[];
  topSongs: CountedSong[];
  /** Chronological month buckets covering the range (12 for the default range / a calendar year). */
  monthly: MonthBucket[];
  /** Plays by month of year, Jan..Dec. */
  monthOfYear: number[];
  busiestMonth: MonthBucket | null;
  /** heatmap[dayOfWeek][hour], 0 = Sunday, local time. */
  heatmap: number[][];
  hourOfDay: number[];
  dayOfWeek: number[];
  peak: { day: number; hour: number; count: number } | null;
  /** Exactly one time-of-day badge (normalized by window length); null only with zero plays. */
  peakHourBadge: PeakHourBadgeResult | null;
  longestStreak: { days: number; start: string; end: string } | null;
  totalSearches: number;
  topSearches: Array<{ query: string; count: number }>;
  /** Unique video IDs (YouTube + Music, non-ad) in range, most-played first. Send to the duration endpoint. */
  uniqueVideoIds: string[];
  /** Plays per video ID. Stays client-side: watch time ≈ Σ duration(id) × plays(id). */
  playCountsById: Record<string, number>;
  /**
   * Non-ad YouTube (non-Music) plays that have a video ID, per video and creator. Stays client-side.
   * Removed videos (no ID) aren't here; they count as "unknown" in the Shorts split.
   */
  videoPlays: VideoPlayRow[];
  /** Creator key (channel URL, or "n:" + name) → latest display name, for videoPlays[].channel. */
  channels: Record<string, { name: string; url?: string }>;
}

export type PeakHourBadge =
  | "early-bird"
  | "coffee-break"
  | "lunch-break"
  | "afternoon-drifter"
  | "evening-regular"
  | "night-owl";

export interface PeakHourBadgeResult {
  badge: PeakHourBadge;
  /** Integer % of all plays that fall in the winning window. */
  pct: number;
  /** Plays in the winning window. */
  plays: number;
}

/** Local-time windows covering all 24 hours: [startHour, endHour), wrapping past midnight. */
export const PEAK_HOUR_WINDOWS: ReadonlyArray<{ badge: PeakHourBadge; start: number; end: number; hours: number }> = [
  { badge: "early-bird", start: 5, end: 9, hours: 4 },
  { badge: "coffee-break", start: 9, end: 11, hours: 2 },
  { badge: "lunch-break", start: 11, end: 14, hours: 3 },
  { badge: "afternoon-drifter", start: 14, end: 18, hours: 4 },
  { badge: "evening-regular", start: 18, end: 22, hours: 4 },
  { badge: "night-owl", start: 22, end: 5, hours: 7 },
];

const inWindow = (hour: number, w: { start: number; end: number }) =>
  w.start < w.end ? hour >= w.start && hour < w.end : hour >= w.start || hour < w.end;

/**
 * Pick the window with the highest plays-per-hour (plays / window hours), so the 7h
 * night-owl window can't win just by being wide. Ties: more raw plays, then list order.
 */
export function peakHourBadge(hourOfDay: number[]): PeakHourBadgeResult | null {
  const total = hourOfDay.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  let best: { badge: PeakHourBadge; plays: number; rate: number } | null = null;
  for (const w of PEAK_HOUR_WINDOWS) {
    let plays = 0;
    for (let h = 0; h < 24; h++) if (inWindow(h, w)) plays += hourOfDay[h] ?? 0;
    const rate = plays / w.hours;
    if (!best || rate > best.rate || (rate === best.rate && plays > best.plays)) best = { badge: w.badge, plays, rate };
  }
  return { badge: best!.badge, plays: best!.plays, pct: Math.round((best!.plays / total) * 100) };
}

const isPlay = (e: TakeoutEvent) => e.kind === "watch" && !e.isAd;

function monthStartUtc(tz: string, year: number, month: number): number {
  // month may overflow (13 -> next Jan) or underflow (0 -> previous Dec)
  const y = year + Math.floor((month - 1) / 12);
  const m = (((month - 1) % 12) + 12) % 12 + 1;
  return zonedWallTimeToUtc(tz, y, m, 1, 0, 0, 0);
}

export function resolveRange(
  events: TakeoutEvent[],
  range: DateRange,
  timeZone: string,
): { start: number; end: number } {
  if (range.type === "custom") return { start: range.start.getTime(), end: range.end.getTime() };
  if (range.type === "calendarYear") {
    return { start: zonedWallTimeToUtc(timeZone, range.year, 1, 1), end: zonedWallTimeToUtc(timeZone, range.year + 1, 1, 1) };
  }
  let min = Infinity, max = -Infinity;
  for (const e of events) {
    if (!isPlay(e)) continue;
    const t = e.timestamp.getTime();
    if (t < min) min = t;
    if (t > max) max = t;
  }
  if (max === -Infinity) {
    for (const e of events) {
      const t = e.timestamp.getTime();
      if (t < min) min = t;
      if (t > max) max = t;
    }
  }
  if (max === -Infinity) return { start: 0, end: 0 };
  if (range.type === "allTime") return { start: min, end: max + 1 };
  // last12Months: the 12 local calendar months ending with the latest watch's month.
  const local = new LocalClock(timeZone).shifted(max);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth() + 1;
  return { start: monthStartUtc(timeZone, y, m - 11), end: max + 1 };
}

/** Local calendar years that have at least one play, newest first. */
export function availableYears(events: TakeoutEvent[], timeZone = runtimeTimeZone()): number[] {
  const clock = new LocalClock(timeZone);
  const years = new Set<number>();
  for (const e of events) if (isPlay(e)) years.add(clock.shifted(e.timestamp.getTime()).getUTCFullYear());
  return [...years].sort((a, b) => b - a);
}

function topEntries<V extends { count: number }>(m: Map<string, V>, n: number, label: (v: V) => string): V[] {
  return [...m.values()]
    .sort((a, b) => b.count - a.count || label(a).localeCompare(label(b)))
    .slice(0, n);
}

/**
 * Creators are first grouped by channel URL (stable across renames; the latest name wins),
 * then groups that end up with the same display name are merged, since the slide can't tell
 * them apart anyway (and it guards against exports with inconsistent channel URLs).
 */
function mergeByName(byUrl: Map<string, CountedName>): Map<string, CountedName> {
  const out = new Map<string, CountedName>();
  for (const c of byUrl.values()) {
    const k = c.name.trim().toLowerCase();
    const prev = out.get(k);
    if (!prev) out.set(k, { ...c });
    else {
      if (c.count > prev.count) { prev.url = c.url; prev.name = c.name; }
      prev.count += c.count;
    }
  }
  return out;
}

export function computeStats(events: TakeoutEvent[], options: StatsOptions = {}): WatchStats {
  const timeZone = options.timeZone ?? runtimeTimeZone();
  const range = options.range ?? { type: "last12Months" };
  const topN = options.topN ?? 5;
  const topSearchesN = options.topSearchesN ?? 10;
  const timeBasis = options.timeBasis ?? TIME_STATS_BASIS;
  const clock = new LocalClock(timeZone);
  const { start, end } = resolveRange(events, range, timeZone);
  let timeEvents = 0;

  let totalVideos = 0, totalSongs = 0, adsExcluded = 0, unavailableVideos = 0, shortsWatched = 0, totalSearches = 0;
  const creators = new Map<string, CountedName>();
  const videos = new Map<string, { videoId: string; title?: string; channelName?: string; count: number; last: number }>();
  const artists = new Map<string, CountedName>();
  const songs = new Map<string, CountedSong & { last: number }>();
  const searches = new Map<string, { query: string; count: number }>();
  const plays = new Map<string, number>();
  const videoPlays = new Map<string, VideoPlayRow>();
  const monthCounts = new Map<string, number>();
  const monthOfYear = new Array(12).fill(0);
  const heatmap = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const hourOfDay = new Array(24).fill(0);
  const dayOfWeek = new Array(7).fill(0);
  const days = new Set<number>();

  for (const e of events) {
    const t = e.timestamp.getTime();
    if (t < start || t >= end) continue;

    if (e.kind === "search") {
      if (e.isAd || !e.title) continue;
      totalSearches++;
      const key = e.title.toLowerCase().replace(/\s+/g, " ").trim();
      const s = searches.get(key);
      if (s) s.count++;
      else searches.set(key, { query: e.title.trim(), count: 1 });
      continue;
    }
    if (e.isAd) { adsExcluded++; continue; }

    // ---- a play (watch or song) ----
    // Time-based slides only count plays that match the configured basis (see TIME_STATS_BASIS).
    if (countsForTimeStats(e, timeBasis)) {
      timeEvents++;
      const offset = clock.offsetMs(t);
      const local = new Date(t + offset);
      const dow = local.getUTCDay();
      const hour = local.getUTCHours();
      const y = local.getUTCFullYear();
      const mo = local.getUTCMonth();
      heatmap[dow][hour]++;
      hourOfDay[hour]++;
      dayOfWeek[dow]++;
      monthOfYear[mo]++;
      const mkey = `${y}-${String(mo + 1).padStart(2, "0")}`;
      monthCounts.set(mkey, (monthCounts.get(mkey) ?? 0) + 1);
      days.add(Math.floor((t + offset) / 86400000));
    }
    if (e.unavailable) unavailableVideos++;
    if (e.isShort) shortsWatched++;
    if (e.videoId) plays.set(e.videoId, (plays.get(e.videoId) ?? 0) + 1);

    if (e.product === "music") {
      totalSongs++;
      const artist = artistFromChannel(e.channelName);
      if (artist) {
        const k = artist.toLowerCase();
        const a = artists.get(k);
        if (a) a.count++;
        else artists.set(k, { name: artist, count: 1 });
      }
      if (!e.unavailable) {
        const k = e.videoId ?? `t:${e.title.toLowerCase()}`;
        const s = songs.get(k);
        if (s) {
          s.count++;
          if (t >= s.last) { s.last = t; s.title = e.title; if (artist) s.artist = artist; }
        } else {
          songs.set(k, { videoId: e.videoId, title: e.title, artist, count: 1, last: t });
        }
      }
    } else {
      totalVideos++;
      let channel: string | undefined;
      if (e.channelName || e.channelUrl) {
        const k = (channel = e.channelUrl ?? `n:${e.channelName}`);
        const c = creators.get(k);
        if (c) { c.count++; if (e.channelName) c.name = e.channelName; }
        else creators.set(k, { name: e.channelName ?? e.channelUrl!, url: e.channelUrl, count: 1 });
      }
      if (e.videoId) {
        const rk = channel === undefined ? e.videoId : `${e.videoId}\u0000${channel}`;
        const row = videoPlays.get(rk);
        if (row) { row.plays++; if (e.isShort) row.shortsUrlPlays++; }
        else videoPlays.set(rk, { videoId: e.videoId, plays: 1, shortsUrlPlays: e.isShort ? 1 : 0, ...(channel !== undefined ? { channel } : {}) });
      }
      if (e.videoId) {
        const v = videos.get(e.videoId);
        const known = !e.unavailable;
        if (v) {
          v.count++;
          if (known && t >= v.last) { v.title = e.title; v.channelName = e.channelName; v.last = t; }
        } else {
          videos.set(e.videoId, { videoId: e.videoId, title: known ? e.title : undefined, channelName: e.channelName, count: 1, last: known ? t : -Infinity });
        }
      }
    }
  }

  // Month buckets across the range, chronological.
  const monthly: MonthBucket[] = [];
  if (end > start) {
    const s = clock.shifted(start);
    const l = clock.shifted(end - 1);
    let y = s.getUTCFullYear(), m = s.getUTCMonth() + 1;
    const ly = l.getUTCFullYear(), lm = l.getUTCMonth() + 1;
    while (y < ly || (y === ly && m <= lm)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      monthly.push({ key, year: y, month: m, count: monthCounts.get(key) ?? 0 });
      if (++m > 12) { m = 1; y++; }
      if (monthly.length > 1200) break;
    }
  }
  let busiestMonth: MonthBucket | null = null;
  for (const b of monthly) if (b.count > 0 && (!busiestMonth || b.count > busiestMonth.count)) busiestMonth = b;

  let peak: WatchStats["peak"] = null;
  for (let d = 0; d < 7; d++)
    for (let h = 0; h < 24; h++)
      if (heatmap[d][h] > 0 && (!peak || heatmap[d][h] > peak.count)) peak = { day: d, hour: h, count: heatmap[d][h] };

  // Longest run of consecutive local dates with at least one play.
  let longestStreak: WatchStats["longestStreak"] = null;
  if (days.size) {
    const sorted = [...days].sort((a, b) => a - b);
    let bestStart = sorted[0], bestLen = 1, curStart = sorted[0], curLen = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) curLen++;
      else { curStart = sorted[i]; curLen = 1; }
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
    }
    longestStreak = { days: bestLen, start: dayNumberToIso(bestStart), end: dayNumberToIso(bestStart + bestLen - 1) };
  }

  const rangeDays = end > start ? clock.dayNumber(end - 1) - clock.dayNumber(start) + 1 : 0;
  const totalPlays = totalVideos + totalSongs;

  let favoriteVideo: WatchStats["favoriteVideo"] = null;
  for (const v of videos.values()) {
    if (!v.title) continue;
    if (!favoriteVideo || v.count > favoriteVideo.count || (v.count === favoriteVideo.count && v.videoId < favoriteVideo.videoId)) {
      favoriteVideo = { videoId: v.videoId, title: v.title, channelName: v.channelName, count: v.count };
    }
  }

  const uniqueVideoIds = [...plays.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([id]) => id);

  return {
    timeZone,
    range: { type: range.type, start: new Date(start), end: new Date(end), days: rangeDays },
    totalVideos,
    totalSongs,
    totalPlays,
    adsExcluded,
    unavailableVideos,
    shortsWatched,
    timeBasis,
    avgVideosPerDay: rangeDays ? timeEvents / rangeDays : 0,
    avgPlaysPerDay: rangeDays ? totalPlays / rangeDays : 0,
    topCreators: topEntries(mergeByName(creators), topN, (c) => c.name),
    favoriteVideo,
    topArtists: topEntries(artists, topN, (a) => a.name),
    topSongs: topEntries(songs, topN, (s) => s.title).map((s) => ({ videoId: s.videoId, title: s.title, artist: s.artist, count: s.count })),
    monthly,
    monthOfYear,
    busiestMonth,
    heatmap,
    hourOfDay,
    dayOfWeek,
    peak,
    peakHourBadge: peakHourBadge(hourOfDay),
    longestStreak,
    totalSearches,
    topSearches: topEntries(searches, topSearchesN, (s) => s.query),
    uniqueVideoIds,
    playCountsById: Object.fromEntries(plays),
    videoPlays: [...videoPlays.values()],
    channels: Object.fromEntries([...creators].map(([k, c]) => [k, c.url ? { name: c.name, url: c.url } : { name: c.name }])),
  };
}
