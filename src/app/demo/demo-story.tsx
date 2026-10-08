"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PeriodPill, StoryPlayer, planSlides, useHydrated, useStoryStats, type SlideKind, type StorySlide } from "@/components/story";
import type { WatchStats } from "@/lib/takeout/stats";
import { buildDurationSample, estimateWatchTime, type WatchTimeEstimate } from "@/lib/takeout/watchTime";
import { fakeDurations, makeDemoEvents } from "./demo-data";

const DEMO_SLIDES: SlideKind[] = ["total-videos", "watch-time", "top-creators", "favorite-video", "peak-hour-badge", "top-songs"];

const BADGE_LABEL: Record<string, string> = {
  "early-bird": "Early bird",
  "coffee-break": "Coffee-break watcher",
  "lunch-break": "Lunch-break binger",
  "afternoon-drifter": "Afternoon drifter",
  "evening-regular": "Evening regular",
  "night-owl": "Night owl",
};

/** Placeholder layouts only. Real slide designs come from Designer + Copywriter. */
function renderSlide(kind: SlideKind, s: WatchStats, wt: WatchTimeEstimate | null) {
  const wrap = (children: ReactNode) => (
    <div className="flex flex-1 flex-col justify-center gap-4 px-6 pb-10">{children}</div>
  );
  switch (kind) {
    case "total-videos":
      return wrap(
        <>
          <h2 className="text-3xl font-bold">You pressed play on {s.totalVideos.toLocaleString()} videos.</h2>
          <p className="text-(--story-muted)">That&apos;s about {s.avgVideosPerDay.toFixed(1)} a day.</p>
        </>,
      );
    case "watch-time":
      return wrap(
        <>
          <h2 className="text-3xl font-bold">≈ {Math.round((wt?.seconds ?? 0) / 3600).toLocaleString()} hours of watching.</h2>
          <p className="text-(--story-muted)">Estimate · {Math.round((wt?.coverage ?? 0) * 100)}% of plays looked up</p>
        </>,
      );
    case "top-creators":
      return wrap(
        <>
          <h2 className="text-2xl font-bold">Your top 5 creators</h2>
          <ol className="space-y-2">
            {s.topCreators.map((c, i) => (
              <li key={c.url ?? c.name} className="flex items-baseline gap-3">
                <span className="w-5 shrink-0 text-(--story-accent)">{i + 1}</span>
                <span className="clamp-name min-w-0 flex-1">{c.name}</span>
                <span className="shrink-0 text-(--story-muted)">{c.count}</span>
              </li>
            ))}
          </ol>
        </>,
      );
    case "favorite-video":
      return wrap(
        <>
          <h2 className="text-2xl font-bold">You couldn&apos;t stop rewatching this one.</h2>
          <p className="clamp-title text-xl">{s.favoriteVideo?.title}</p>
          <p className="text-(--story-muted)">watched {s.favoriteVideo?.count} times</p>
        </>,
      );
    case "peak-hour-badge":
      return wrap(
        <>
          <h2 className="text-3xl font-bold">{BADGE_LABEL[s.peakHourBadge!.badge]}</h2>
          <p className="text-(--story-muted)">{s.peakHourBadge!.pct}% of your plays happened in this window.</p>
        </>,
      );
    case "top-songs":
      return wrap(
        <>
          <h2 className="text-2xl font-bold">Your top 5 songs (on repeat)</h2>
          <ol className="space-y-2">
            {s.topSongs.map((t, i) => (
              <li key={t.videoId ?? t.title} className="flex items-baseline gap-3">
                <span className="w-5 shrink-0 text-(--story-accent)">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="clamp-title block">{t.title}</span>
                  <span className="clamp-name block text-sm text-(--story-muted)">{t.artist}</span>
                </span>
              </li>
            ))}
          </ol>
        </>,
      );
    default:
      return wrap(<h2 className="text-2xl font-bold">{kind}</h2>);
  }
}

function Story() {
  const events = useMemo(() => makeDemoEvents(), []);
  const { stats, range, setRange, years, timeZone } = useStoryStats(events);
  const [durationsOk, setDurationsOk] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const watchTime = useMemo(() => {
    if (!durationsOk) return null;
    const sample = buildDurationSample(stats, { cap: 2000, seed: 1 });
    return estimateWatchTime(fakeDurations(sample.ids), stats.playCountsById, sample);
  }, [stats, durationsOk]);

  const slides: StorySlide[] = planSlides(stats, { watchTime, only: DEMO_SLIDES }).map((kind) => ({
    id: kind,
    label: kind,
    content: renderSlide(kind, stats, watchTime),
  }));

  return (
    <div className="flex flex-col items-center gap-3">
      <StoryPlayer
        slides={slides}
        paused={menuOpen}
        header={
          <PeriodPill range={range} resolved={stats.range} years={years} timeZone={timeZone} onChange={setRange} onOpenChange={setMenuOpen} />
        }
      />
      <label className="flex items-center gap-2 text-xs text-neutral-300">
        <input type="checkbox" checked={!durationsOk} onChange={(e) => setDurationsOk(!e.target.checked)} />
        Simulate the durations endpoint returning nothing (drops the watch-time slide)
      </label>
    </div>
  );
}

export function DemoStory() {
  // Timezone-dependent output: render only in the browser to avoid hydration mismatches.
  const hydrated = useHydrated();
  if (!hydrated) return <div className="story-frame bg-(--story-bg)" aria-busy="true" />;
  return <Story />;
}
