"use client";

import type { ReactNode } from "react";
import { EstimateChip, ExactCaption, HandCircle, HeroNumber, MonogramSticker, NoBreakHyphens, Sparkle, Star, Sticker, TapeStrip, Underline, VHSLabel, Arrow, Lock, fitCounter, plainHyphens } from "@/components/paper";
import type { SlideKind } from "@/components/story/slides";
import { en } from "@/copy/en";
import { badgeDetail, badgeName, badgeShareLine, fill, fillNodes, peakValue, primeTimeHeadline, type PeriodVariant } from "@/copy/format";
import type { PeakHourBadge, PeakHourBadgeResult, WatchStats } from "@/lib/takeout/stats";
import { splitTimeDisplay, type ShortsSplitEstimate, type ShortsSplitSide } from "@/lib/takeout/shortsSplit";
import type { WatchTimeEstimate } from "@/lib/takeout/watchTime";
import { BarChart, Cassette, Heatmap, StreakCalendar, chartMonths, streakMonths } from "./charts";
import { hourLabel, monthName, num, perDay, shortDate, songDisplayTitle, splitAround, tzLabel } from "./fmt";
import type { ThumbState } from "./useThumbnailCache";
import { VideoThumb } from "./VideoThumb";

const S = en.slides;

export interface SlideContext {
  stats: WatchStats;
  watchTime: WatchTimeEstimate | null;
  period: PeriodVariant;
  periodLabel: string;
  thumb: ThumbState | null;
  openExplainer: () => void;
  explainerOpen: boolean;
  explainerId: string;
  share: ReactNode;
  /** Shorts vs long-form estimate (slides 3–4); absent/null means those slides aren't planned. */
  shortsSplit?: ShortsSplitEstimate | null;
  /** Opens the Shorts estimate sheet (`shortsVsLong.chipExplainer`). */
  openShortsExplainer?: () => void;
  shortsExplainerOpen?: boolean;
  shortsExplainerId?: string;
}

const SV = S.shortsVsLong;
const TC = S.topCreatorsSplit;

/**
 * Visible time line for one side of the split, from splitTimeDisplay() (Project Lead's rule, both sides):
 *   unknown (null) or 0 s → null (the card shows an em dash for unknown, nothing for 0) · "under a minute" ·
 *   "≈ 1 minute" · "≈ {minutes} minutes" · "≈ 1 hour" · "≈ {hours} hours" (59.6 min → "≈ 1 hour", never "≈ 0 hours").
 */
export function splitTimeText(seconds: number | null): string | null {
  const d = splitTimeDisplay(seconds);
  switch (d.unit) {
    case "unknown":
    case "none":
      return null;
    case "under":
      return SV.timeUnderMinute;
    case "minutes":
      return d.n === 1 ? SV.timeOneMinute : fill(SV.timeMinutes, { minutes: d.n });
    case "hours":
      return d.n === 1 ? SV.timeOne : fill(SV.time, { hours: num(d.n) });
  }
}

/**
 * Spoken time for the screen-reader summary (`aria*` keys, never the visible "≈" strings), same rounding.
 * 0 s (a side with no plays) reads "about 0 minutes" so the sentence stays complete.
 */
export function splitTimeAria(seconds: number | null): string {
  const d = splitTimeDisplay(seconds);
  switch (d.unit) {
    case "unknown":
      return SV.ariaTimeUnknown;
    case "none":
      return fill(SV.ariaMinutes, { minutes: 0 });
    case "under":
      return SV.ariaUnderMinute;
    case "minutes":
      return d.n === 1 ? SV.ariaMinuteOne : fill(SV.ariaMinutes, { minutes: d.n });
    case "hours":
      return d.n === 1 ? SV.ariaHourOne : fill(SV.ariaHours, { hours: num(d.n) });
  }
}

/** Spoken count: "about 1 video" when the DISPLAYED (rounded) count is 1, else "about {n} videos". */
export const splitCountAria = (n: number) => (Math.round(n) === 1 ? SV.ariaCountOne : fill(SV.ariaCount, { n: num(n) }));

/** Text after the number in a "≈ {n} videos" template, singular when the DISPLAYED (rounded) count is 1. */
function unitAfter(n: number, many: string, one: string): string {
  if (Math.round(n) === 1) return one.split(/\b1\b/)[1]?.trim() ?? "";
  return splitAround(many, "n")[1].trim();
}
/** "≈ 391 videos" / "≈ 1 video". */
export const itemText = (n: number) => (Math.round(n) === 1 ? TC.itemOne : fill(TC.item, { n: num(n) }));

/** shortsVsLong.aria filled with the spoken forms ("Shorts: about 1 video, under a minute. Long‑form: …"). */
export function shortsAria(split: Pick<ShortsSplitEstimate, "shorts" | "long">): string {
  return fill(SV.aria, {
    shortsCount: splitCountAria(split.shorts.count),
    shortsTime: splitTimeAria(split.shorts.seconds),
    longCount: splitCountAria(split.long.count),
    longTime: splitTimeAria(split.long.seconds),
  });
}

