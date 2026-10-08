"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PeriodPill, StoryPlayer, planSlides, useHydrated, useStoryStats, type SlideKind, type StorySlide } from "@/components/story";
import { en } from "@/copy/en";
import { badgeName, fill, fillNodes, periodVariant, type PeriodVariant } from "@/copy/format";
import type { WatchStats } from "@/lib/takeout/stats";
import { buildDurationSample, estimateWatchTime, type WatchTimeEstimate } from "@/lib/takeout/watchTime";
import { fakeDurations, makeDemoEvents } from "./demo-data";

const DEMO_SLIDES: SlideKind[] = [
  "total-videos",
  "watch-time",
  "top-creators",
  "favorite-video",
  "busiest-month",
  "peak-hour-badge",
  "top-songs",
  "share",
];

const S = en.slides;
const num = (n: number) => n.toLocaleString("en-US");
const monthName = (month: number) => new Date(Date.UTC(2000, month - 1, 15)).toLocaleString("en-US", { month: "long", timeZone: "UTC" });

/** Small tap-to-reveal tooltip; a button, so the story player ignores taps on it. */
function InfoChip({ label, text, testId }: { label: string; text: string; testId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex flex-col items-start gap-2">
      <button
        type="button"
        className="rounded-full bg-(--story-pill-bg) px-3 py-1 text-xs"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        data-testid={testId}
      >
        {label} ⓘ
      </button>
      {open && <span role="note" className="max-w-72 rounded-lg bg-(--story-menu-bg) p-3 text-xs text-(--story-menu-fg)">{text}</span>}
    </span>
  );
}

/** Placeholder layouts only (visual direction not chosen); all words come from src/copy/en.ts. */
function renderSlide(kind: SlideKind, s: WatchStats, wt: WatchTimeEstimate | null, period: PeriodVariant) {
  const wrap = (children: ReactNode) => <div className="flex flex-1 flex-col justify-center gap-4 px-6 pb-16">{children}</div>;
  switch (kind) {
    case "total-videos":
      return wrap(
        <>
          <h2 className="text-3xl font-bold">{fill(S.totalVideos.headline, { n: num(s.totalVideos) })}</h2>
          <p className="text-(--story-muted)">{fill(S.totalVideos.sub, { perDay: s.avgVideosPerDay.toFixed(1) })}</p>
          {!wt && <InfoChip label="⏱" text={S.watchTime.unavailableTooltip} testId="watch-time-unavailable" />}
        </>,
      );
    case "watch-time": {
      const secs = wt?.seconds ?? 0;
      return wrap(
        <>
          <h2 className="text-3xl font-bold">{fill(S.watchTime.headline, { hours: num(Math.round(secs / 3600)) })}</h2>
          <p className="text-(--story-muted)">{fill(S.watchTime.sub, { days: num(Math.floor(secs / 86400)) })}</p>
          <InfoChip label={S.watchTime.chip} text={S.watchTime.chipExplainer} />
        </>,
      );
    }
    case "top-creators":
      return wrap(
        <>
          <h2 className="text-2xl font-bold">{S.topCreators.headline}</h2>
          <ol className="space-y-2">
            {s.topCreators.map((c, i) => (
              <li key={c.url ?? c.name} className="flex items-baseline gap-3">
                <span className="w-5 shrink-0 text-(--story-accent)">{i + 1}</span>
                <span className="clamp-name min-w-0 flex-1">{c.name}</span>
                <span className="shrink-0 text-(--story-muted)">{fill(S.topCreators.item, { n: num(c.count) })}</span>
              </li>
            ))}
          </ol>
        </>,
      );
    case "favorite-video":
      return wrap(
        <>
          <h2 className="text-2xl font-bold">{S.favoriteVideo.headline}</h2>
          <p className="text-xl">
            {fillNodes(S.favoriteVideo.sub, {
              title: <span className="clamp-title">{s.favoriteVideo?.title}</span>,
              n: num(s.favoriteVideo?.count ?? 0),
            })}
          </p>
        </>,
      );
    case "busiest-month": {
      const b = s.busiestMonth!;
      return wrap(
        <>
          <h2 className="text-3xl font-bold">{fill(S.busiestMonth.headline[period], { month: monthName(b.month), year: b.year })}</h2>
          <p className="text-(--story-muted)">{fill(S.busiestMonth.sub, { n: num(b.count) })}</p>
        </>,
      );
    }
    case "peak-hour-badge": {
      const p = s.peakHourBadge!;
      const name = badgeName(p.badge);
      return wrap(
        <>
          <p className="text-sm uppercase tracking-wide text-(--story-muted)">{S.primeTime.peakLabel}</p>
          <h2 className="text-3xl font-bold">{name}</h2>
          <p className="text-(--story-muted)">{fill(S.primeTime.badgeShare, { badge: name, pct: p.pct })}</p>
        </>,
      );
    }
    case "top-songs":
      return wrap(
        <>
          <h2 className="text-2xl font-bold">{S.topSongs.headline}</h2>
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
    case "share": {
      const year = s.range.type === "calendarYear" ? new Date(s.range.end.getTime() - 1).getUTCFullYear() : "";
      return wrap(
        <>
          <p className="self-start -rotate-6 rounded border-2 border-(--story-accent) px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-(--story-accent)" data-testid="share-stamp">
            {en.appName}
          </p>
          <h2 className="text-3xl font-bold">{fill(S.share.headline[period], { year })}</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <button type="button" className="rounded-full bg-(--story-fg) px-4 py-2 text-(--story-bg)">{S.share.saveStory}</button>
            <button type="button" className="rounded-full bg-(--story-pill-bg) px-4 py-2">{S.share.saveSquare}</button>
            <button type="button" className="rounded-full px-4 py-2 underline">{S.share.startOver}</button>
          </div>
          <p className="text-xs text-(--story-muted)">{en.disclaimer}</p>
        </>,
      );
    }
    default:
      return wrap(<h2 className="text-2xl font-bold">{kind}</h2>);
  }
}

function Story() {
  const events = useMemo(() => makeDemoEvents(), []);
  const { stats, range, setRange, periodLabel, periodOptions } = useStoryStats(events);
  const [durationsOk, setDurationsOk] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const period = periodVariant(range);

  const watchTime = useMemo(() => {
    if (!durationsOk) return null;
    const sample = buildDurationSample(stats, { cap: 2000, seed: 1 });
    return estimateWatchTime(fakeDurations(sample.ids), stats.playCountsById, sample);
  }, [stats, durationsOk]);

  const slides: StorySlide[] = planSlides(stats, { watchTime, only: DEMO_SLIDES }).map((kind) => ({
    id: kind,
    label: kind,
    content: renderSlide(kind, stats, watchTime, period),
  }));

  return (
    <div className="flex flex-col items-center gap-3">
      <StoryPlayer
        slides={slides}
        paused={menuOpen}
        header={<PeriodPill range={range} label={periodLabel} options={periodOptions} onChange={setRange} onOpenChange={setMenuOpen} />}
      />
      <label className="flex items-center gap-2 text-xs text-neutral-300">
        <input type="checkbox" checked={!durationsOk} onChange={(e) => setDurationsOk(!e.target.checked)} />
        Demo only: simulate the durations endpoint returning nothing
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
