/**
 * Which story slides to show for a given stats object. Pure + testable.
 * Order follows the Copywriter's numbering (landing/upload/crunching are not story slides).
 */
import type { WatchStats } from "@/lib/takeout/stats";
import type { WatchTimeEstimate } from "@/lib/takeout/watchTime";

export type SlideKind =
  | "total-videos" // 4
  | "watch-time" // 5
  | "top-creator" // 6
  | "top-creators" // 7
  | "favorite-video" // 8
  | "busiest-month" // 9
  | "peak-time" // 10
  | "peak-hour-badge"
  | "streak" // 11
  | "top-searches" // 12
  | "music-total" // 13
  | "top-songs" // 14
  | "share"; // 15

export const ALL_SLIDES: readonly SlideKind[] = [
  "total-videos",
  "watch-time",
  "top-creator",
  "top-creators",
  "favorite-video",
  "busiest-month",
  "peak-time",
  "peak-hour-badge",
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
  /** Restrict to (and order by) this subset, e.g. for the demo. */
  only?: readonly SlideKind[];
}

export function planSlides(stats: PlanStats, opts: PlanOptions = {}): SlideKind[] {
  const has: Record<SlideKind, boolean> = {
    "total-videos": stats.totalVideos > 0,
    "watch-time": opts.watchTime != null,
    "top-creator": stats.topCreators.length > 0,
    "top-creators": stats.topCreators.length > 1,
    "favorite-video": !!stats.favoriteVideo && stats.favoriteVideo.count >= 2,
    "busiest-month": !!stats.busiestMonth,
    "peak-time": !!stats.peak,
    "peak-hour-badge": !!stats.peakHourBadge,
    streak: !!stats.longestStreak && stats.longestStreak.days >= 2,
    "top-searches": stats.topSearches.length > 0,
    "music-total": stats.totalSongs > 0,
    "top-songs": stats.totalSongs > 0 && stats.topSongs.length > 0,
    share: true,
  };
  const order = opts.only ?? ALL_SLIDES;
  return order.filter((k) => has[k]);
}