/** Accessible name per slide (also the headline for screen readers). */
export function slideHeadline(kind: SlideKind, ctx: SlideContext): string {
  const s = ctx.stats;
  switch (kind) {
    case "total-videos":
      return fill(S.totalVideos.headline, { n: num(s.totalVideos) });
    case "watch-time":
      return fill(S.watchTime.headline, { hours: num((ctx.watchTime?.seconds ?? 0) / 3600) });
    case "shorts-vs-long":
      return ctx.shortsSplit && !ctx.shortsSplit.noShorts ? `${SV.headline} ${plainHyphens(shortsAria(ctx.shortsSplit))}` : `${SV.headline} ${plainHyphens(SV.noShorts)}`;
    case "creators-by-format":
      return plainHyphens(TC.headline);
    case "top-creator":
      return fill(S.topCreator.headline, { creator: s.topCreators[0]?.name ?? "" });
    case "top-creators":
      return S.topCreators.headline;
    case "favorite-video":
      return S.favoriteVideo.headline;
    case "busiest-month":
      return fill(S.busiestMonth.headline[ctx.period], { month: monthName(s.busiestMonth?.month ?? 1), year: s.busiestMonth?.year ?? "" });
    case "prime-time":
      return primeTimeHeadline(s.peak?.day ?? 0, hourLabel(s.peak?.hour ?? 0));
    case "streak":
      return fill(S.bingeStreak.headline, { n: num(s.longestStreak?.days ?? 0) });
    case "top-searches":
      return S.topSearches.headline;
    case "music-total":
      return fill(S.music.headline, { n: num(s.totalSongs) });
    case "top-songs":
      return S.topSongs.headline;
    case "share":
      return fill(S.share.headline[ctx.period], { year: shareYear(s) });
  }
}

export const shareYear = (s: WatchStats) => (s.range.type === "calendarYear" ? new Date(s.range.end.getTime() - 1).getUTCFullYear() : "");

const Headline = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <h2 className={`font-serif text-headline font-semibold tracking-[-0.02em] [text-wrap:balance] ${className}`}>{children}</h2>
);
const SrHeadline = ({ children }: { children: ReactNode }) => <h2 className="sr-only">{children}</h2>;
const Italic = ({ children, className = "" }: { children: ReactNode; className?: string }) => <span className={`font-serif italic ${className}`}>{children}</span>;

/** Mark the part after the last comma (e.g. "…, in heavy rotation") with a tomato italic + hand underline. */
function underlineTail(text: string): ReactNode {
  const i = text.lastIndexOf(", ");
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i + 2)}
      <span className="relative inline-block italic text-tomato">
        {text.slice(i + 2)}
        <Underline className="absolute -bottom-1.5 left-0 h-2.5 w-full" />
      </span>
    </>
  );
}

/** Inner width of a VHS label that bleeds 8px past the slide padding, on a 360px screen. */
const VHS_INNER = 308;

