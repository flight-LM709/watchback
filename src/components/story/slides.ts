/**
 * Which story slides to show for a given stats object. Pure + testable.
 * Order and count follow design/SPEC.md §3: 14 slides when everything is present.
 * The peak-hour badge lives on the prime-time slide (there's no separate badge slide).
 */
import type { WatchStats } from "@/lib/takeout/stats";
import { shortsSlides, type ShortsSplitEstimate } from "@/lib/takeout/shortsSplit";
import type { WatchTimeEstimate } from "@/lib/takeout/watchTime";

export type SlideKind =
  | "total-videos" // 1  02-big-number
  | "watch-time" // 2  05b-watch-time
  | "shorts-vs-long" // 3  16-shorts-vs-long
  | "creators-by-format" // 4  17-creators-by-format
  | "top-creator" // 5  03-top-creator
  | "top-creators" // 6  06b-top5-creators
  | "favorite-video" // 7  07-favorite-video
  | "busiest-month" // 8  08-busiest-month
  | "prime-time" // 9  04-prime-time (heatmap + peak-hour badge)
  | "streak" // 10 09-streak
  | "top-searches" // 11 10-top-searches
  | "music-total" // 12 11-music-total
  | "top-songs" // 13 12-top5-songs
  | "share"; // 14 05-share-card

export const ALL_SLIDES: readonly SlideKind[] = [
  "total-videos",
  "watch-time",
  "shorts-vs-long",
  "creators-by-format",
  "top-creator",
  "top-creators",
  "favorite-video",
  "busiest-month",
  "prime-time",
  "streak",
  "top-searches",
  "music-total",
  "top-songs",
  "share",
];

export const MUSIC_SLIDES: ReadonlySet<SlideKind> = new Set(["music-total", "top-songs"]);

type PlanStats = Pick<
  WatchStats,
  "totalVideos" | "totalSongs" | "topCreators" | "favoriteVideo" | "busiestMonth" | "peak" | "peakHourBadge" | "longestStreak" | "topSearches" | "topSongs"
>;

export interface PlanOptions {
  /** Result of estimateWatchTime(); null/undefined drops the watch-time slide. */
  watchTime?: WatchTimeEstimate | null;
  /**
   * Result of estimateShortsSplit(). null/undefined (durations or isShort unavailable) drops both
   * Shorts slides; zero Shorts keeps shorts-vs-long (noShorts copy) and drops creators-by-format.
   */
  shortsSplit?: ShortsSplitEstimate | null;
  /** Restrict to (and order by) this subset. */
  only?: readonly SlideKind[];
}

export function planSlides(stats: PlanStats, opts: PlanOptions = {}): SlideKind[] {
  const has: Record<SlideKind, boolean> = {
    "total-videos": stats.totalVideos > 0,
    "watch-time": opts.watchTime != null,
    "shorts-vs-long": shortsSlides(opts.shortsSplit).shortsVsLong,
    "creators-by-format": shortsSlides(opts.shortsSplit).creatorsByFormat,
    "top-creator": stats.topCreators.length > 0,
    "top-creators": stats.topCreators.length > 1,
    "favorite-video": !!stats.favoriteVideo && stats.favoriteVideo.count >= 2,
    "busiest-month": !!stats.busiestMonth,
    "prime-time": !!stats.peak && !!stats.peakHourBadge,
    streak: !!stats.longestStreak && stats.longestStreak.days >= 2,
    "top-searches": stats.topSearches.length > 0,
    "music-total": stats.totalSongs > 0,
    "top-songs": stats.totalSongs > 0 && stats.topSongs.length > 0,
    share: true,
  };
  const order = opts.only ?? ALL_SLIDES;
  return order.filter((k) => has[k]);
}
