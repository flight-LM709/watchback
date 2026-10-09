"use client";

import { useCallback, useMemo, useState } from "react";
import { BottomSheet, CassetteIcon, Lock } from "@/components/paper";
import { PeriodPill, StoryPlayer, planSlides, useStoryStats, type StorySlide } from "@/components/story";
import { en } from "@/copy/en";
import { periodVariant } from "@/copy/format";
import type { DateRange, WatchStats } from "@/lib/takeout/stats";
import type { ShortsSplitEstimate } from "@/lib/takeout/shortsSplit";
import type { TakeoutEvent } from "@/lib/takeout/types";
import type { WatchTimeEstimate } from "@/lib/takeout/watchTime";
import { fetchThumbnail, type ThumbLoader } from "@/lib/thumb/client";
import { ShareSlide } from "./share";
import { SlideView, shortsChipExplainer, slideHeadline, type SlideContext } from "./slides";
import { useThumbnailCache } from "./useThumbnailCache";

export interface WatchbackStoryProps {
  events: TakeoutEvent[];
  timeZone?: string;
  initialRange?: DateRange;
  /** Watch-time estimate for the current stats, or null to drop slide 2. */
  watchTimeFor: (stats: WatchStats) => WatchTimeEstimate | null;
  /** Shorts vs long-form estimate for the current stats; null (or omitted) drops both Shorts slides. */
  shortsSplitFor?: (stats: WatchStats) => ShortsSplitEstimate | null;
  /** Favorite-video thumbnail loader. Default: POST /api/thumb. */
  thumbLoader?: ThumbLoader;
  /** ✕ and Start over. */
  onExit?: () => void;
  /** Host shown in the share-card footer. */
  host?: string;
}

/** Brand row: cassette icon + app name (Fraunces italic). */
export function Brand() {
  return (
    <span className="flex items-center gap-2 font-serif text-[19px] font-bold italic">
      <CassetteIcon />
      {en.appName}
    </span>
  );
}

const noSplit = () => null;

/** The whole Paper Mixtape story: period pill + sheet, 14 slides, explainer sheets, share images. */
export function WatchbackStory({ events, timeZone, initialRange, watchTimeFor, shortsSplitFor = noSplit, thumbLoader = fetchThumbnail, onExit, host = "" }: WatchbackStoryProps) {
  const { stats, range, setRange, periodLabel, periodOptions } = useStoryStats(events, { timeZone, initialRange });
  const watchTime = useMemo(() => watchTimeFor(stats), [stats, watchTimeFor]);
  const shortsSplit = useMemo(() => shortsSplitFor(stats), [stats, shortsSplitFor]);
  // Held at story level: survives the favorite slide unmounting and period switches; revoked when the story unmounts.
  const thumb = useThumbnailCache(stats.favoriteVideo?.videoId, thumbLoader);
  const [menuOpen, setMenuOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const period = periodVariant(range);
  const openExplainer = useCallback(() => setExplainerOpen(true), []);
  const explainerId = "watch-time-explainer";
  const [shortsExplainerOpen, setShortsExplainerOpen] = useState(false);
  const openShortsExplainer = useCallback(() => setShortsExplainerOpen(true), []);
  const shortsExplainerId = "shorts-explainer";

  const share = (
    <ShareSlide stats={stats} watchTime={watchTime} period={period} periodLabel={periodLabel} host={host} onExportingChange={setExporting} onStartOver={onExit} />
  );
  const ctx: SlideContext = {
    stats, watchTime, period, periodLabel, thumb, openExplainer, explainerOpen, explainerId, share,
    shortsSplit, openShortsExplainer, shortsExplainerOpen, shortsExplainerId,
  };

  const slides: StorySlide[] = planSlides(stats, { watchTime, shortsSplit }).map((kind) => ({
    id: kind,
    label: slideHeadline(kind, ctx),
    content: <SlideView kind={kind} ctx={ctx} />,
    durationMs: kind === "share" ? 20000 : kind === "prime-time" || kind === "top-creators" || kind === "shorts-vs-long" || kind === "creators-by-format" ? 8000 : 6500,
    bare: kind === "share",
  }));

  return (
    <>
      <StoryPlayer
        slides={slides}
        paused={menuOpen || explainerOpen || shortsExplainerOpen || exporting}
        brand={<Brand />}
        onClose={onExit}
        header={<PeriodPill range={range} label={periodLabel} options={periodOptions} onChange={setRange} onOpenChange={setMenuOpen} />}
      />
      <BottomSheet open={explainerOpen} onClose={() => setExplainerOpen(false)} title={en.slides.watchTime.chip} closeLabel={en.periodSheet.close}>
        <div id={explainerId}>
          <p className="font-serif text-body leading-relaxed">{en.slides.watchTime.chipExplainer}</p>
          <p className="mt-4 flex items-center gap-2 font-serif text-[15px] font-semibold text-teal">
            <Lock className="size-4" />
            {en.landing.privacyLine}
          </p>
        </div>
      </BottomSheet>
      <BottomSheet open={shortsExplainerOpen} onClose={() => setShortsExplainerOpen(false)} title={en.slides.shortsVsLong.chip} closeLabel={en.periodSheet.close}>
        <div id={shortsExplainerId}>
          <p className="font-serif text-body leading-relaxed">{shortsChipExplainer(shortsSplit)}</p>
          <p className="mt-4 flex items-center gap-2 font-serif text-[15px] font-semibold text-teal">
            <Lock className="size-4" />
            {en.landing.privacyLine}
          </p>
        </div>
      </BottomSheet>
    </>
  );
}