const Wrap = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rise relative flex min-h-0 flex-1 flex-col px-6 pb-20 ${className}`}>{children}</div>
);

function TotalVideos({ ctx }: { ctx: SlideContext }) {
  const s = ctx.stats;
  const [before, after] = splitAround(S.totalVideos.headline, "n");
  return (
    <Wrap className="pt-10">
      <SrHeadline>{slideHeadline("total-videos", ctx)}</SrHeadline>
      <p aria-hidden="true" className="font-serif text-headline font-semibold tracking-[-0.02em]">{before.trim()}</p>
      <div aria-hidden="true" className="relative -mx-2 mt-5">
        <TapeStrip className="-left-3 -top-3" angle={-24} />
        <TapeStrip variant="clear" className="-right-3 -top-2" angle={24} />
        <VHSLabel left={en.deco.vhsLabel} right={`● ${en.deco.vhsRec}`}>
          <HeroNumber value={s.totalVideos} size={100} maxWidth={VHS_INNER} />
        </VHSLabel>
      </div>
      <p aria-hidden="true" className="mt-4 self-end font-serif text-[32px] font-semibold italic">{after.trim()}</p>
      <Sticker tone="mustard" rotate={1.5} className="mt-7 self-start px-4 py-3 font-serif text-title font-semibold">
        {fillNodes(S.totalVideos.sub, { perDay: <span className="font-mono font-bold">{perDay(s.avgVideosPerDay)}</span> })}
      </Sticker>
      <Sparkle className="absolute bottom-24 left-6 size-7 text-teal" />
      <Sparkle className="absolute bottom-40 right-10 size-4 text-tomato" />
    </Wrap>
  );
}

function WatchTime({ ctx }: { ctx: SlideContext }) {
  const hours = Math.round((ctx.watchTime?.seconds ?? 0) / 3600);
  const days = Math.floor((ctx.watchTime?.seconds ?? 0) / 86400);
  const [before, after] = splitAround(S.watchTime.headline, "hours");
  // At most 4 digit boxes fit at 360px; beyond that the counter shows "12.4K" and an exact caption.
  const counter = fitCounter(hours);
  const groups = counter.text;
  return (
    <Wrap className="pt-12">
      <SrHeadline>{slideHeadline("watch-time", ctx)}</SrHeadline>
      <div aria-hidden="true" className="flex items-center gap-1.5">
        <span className="font-mono text-[56px] font-bold leading-none text-tomato">{before.trim()}</span>
        {/* Tape counter: each digit in a 58×112 paper box with a 96px digit, flipping in 60ms apart. */}
        <span className="flex min-w-0 items-end gap-1" data-hero-px={96}>
          {[...groups].map((ch, i) =>
            ch === "," || ch === "." ? (
              <span key={i} className="-mx-0.5 font-mono text-[40px] font-bold leading-none">,</span>
            ) : (
              <span key={i} className="relative grid h-[112px] min-w-0 max-w-[62px] flex-1 basis-[62px] place-items-center overflow-hidden rounded-[6px] border-2 border-ink bg-paper-2 shadow-chip">
                <span className="hero-num flip-in text-[96px]" style={{ animationDelay: `${i * 60}ms`, letterSpacing: 0 }}>{ch}</span>
                <span className="absolute inset-x-0 top-1/2 h-px bg-ink/25" />
              </span>
            ),
          )}
        </span>
      </div>
      {counter.abbreviated && <ExactCaption exact={counter.exact} className="ml-[42px]" />}
      <p aria-hidden="true" className="mt-4 font-serif text-[32px] font-semibold italic leading-tight">{after.trim()}</p>
      <div className="mt-3">
        <EstimateChip label={S.watchTime.chip} onClick={ctx.openExplainer} expanded={ctx.explainerOpen} controls={ctx.explainerId} />
      </div>
      <Sticker tone="mustard" rotate={-1.5} className="mt-5 self-start px-4 py-3 font-serif text-title font-semibold">
        {fillNodes(S.watchTime.sub, { days: <span className="font-mono font-bold">{num(days)}</span> })}
      </Sticker>
      <Star className="absolute bottom-36 right-8 size-9 text-mustard" />
      <Sparkle className="absolute bottom-24 left-8 size-4 text-tomato" />
    </Wrap>
  );
}

function TopCreator({ ctx }: { ctx: SlideContext }) {
  const c = ctx.stats.topCreators[0];
  const [before, after] = splitAround(S.topCreator.headline, "creator");
  const words = before.trim().split(" ");
  const lastWord = words.pop();
  const [, subAfter] = splitAround(S.topCreator.sub, "n");
  return (
    <Wrap className="items-center pt-3 text-center">
      <SrHeadline>{slideHeadline("top-creator", ctx)}</SrHeadline>
      <p aria-hidden="true" className="font-serif text-headline font-semibold tracking-[-0.02em]">
        {words.join(" ")} <Italic>{lastWord}</Italic>
      </p>
      <div className="relative mt-4 grid place-items-center">
        <MonogramSticker name={c.name} size={176} tape />
        <HandCircle className="-inset-x-7 -inset-y-5" />
        <span aria-hidden="true" className="absolute -right-9 -top-3 grid size-[72px] rotate-12 place-items-center">
          <Star className="absolute inset-0 size-full text-mustard" />
          <span className="relative font-mono text-[15px] font-bold text-ink">{S.topCreator.rankSticker}</span>
        </span>
      </div>
      <p aria-hidden="true" className="mt-5 flex w-full min-w-0 justify-center font-serif text-[32px] font-bold leading-tight tracking-[-0.02em]">
        <span className="clamp-name">{c.name}</span>
        <span>{after}</span>
      </p>
      <div className="relative mt-4 w-[calc(100%+16px)]">
        <TapeStrip className="-left-3 -top-2" angle={-22} />
        <TapeStrip variant="clear" className="-bottom-2 -right-3" angle={-18} />
        <VHSLabel rotate={-2}>
          <HeroNumber value={c.count} size={120} maxWidth={VHS_INNER} className="text-tomato" />
        </VHSLabel>
      </div>
      <p className="relative mt-5 font-serif text-[22px] font-semibold italic">
        <span className="sr-only">{fill(S.topCreator.sub, { n: num(c.count) })}</span>
        <span aria-hidden="true">{subAfter.trim()}</span>
        <Underline className="absolute -bottom-2 left-[8%] h-3 w-[84%]" />
      </p>
      <Sparkle className="absolute left-5 top-28 size-6 text-mustard" />
      <Sparkle className="absolute right-10 top-64 size-3.5 text-tomato" />
      <Arrow className="absolute left-7 top-[300px] size-6 text-tomato" />
      <Star className="absolute bottom-16 right-8 size-8 text-teal" />
    </Wrap>
  );
}

function TopCreators({ ctx }: { ctx: SlideContext }) {
  const list = ctx.stats.topCreators.slice(0, 5);
  const max = Math.max(1, ...list.map((c) => c.count));
  return (
    <Wrap className="pt-4">
      <Headline>{underlineTail(S.topCreators.headline)}</Headline>
      <Sticker rotate={-1} className="mt-6 overflow-hidden">
        <TapeStrip className="-left-4 -top-2" angle={-28} />
        <ol>
          {list.map((c, i) => {
            const first = i === 0;
            return (
              <li key={c.url ?? c.name} className={`flex items-center gap-3 px-3.5 py-2.5 ${first ? "border-b-2 border-ink bg-mustard" : "border-b border-dashed border-rule last:border-b-0"}`}>
                <span className={`w-6 shrink-0 font-mono text-[13px] font-bold ${first ? "text-ink" : "text-tomato"}`}>{String(i + 1).padStart(2, "0")}</span>
                <span aria-hidden="true" className="shrink-0">
                  <MonogramSticker name={c.name} size={first ? 52 : 40} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`clamp-name font-serif ${first ? "text-[19px] font-bold" : "text-[17px] font-semibold"}`}>{c.name}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className={`block h-2 rounded-sm border border-ink ${first ? "bg-ink" : "bg-mustard"}`} style={{ width: `${Math.max(6, (c.count / max) * 62)}%` }} aria-hidden="true" />
                    <span className="shrink-0 font-mono text-[13px] font-bold">{fill(S.topCreators.item, { n: num(c.count) })}</span>
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </Sticker>
      <Star className="absolute bottom-20 left-8 size-7 text-tomato" />
    </Wrap>
  );
}

function FavoriteVideo({ ctx }: { ctx: SlideContext }) {
  const v = ctx.stats.favoriteVideo!;
  const [wBefore, wAfter] = splitAround(S.favoriteVideo.watchedTimes, "n");
  return (
    <Wrap className="pt-4">
      <Headline>{S.favoriteVideo.headline}</Headline>
      <Sticker rotate={-2} className="mt-6 p-3 pb-4">
        <TapeStrip className="left-1/2 -top-3 -ml-10" width={84} angle={-3} />
        <VideoThumb thumb={ctx.thumb} alt={fill(S.favoriteVideo.thumbAlt, { title: v.title })} />
        <p className="clamp-title mt-3 font-serif text-[19px] font-bold leading-snug">{fill(S.favoriteVideo.title, { title: v.title })}</p>
        {v.channelName && <p className="clamp-name mt-1 font-mono text-[12px] text-ink-2">{v.channelName}</p>}
        <Star className="absolute -bottom-5 -right-4 size-11 text-mustard" />
      </Sticker>
      <p className="mt-8 flex flex-wrap items-baseline justify-center gap-x-2">
        <span className="sr-only">{fill(S.favoriteVideo.watchedTimes, { n: num(v.count) })}</span>
        <Italic className="text-[28px] font-semibold">
          <span aria-hidden="true">{wBefore.trim()}</span>
        </Italic>
        <span aria-hidden="true"><HeroNumber value={v.count} size={120} className="text-tomato" /></span>
        <Italic className="text-[28px] font-semibold">
          <span aria-hidden="true">{wAfter.trim()}</span>
        </Italic>
      </p>
      <Sparkle className="absolute bottom-24 left-8 size-5 text-tomato" />
    </Wrap>
  );
}

function BusiestMonth({ ctx }: { ctx: SlideContext }) {
  const s = ctx.stats;
  const b = s.busiestMonth!;
  const [, subAfter] = splitAround(S.busiestMonth.sub, "n");
  const months = chartMonths(s.monthly, b, s.range.type === "allTime");
  return (
    <Wrap className="pt-4">
      <Headline>
        {fillNodes(S.busiestMonth.headline[ctx.period], {
          month: (
            <span className="relative inline-block italic text-tomato">
              {monthName(b.month)}
              <Underline className="absolute -bottom-1.5 left-0 h-2.5 w-full" />
            </span>
          ),
          year: b.year,
        })}
      </Headline>
      <p className="mt-5">
        <span className="sr-only">{fill(S.busiestMonth.sub, { n: num(b.count) })}</span>
        <span aria-hidden="true" className="block"><HeroNumber value={b.count} size={96} /></span>
        <Italic className="mt-1 block text-[22px] font-semibold"><span aria-hidden="true">{subAfter.trim()}</span></Italic>
      </p>
      <Sticker tone="grid" rotate={1} className="mt-6 px-4 pb-3 pt-4" style={{ backgroundImage: "linear-gradient(rgb(30 107 102 / .09) 1px, transparent 1px), linear-gradient(90deg, rgb(30 107 102 / .09) 1px, transparent 1px)", backgroundSize: "12px 12px" }}>
        <BarChart months={months} peakKey={b.key} />
      </Sticker>
      <Star className="absolute right-8 top-28 size-8 text-mustard" />
    </Wrap>
  );
}

const BADGE_ICON: Record<PeakHourBadge, string> = {
  "early-bird": "M12 4v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M17.7 6.3l-1.4 1.4M7 16a5 5 0 0 1 10 0z",
  "coffee-break": "M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 10h2a2 2 0 0 1 0 4h-2M8 4c0 1 1 1 1 2M12 4c0 1 1 1 1 2",
  "lunch-break": "M4 13h16a8 8 0 0 1-16 0zM9 9c0-2 6-2 6 0",
  "afternoon-drifter": "M12 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10zM12 2v2M12 20v2M2 12h2M20 12h2",
  "evening-regular": "M3 17h18M6 17a6 6 0 0 1 12 0M12 7v2",
  "night-owl": "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
};

/**
 * Badge sticker: icon on its own line, name at 22px (max two lines), detail under it.
 * Width: the longest unbreakable name word ("Coffee-break", ≈143px at 22px Fraunces 700) needs
 * ≥ 150px of text, so at 360px the row bleeds 8px past the slide padding and the badge column is
 * ≥ 178px (verified for all six names by /workspace/shot-tools/badges.mjs and /demo/badges).
 */
export function BadgeSticker({ badge, className = "" }: { badge: PeakHourBadgeResult; className?: string }) {
  const name = badgeName(badge.badge);
  return (
    <Sticker tone="mustard" rotate={1.2} className={`px-3 py-2.5 text-ink ${className}`}>
      <p className="sr-only" data-testid="badge-share">{plainHyphens(badgeShareLine(badge))}</p>
      <svg viewBox="0 0 24 24" className="block size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-testid="badge-icon">
        <path d={BADGE_ICON[badge.badge]} />
      </svg>
      <p aria-hidden="true" className="clamp-title mt-1 font-serif text-[22px] font-bold leading-[1.15]" data-testid="badge-name">
        <NoBreakHyphens text={name} />
      </p>
      <p aria-hidden="true" className="mt-1 font-serif text-[13px] italic leading-snug [text-wrap:balance]" data-testid="badge-detail">{badgeDetail(badge)}</p>
    </Sticker>
  );
}

/** Peak tile + badge sticker row under the heatmap. */
export function PrimeTimeTiles({ peak, badge, className = "" }: { peak: NonNullable<WatchStats["peak"]>; badge: PeakHourBadgeResult; className?: string }) {
  return (
    <div className={`-mx-2 grid grid-cols-[minmax(0,1fr)_minmax(178px,1.3fr)] items-start gap-3 ${className}`} data-testid="prime-tiles">
      <Sticker rotate={-1} className="px-3 py-2.5">
        <p className="font-mono text-label font-bold uppercase leading-tight tracking-[0.08em]">{S.primeTime.peakLabel}</p>
        <p className="mt-1.5 whitespace-nowrap font-mono text-[20px] font-bold leading-none tracking-[-0.04em]" data-testid="peak-value">{peakValue(peak.day, hourLabel(peak.hour))}</p>
        <p className="mt-1 font-hand text-[22px] font-bold leading-none">{fill(S.topCreators.item, { n: num(peak.count) })}</p>
      </Sticker>
      <BadgeSticker badge={badge} />
    </div>
  );
}

function PrimeTime({ ctx }: { ctx: SlideContext }) {
  const s = ctx.stats;
  const peak = s.peak!;
  const badge = s.peakHourBadge!;
  const hour = hourLabel(peak.hour);
  const [hourNum, hourAmPm = ""] = hour.split("\u00a0");
  const days = S.primeTime.daysPlural[peak.day];
  // "Prime time: {days} at {hour}." -> "Prime time:" / "{days} at" / "{hour}."
  const [line1] = splitAround(S.primeTime.headline, "days");
  const [beforeHour, afterHour] = splitAround(S.primeTime.headline, "hour", { days });
  const line2 = beforeHour.slice(line1.length);
  return (
    <Wrap className="pt-3">
      <SrHeadline>{slideHeadline("prime-time", ctx)}</SrHeadline>
      <div aria-hidden="true" className="leading-none">
        <p className="font-serif text-[30px] font-semibold tracking-[-0.02em]">{line1.trim()}</p>
        <p className="mt-1 font-serif text-[44px] font-extrabold tracking-[-0.03em]">{line2.trim()}</p>
        <p data-hero-px={96} className="relative mt-2 inline-block whitespace-nowrap px-2 font-serif text-[96px] font-bold italic leading-[0.95] tracking-[-0.05em] text-tomato">
          {/* hourLabel() gives "6\u00a0PM"; Fraunces' space is ~0.15em, which the -0.05em tracking and the
              italic overhang squeeze to a hairline at 96px, so the no-break space gets an explicit width. */}
          {hourNum}
          <span className="inline-block w-[0.26em] tracking-normal" data-testid="hour-space">{"\u00a0"}</span>
          {hourAmPm}
          {afterHour}
          <HandCircle className="-inset-x-4 -inset-y-3" />
        </p>
      </div>
      <p className="mt-3 font-serif text-sub italic">{S.primeTime.sub}</p>
      <Sticker tone="grid" rotate={0.8} className="-mx-2 mt-4 px-3 pb-1 pt-3" style={{ backgroundImage: "linear-gradient(rgb(30 107 102 / .08) 1px, transparent 1px), linear-gradient(90deg, rgb(30 107 102 / .08) 1px, transparent 1px)", backgroundSize: "10px 10px" }}>
        <TapeStrip className="-right-3 -top-6" width={60} angle={32} />
        <Heatmap heatmap={s.heatmap} peak={peak} header={fill(S.primeTime.heatmapHeader, { tz: tzLabel(s.timeZone, s.range.end) })} note={en.deco.heatmapArrow} />
      </Sticker>
      <PrimeTimeTiles peak={peak} badge={badge} className="mt-4" />
    </Wrap>
  );
}

function Streak({ ctx }: { ctx: SlideContext }) {
  const st = ctx.stats.longestStreak!;
  const [, after] = splitAround(S.bingeStreak.headline, "n");
  const truncated = streakMonths(st.start, st.end).length === 1 && st.start.slice(0, 7) !== st.end.slice(0, 7);
  return (
    <Wrap className="pt-4">
      <SrHeadline>{slideHeadline("streak", ctx)}</SrHeadline>
      <p aria-hidden="true" className="flex flex-wrap items-baseline gap-x-3">
        <HeroNumber value={st.days} size={120} className="text-tomato" />
        <Italic className="text-[30px] font-semibold">{after.trim()}</Italic>
      </p>
      <p className="mt-2 font-serif text-sub italic text-ink-2">{fill(S.bingeStreak.sub, { start: shortDate(st.start), end: shortDate(st.end) })}</p>
      {/* "No skips" (64px) hangs off the card's bottom edge (bottom -56px, right -12px): it only overlaps the card's
          16px bottom padding, so it never covers a date in 5- or 6-week months. */}
      <div className="relative mb-14 mt-5 self-start">
        {truncated && (
          // Only the end month is drawn for long streaks; the range keeps the length readable.
          <p className="mb-2 font-mono text-[13px] font-bold uppercase tracking-[0.06em]" data-testid="streak-range">
            {fill(S.bingeStreak.range, { start: shortDate(st.start), end: shortDate(st.end) })}
          </p>
        )}
        <Sticker rotate={-1.5} className="p-4">
          <TapeStrip className="-right-4 -top-2" angle={24} />
          <StreakCalendar start={st.start} end={st.end} />
        </Sticker>
        <span aria-hidden="true" data-testid="streak-sticker" className="slap absolute -bottom-14 -right-3 grid size-16 rotate-[-12deg] place-items-center rounded-full border-2 border-ink bg-tomato text-center font-hand text-[19px] font-bold leading-none text-paper-2 shadow-chip">
          {en.deco.streakSticker}
        </span>
      </div>
    </Wrap>
  );
}

function TopSearches({ ctx }: { ctx: SlideContext }) {
  const list = ctx.stats.topSearches.slice(0, 5);
  return (
    <Wrap className="pt-4">
      <Headline>{S.topSearches.headline}</Headline>
      <ol className="mt-7 flex flex-col gap-4">
        {list.map((q, i) => (
          <li key={q.query} className="flex items-center gap-3" style={{ transform: `rotate(${i % 2 ? 1.6 : -1.6}deg)` }}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-paper-2 font-mono text-[12px] font-bold">{String(i + 1).padStart(2, "0")}</span>
            <span className={`min-w-0 max-w-full px-3 py-2 font-mono text-[15px] font-bold uppercase tracking-[0.04em] text-paper-2 shadow-chip ${i === 0 ? "bg-tomato" : "bg-ink"}`}>
              <span className="clamp-name">{q.query}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-8 flex items-start gap-2 font-serif text-[15px] italic text-ink-2">
        <Lock className="mt-0.5 size-4 shrink-0 text-teal" />
        {S.topSearches.footer}
      </p>
    </Wrap>
  );
}

function MusicTotal({ ctx }: { ctx: SlideContext }) {
  const s = ctx.stats;
  const artist = s.topArtists[0]?.name;
  const [before, after] = splitAround(S.music.headline, "n");
  const [subBefore, subAfter] = splitAround(S.music.sub, "artist");
  return (
    <Wrap className="pt-6">
      <SrHeadline>{slideHeadline("music-total", ctx)}</SrHeadline>
      <div aria-hidden="true">
        <p className="font-serif text-headline font-semibold">{before.trim()}</p>
        <HeroNumber value={s.totalSongs} size={96} className="my-1 text-teal" />
        <p className="font-serif text-headline font-semibold [text-wrap:balance]">{after.trim()}</p>
      </div>
      {artist && (
        <div className="mt-8">
          <p className="sr-only">{fill(S.music.sub, { artist })}</p>
          <p aria-hidden="true" className="font-serif text-sub italic">{subBefore.trim()}</p>
          <Cassette
            tone="tomato"
            className="mt-3 -rotate-2"
            label={
              <span aria-hidden="true" className="flex min-w-0 justify-center font-serif text-[30px] font-extrabold leading-tight">
                <span className="clamp-name">{artist}</span>
                <span>{subAfter}</span>
              </span>
            }
          />
        </div>
      )}
      <Star className="absolute right-8 top-6 size-8 text-mustard" />
    </Wrap>
  );
}

function TopSongs({ ctx }: { ctx: SlideContext }) {
  const songs = ctx.stats.topSongs.slice(0, 5);
  const [top, ...rest] = songs;
  const h = S.topSongs.headline;
  const colon = h.indexOf(":");
  return (
    <Wrap className="pt-4">
      <Headline>
        {colon > 0 ? (
          <>
            <Italic className="text-teal">{h.slice(0, colon + 1)}</Italic>
            {h.slice(colon + 1)}
          </>
        ) : (
          h
        )}
      </Headline>
      {top && (
        <Sticker tone="teal" rotate={-1} className="mt-6 flex items-center gap-3 rounded-label px-4 py-3">
          <span aria-hidden="true" className="grid h-10 w-14 shrink-0 place-items-center rounded-[6px] border-2 border-ink bg-paper-2">
            <span className="flex gap-1.5"><span className="size-3 rounded-full border-2 border-ink" /><span className="size-3 rounded-full border-2 border-ink" /></span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.08em]">{en.deco.nowPlaying}</span>
            <span className="clamp-name font-serif text-[20px] font-bold">{songDisplayTitle(top.title, top.artist)}</span>
            <span className="clamp-name font-serif text-[14px] italic">
              {top.artist ? `${top.artist} · ` : ""}
              {fill(en.shareCard.plays, { n: num(top.count) })}
            </span>
          </span>
        </Sticker>
      )}
      {rest.length > 0 && (
        <Sticker rotate={0.8} className="mt-4">
          <ol start={2}>
            {rest.map((t, i) => (
              <li key={t.videoId ?? t.title} className="flex items-center gap-3 border-b border-dashed border-rule px-3.5 py-2.5 last:border-b-0">
                <span className="w-6 shrink-0 font-mono text-[13px] font-bold text-tomato">{String(i + 2).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="clamp-name font-serif text-[16px] font-semibold">{songDisplayTitle(t.title, t.artist)}</span>
                  {t.artist && <span className="clamp-name font-serif text-[13px] italic text-ink-2">{t.artist}</span>}
                </span>
                <span className="shrink-0 font-mono text-[12px] font-bold">{fill(en.shareCard.plays, { n: num(t.count) })}</span>
              </li>
            ))}
          </ol>
        </Sticker>
      )}
      <Star className="absolute bottom-16 right-8 size-6 text-mustard" />
    </Wrap>
  );
}

/** Caveat label on a strip of tape ("Singles" / "Long play"), decorative. */
function TapeLabel({ text, variant, className = "", angle }: { text: string; variant: "mustard" | "clear"; className?: string; angle: number }) {
  return (
    <span
      aria-hidden="true"
      className={`slap absolute z-10 whitespace-nowrap px-3 pb-[3px] pt-px font-hand text-[22px] font-bold leading-[1.1] text-ink shadow-tape ${variant === "clear" ? "border border-ink/10" : ""} ${className}`}
      style={{ background: variant === "mustard" ? "var(--tape-mustard)" : "var(--tape-clear)", transform: `rotate(${angle}deg)`, ["--slap-to" as string]: `${angle}deg`, animationDelay: "220ms" }}
      data-testid="tape-label"
    >
      {text}
    </span>
  );
}

/** Vertical phone (Shorts) / 16:9 frame (long-form) motifs from the mockup. */
function PhoneMotif({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" width="40" height="68" viewBox="0 0 44 74" className={className}>
      <rect x="1.5" y="1.5" width="41" height="71" rx="8" fill="#1F1B16" />
      <rect x="5" y="9" width="34" height="52" rx="3" fill="#FBF6EC" />
      <rect x="9" y="14" width="26" height="22" rx="2" fill="#E2A72E" />
      <rect x="9" y="41" width="20" height="4" rx="2" fill="#1F1B16" />
      <rect x="9" y="49" width="14" height="4" rx="2" fill="#4A4238" />
      <path d="M33 52 l3 -4 l3 4" fill="none" stroke="#B33A24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="17" y="65" width="10" height="3" rx="1.5" fill="#FBF6EC" />
    </svg>
  );
}
function ScreenMotif({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" width="80" height="50" viewBox="0 0 86 54" className={className}>
      <rect x="1.5" y="1.5" width="83" height="51" rx="5" fill="#1F1B16" />
      <rect x="6" y="6" width="74" height="38" rx="2" fill="#1E6B66" />
      <circle cx="58" cy="22" r="7" fill="#E2A72E" />
      <path d="M6 44 L24 28 L36 36 L50 24 L80 42 L80 44 Z" fill="#123F3C" />
      <rect x="30" y="47" width="26" height="3" rx="1.5" fill="#4A4238" />
    </svg>
  );
}

/**
 * Format card width at 360px: the card bleeds 8px past the slide padding (like the VHS labels),
 * so 328px − 2×14px padding − the "≈" (48px mono ≈ 29px + 6px gap) leaves 265px for the hero:
 * "8,620" fits at 96px; 5+ digits abbreviate ("12.4K" + "Exactly 12,412").
 */
const FORMAT_HERO_MAX = 265;

function FormatCard({ format, side, className = "" }: { format: "shorts" | "long"; side: ShortsSplitSide; className?: string }) {
  const shorts = format === "shorts";
  const unit = unitAfter(side.count, SV.count, SV.countOne);
  const time = splitTimeText(side.seconds);
  return (
    <div className={`relative ${className}`} data-testid={`format-card-${format}`}>
      <TapeLabel text={shorts ? en.deco.shortsTape : en.deco.longTape} variant={shorts ? "mustard" : "clear"} angle={shorts ? -5 : 3} className="-left-3 -top-7" />
      <Sticker rotate={shorts ? -1.2 : 1} className="px-3.5 pb-3 short:pb-2">
        <p className={`-mx-3.5 flex h-[30px] items-center border-b-2 border-ink px-3.5 font-serif text-[16px] font-bold tracking-[-0.01em] text-paper-2 ${shorts ? "bg-tomato" : "bg-teal-dark"}`}>
          <NoBreakHyphens text={shorts ? SV.shortsLabel : SV.longLabel} />
        </p>
        {shorts ? <PhoneMotif className="absolute -top-[18px] right-5 rotate-[8deg]" /> : <ScreenMotif className="absolute -top-3.5 right-3.5 -rotate-6" />}
        <div aria-hidden="true" className={`mt-2 flex items-end gap-1.5 short:mt-0.5 ${shorts ? "text-tomato" : "text-ink"}`}>
          <span className="pb-3 font-mono text-[48px] font-bold leading-none">≈</span>
          <HeroNumber value={side.count} size={96} maxWidth={FORMAT_HERO_MAX} captionClassName="text-ink-2" />
        </div>
        <p aria-hidden="true" className="-mt-0.5 font-serif text-[22px] font-semibold italic short:-mt-2 short:leading-tight">{unit}</p>
        <p aria-hidden="true" className="mt-2 flex items-baseline justify-between gap-2 whitespace-nowrap border-t border-dashed border-rule pt-2 font-mono text-[14px] font-bold short:mt-1 short:pt-1">
          {side.seconds === null ? <span className="text-ink-2" data-testid="time-unknown">—</span> : <span>{time ?? ""}</span>}
          <span>{fill(SV.share, { pct: side.pct })}</span>
        </p>
      </Sticker>
    </div>
  );
}

/** "Quick scrolls vs. long watches." → tomato italic + hand underline on the part after "vs. " (else after the last comma). */
function versusTail(text: string): ReactNode {
  const i = text.indexOf(" vs. ");
  if (i < 0) return underlineTail(text);
  return (
    <>
      {text.slice(0, i + 5)}
      <span className="relative inline-block italic text-tomato">
        {text.slice(i + 5)}
        <Underline className="absolute -bottom-1.5 left-0 h-2.5 w-full" />
      </span>
    </>
  );
}

function ShortsChipRow({ ctx, note = true }: { ctx: SlideContext; note?: boolean }) {
  return (
    <div className="mt-3 flex items-center gap-2.5 short:mt-2">
      <span className="shrink-0">
        <EstimateChip label={SV.chip} onClick={ctx.openShortsExplainer} expanded={ctx.shortsExplainerOpen} controls={ctx.shortsExplainerId} />
      </span>
      {note && <p className="font-serif text-[13px] italic leading-[1.35] text-ink-2" data-testid="shorts-note">{SV.note}</p>}
    </div>
  );
}

function ShortsVsLong({ ctx }: { ctx: SlideContext }) {
  const split = ctx.shortsSplit!;
  return (
    <Wrap className="pt-3">
      <Headline className="leading-[1.12]">{versusTail(SV.headline)}</Headline>
      {split.noShorts ? (
        <div className="relative mt-12" data-testid="no-shorts">
          <TapeLabel text={en.deco.longTape} variant="clear" angle={3} className="-left-2 -top-7" />
          <Sticker rotate={1} className="px-4 pb-5 pt-6">
            <ScreenMotif className="absolute -top-3.5 right-3.5 -rotate-6" />
            <p className="font-serif text-[26px] font-semibold italic leading-snug [text-wrap:balance]">
              <NoBreakHyphens text={SV.noShorts} />
            </p>
          </Sticker>
        </div>
      ) : (
        <>
          <p className="sr-only">{plainHyphens(shortsAria(split))}</p>
          <div className="-mx-2 mt-9 flex flex-col gap-8 short:mt-7 short:gap-6">
            <FormatCard format="shorts" side={split.shorts} />
            <FormatCard format="long" side={split.long} />
          </div>
          {split.sub && (
            <p className="mt-4 font-serif text-[18px] font-semibold italic leading-[1.3] short:mt-2.5 short:text-[16px]" data-testid="shorts-sub">
              <NoBreakHyphens text={SV.subs[split.sub]} />
            </p>
          )}
        </>
      )}
      <ShortsChipRow ctx={ctx} />
    </Wrap>
  );
}

/** "Your top creators, short and long." → "short" tomato italic, "long." teal italic. */
function shortLongHeadline(text: string): ReactNode {
  const m = /^(.*?)\b(short)\b(.*?)\b(long\.?)$/.exec(text);
  if (!m) return text;
  return (
    <>
      {m[1]}
      <Italic className="text-tomato">{m[2]}</Italic>
      {m[3]}
      <Italic className="text-teal">{m[4]}</Italic>
    </>
  );
}

function CreatorColumn({ format, side }: { format: "shorts" | "long"; side: ShortsSplitSide }) {
  const shorts = format === "shorts";
  const [top, ...runners] = side.topCreators;
  const [itemBefore] = splitAround(TC.item, "n");
  return (
    <div className="relative min-w-0" data-testid={`creator-column-${format}`}>
      <TapeLabel text={shorts ? en.deco.shortsTape : en.deco.longTape} variant={shorts ? "mustard" : "clear"} angle={shorts ? -5 : 4} className={shorts ? "-left-3 -top-7" : "-right-3 -top-7"} />
      <Sticker rotate={shorts ? -1.5 : 1.5} className="flex h-full flex-col px-3 pb-1 text-center">
        <p className={`-mx-3 flex min-h-[46px] items-center justify-center border-b-2 border-ink px-2.5 py-1 font-serif text-[15px] font-bold leading-[1.15] text-paper-2 [text-wrap:balance] ${shorts ? "bg-tomato" : "bg-teal-dark"}`}>
          <span><NoBreakHyphens text={shorts ? TC.shortsColumn : TC.longColumn} /></span>
        </p>
        {!top ? (
          // Designer: no creators → keep the sticker and header; the empty line sits centered where the #1 block goes.
          <div className="flex flex-1 items-center justify-center px-1 py-6">
            <p className="font-serif text-[15px] italic leading-snug text-ink-2 [text-wrap:balance]" data-testid="split-empty"><NoBreakHyphens text={shorts ? TC.emptyShorts : TC.emptyLong} /></p>
          </div>
        ) : (
          <>
            <span className="mt-4 flex justify-center" aria-hidden="true">
              <MonogramSticker name={top.name} size={64} />
            </span>
            {/* The one exception to the 1-line creator rule: the #1 may wrap to 2 lines in these narrow columns. */}
            <p className="clamp-title mt-2.5 min-h-[42px] font-serif text-[18px] font-bold leading-[1.18] [text-wrap:balance]" data-testid="split-top-name">{top.name}</p>
            <p className="mt-1.5 whitespace-nowrap font-mono text-[22px] font-bold">
              <span className="sr-only">{itemText(top.count)}</span>
              <span aria-hidden="true">
                {itemBefore.trim()} <b className={`text-[34px] tracking-[-0.06em] ${shorts ? "text-tomato" : "text-ink"}`}>{num(top.count)}</b>
                <span className="mt-0.5 block font-serif text-[16px] font-semibold italic">{unitAfter(top.count, TC.item, TC.itemOne)}</span>
              </span>
            </p>
            <div className="mt-3 border-t-[1.5px] border-ink text-left">
              {runners.length === 0 ? (
                // A #1 but nobody else: `noRunnersUp` (empty* is only for a column with zero creators).
                <p className="py-2 font-serif text-[14px] italic leading-snug text-ink-2" data-testid="split-no-runners"><NoBreakHyphens text={TC.noRunnersUp} /></p>
              ) : (
                <ol start={2}>
                  {runners.map((c, i) => (
                    <li key={c.url ?? c.name} className="flex items-baseline gap-[7px] border-b border-dashed border-rule py-[7px] last:border-b-0">
                      <span className="shrink-0 font-mono text-[11px] font-bold text-tomato">{String(i + 2).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1">
                        <span className="clamp-name font-serif text-[15px] font-bold leading-[1.2]">{c.name}</span>
                        <span className="mt-px block font-mono text-[11.5px] font-bold text-ink-2">{itemText(c.count)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        )}
      </Sticker>
    </div>
  );
}

function CreatorsByFormat({ ctx }: { ctx: SlideContext }) {
  const split = ctx.shortsSplit!;
  return (
    <Wrap className="pt-3">
      <Headline className="leading-[1.12]">{shortLongHeadline(plainHyphens(TC.headline))}</Headline>
      <div className="mt-12 grid grid-cols-2 items-stretch gap-4">
        <CreatorColumn format="shorts" side={split.shorts} />
        <CreatorColumn format="long" side={split.long} />
      </div>
      {split.sameTopCreator && (
        <p className="mt-4 font-serif text-[16px] font-semibold italic" data-testid="same-top">{fill(TC.sameTop, { creator: split.sameTopCreator })}</p>
      )}
      <ShortsChipRow ctx={ctx} note={false} />
      <Star className="absolute bottom-24 right-8 size-8 text-mustard" />
      <Sparkle className="absolute bottom-16 left-[45%] size-4 text-tomato" />
    </Wrap>
  );
}

export function SlideView({ kind, ctx }: { kind: SlideKind; ctx: SlideContext }) {
  switch (kind) {
    case "total-videos":
      return <TotalVideos ctx={ctx} />;
    case "watch-time":
      return <WatchTime ctx={ctx} />;
    case "shorts-vs-long":
      return <ShortsVsLong ctx={ctx} />;
    case "creators-by-format":
      return <CreatorsByFormat ctx={ctx} />;
    case "top-creator":
      return <TopCreator ctx={ctx} />;
    case "top-creators":
      return <TopCreators ctx={ctx} />;
    case "favorite-video":
      return <FavoriteVideo ctx={ctx} />;
    case "busiest-month":
      return <BusiestMonth ctx={ctx} />;
    case "prime-time":
      return <PrimeTime ctx={ctx} />;
    case "streak":
      return <Streak ctx={ctx} />;
    case "top-searches":
      return <TopSearches ctx={ctx} />;
    case "music-total":
      return <MusicTotal ctx={ctx} />;
    case "top-songs":
      return <TopSongs ctx={ctx} />;
    case "share":
      return <>{ctx.share}</>;
  }
}
