"use client";

import { forwardRef, useRef, useState, type ReactNode } from "react";
import { CassetteIcon, EstimateChip, InfoIcon, VHSStripe } from "@/components/paper";
import { en } from "@/copy/en";
import { fill, fillNodes, type PeriodVariant } from "@/copy/format";
import type { WatchStats } from "@/lib/takeout/stats";
import type { WatchTimeEstimate } from "@/lib/takeout/watchTime";
import { dayName, hourLabel, monthName, num, perDay, splitAround } from "./fmt";
import { shareYear } from "./slides";

/** Share-image layouts in CSS px (SPEC §2 ShareCard), exported at pixelRatio 3 → 1080×1920 / 1080×1080. */
export const SHARE_SIZES = { story: { width: 360, height: 640 }, square: { width: 360, height: 360 } } as const;
export const EXPORT_PIXEL_RATIO = 3;
export const PREVIEW_WIDTH = 342;
const CARD_BG = "#FBF6EC";
export type ShareVariant = keyof typeof SHARE_SIZES;

/** html-to-image node filter: anything marked data-export-exclude (the ⓘ button) never reaches the PNG. */
export function exportFilter(node: Node): boolean {
  return !(node.nodeType === 1 && (node as Element).hasAttribute("data-export-exclude"));
}

type ToPng = (node: HTMLElement, options: Record<string, unknown>) => Promise<string>;

/** Render a card node to a PNG data URL once web fonts are ready. */
export async function renderCardPng(node: HTMLElement, variant: ShareVariant, toPngImpl?: ToPng): Promise<string> {
  if (typeof document !== "undefined" && document.fonts?.ready) await document.fonts.ready;
  const toPng: ToPng = toPngImpl ?? ((await import("html-to-image")).toPng as unknown as ToPng);
  const { width, height } = SHARE_SIZES[variant];
  return toPng(node, {
    width,
    height,
    pixelRatio: EXPORT_PIXEL_RATIO,
    filter: exportFilter,
    cacheBust: false,
    backgroundColor: CARD_BG, // paper-2; the PNG is never transparent
    // No grain in the PNG: the feTurbulence SVG doesn't survive html-to-image's foreignObject
    // rendering (it comes out as a solid black rect), so the export uses flat paper-2.
    style: { transform: "none", margin: "0", backgroundImage: "none" },
  });
}

export interface ShareCardProps {
  variant: ShareVariant;
  stats: WatchStats;
  watchTime: WatchTimeEstimate | null;
  period: PeriodVariant;
  periodLabel: string;
  host: string;
  /** App-UI-only ⓘ on the fallback tile (excluded from the export). */
  onInfo?: () => void;
  infoOpen?: boolean;
  infoId?: string;
}

const C = en.shareCard;
const Label = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <p className={`font-mono text-micro font-bold uppercase tracking-[0.1em] ${className}`}>{children}</p>
);

function Tile({ tone = "paper", children, className = "" }: { tone?: "paper" | "mustard" | "teal"; children: ReactNode; className?: string }) {
  const tones = { paper: "bg-white text-ink", mustard: "bg-mustard text-ink", teal: "bg-teal text-paper-2" } as const;
  return <div className={`relative min-w-0 border-2 border-ink px-2.5 py-2 ${tones[tone]} ${className}`}>{children}</div>;
}

function VideosTile({ s }: { s: WatchStats }) {
  return (
    <Tile>
      <Label>{C.videos}</Label>
      <p className="mt-1 font-mono text-[27px] font-bold leading-none tracking-[-0.06em]">{num(s.totalVideos)}</p>
      <p className="mt-1 font-serif text-[11.5px] italic">{fill(C.perDay, { perDay: perDay(s.avgVideosPerDay) })}</p>
    </Tile>
  );
}

function WatchTile({ wt, square }: { wt: WatchTimeEstimate; square?: boolean }) {
  const [approx] = splitAround(en.slides.watchTime.headline, "hours");
  return (
    <Tile tone="mustard">
      <Label>{C.watchTime}</Label>
      <p className="mt-1 font-mono text-[27px] font-bold leading-none tracking-[-0.06em]">
        {approx}
        {num(wt.seconds / 3600)}
      </p>
      <p className={`mt-1 flex items-center gap-1.5 font-serif text-[11.5px] italic ${square ? "" : ""}`}>
        {C.hours} <EstimateChip label={en.slides.watchTime.chip} staticVariant />
      </p>
    </Tile>
  );
}

function PeakTile({ s, onInfo, infoOpen, infoId }: { s: WatchStats; onInfo?: () => void; infoOpen?: boolean; infoId?: string }) {
  const peak = s.peak;
  return (
    <Tile tone="mustard" className="pr-9">
      <Label>{en.slides.primeTime.peakLabel}</Label>
      <p className="mt-1 font-mono text-[27px] font-bold leading-none tracking-[-0.06em]">{peak ? hourLabel(peak.hour) : "–"}</p>
      {peak && <p className="mt-1 font-serif text-[11.5px] italic">{dayName(peak.day)}s</p>}
      {onInfo && (
        <button
          type="button"
          data-export-exclude
          data-story-interactive
          onClick={onInfo}
          aria-expanded={infoOpen}
          aria-controls={infoId}
          aria-label={en.slides.watchTime.unavailableTooltip}
          className="absolute -right-1 -top-1 grid size-11 place-items-center text-ink"
        >
          <InfoIcon className="size-[18px]" />
        </button>
      )}
    </Tile>
  );
}

function CardHeader({ s, period, periodLabel, size }: { s: WatchStats; period: PeriodVariant; periodLabel: string; size: "lg" | "sm" }) {
  const headline = en.slides.share.headline[period];
  return (
    <>
      <div className="flex items-start justify-between px-4 pt-3">
        <CassetteIcon className="mt-1" />
        <span className="rotate-[4deg] border-2 border-tomato px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-tomato" data-testid="share-stamp">
          {en.appName}
        </span>
      </div>
      <h3 className={`px-4 font-serif font-bold leading-[1.05] tracking-[-0.02em] ${size === "lg" ? "mt-1 text-[29px]" : "mt-0.5 text-[21px]"}`}>
        {fillNodes(headline, { year: <span className="italic text-tomato">{shareYear(s)}</span> })}
      </h3>
      <p className="mt-1 px-4 font-mono text-[9.5px] text-ink-2">{periodLabel}</p>
    </>
  );
}

function Footer({ host }: { host: string }) {
  return (
    <div className="mt-auto border-t-2 border-ink px-4 py-2.5">
      {host && <p className="font-mono text-[9.5px] font-bold">{host}</p>}
      <p className="mt-0.5 font-mono text-[8.5px] text-ink-2">{en.disclaimer}</p>
    </div>
  );
}

/** The share image itself, laid out at 360×640 (story) or 360×360 (square) CSS px. */
export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard({ variant, stats: s, watchTime, period, periodLabel, host, onInfo, infoOpen, infoId }, ref) {
  const { width, height } = SHARE_SIZES[variant];
  const hasMusic = s.totalSongs > 0 && s.topSongs.length > 0;
  const song = s.topSongs[0];
  const timeTile = watchTime ? <WatchTile wt={watchTime} square={variant === "square"} /> : <PeakTile s={s} onInfo={onInfo} infoOpen={infoOpen} infoId={infoId} />;

  return (
    <div
      ref={ref}
      data-share-card={variant}
      className="relative flex shrink-0 flex-col overflow-hidden border-2 border-ink bg-paper-2 text-ink"
      style={{ width, height, backgroundImage: "var(--grain-card)", fontFamily: "var(--font-serif)" }}
    >
      <VHSStripe />
      <CardHeader s={s} period={period} periodLabel={periodLabel} size={variant === "story" ? "lg" : "sm"} />
      {variant === "story" ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2.5 px-4">
            <VideosTile s={s} />
            {timeTile}
          </div>
          {s.topCreators.length > 0 && (
            <div className="mt-3 px-4">
              <div className="flex justify-between border-b-2 border-ink pb-1">
                <Label>{C.topCreators}</Label>
                <Label>{C.videos}</Label>
              </div>
              <ol>
                {s.topCreators.slice(0, 5).map((c, i) => (
                  <li key={c.url ?? c.name} className={`flex items-baseline gap-2 border-b border-dashed border-rule ${hasMusic ? "py-[5px]" : "py-[9px]"}`}>
                    <span className="w-5 shrink-0 font-mono text-[10.5px] font-bold text-tomato">{String(i + 1).padStart(2, "0")}</span>
                    <span className="clamp-name max-w-[60%] font-serif text-[15px] font-medium">{c.name}</span>
                    <span className="mx-1 min-w-3 flex-1 border-b-2 border-dotted border-rule" aria-hidden="true" />
                    <span className="shrink-0 font-mono text-[11.5px] font-bold">{num(c.count)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {hasMusic && song && (
            <div className="mt-3 px-4">
              <div className="border-b-2 border-ink pb-1">
                <Label>{C.topSong}</Label>
              </div>
              <div className="mt-2 flex items-center gap-2.5 rounded-label border-2 border-ink bg-teal px-3 py-2 text-paper-2">
                <span className="grid h-7 w-10 shrink-0 place-items-center rounded-[4px] border-2 border-ink bg-paper-2" aria-hidden="true">
                  <span className="flex gap-1"><span className="size-2 rounded-full border-2 border-ink" /><span className="size-2 rounded-full border-2 border-ink" /></span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[8px] font-bold uppercase tracking-[0.1em]">{en.deco.nowPlaying}</span>
                  <span className="clamp-name font-serif text-[15px] font-bold leading-tight">{song.title}</span>
                  {song.artist && <span className="clamp-name font-serif text-[11.5px] italic">{song.artist}</span>}
                </span>
                <span className="shrink-0 text-right font-mono text-[10px]">{fill(C.plays, { n: num(song.count) })}</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mt-2.5 grid grid-cols-2 gap-2 px-4">
          <VideosTile s={s} />
          {timeTile}
          {s.topCreators[0] && (
            <Tile>
              <Label>{C.topCreator}</Label>
              <p className="clamp-name mt-1 font-serif text-[15px] font-bold leading-tight">{s.topCreators[0].name}</p>
              <p className="mt-0.5 font-mono text-[10.5px]">{fill(en.slides.topCreators.item, { n: num(s.topCreators[0].count) })}</p>
            </Tile>
          )}
          {hasMusic && song ? (
            <Tile tone="teal">
              <Label>{C.topSong}</Label>
              <p className="clamp-title mt-1 font-serif text-[13.5px] font-bold leading-tight">{song.title}</p>
              {song.artist && <p className="clamp-name font-serif text-[10.5px] italic">{song.artist}</p>}
            </Tile>
          ) : s.busiestMonth ? (
            <Tile>
              <p className="font-serif text-[17px] font-bold leading-tight">
                {monthName(s.busiestMonth.month)} {period === "allTime" ? s.busiestMonth.year : ""}
              </p>
              <p className="mt-0.5 font-mono text-[10.5px]">{fill(en.slides.busiestMonth.sub, { n: num(s.busiestMonth.count) })}</p>
            </Tile>
          ) : null}
        </div>
      )}
      <Footer host={host} />
    </div>
  );
});

export interface ShareSlideProps extends Omit<ShareCardProps, "variant" | "onInfo" | "infoOpen" | "infoId"> {
  onExportingChange?: (busy: boolean) => void;
  onStartOver?: () => void;
  /** Injected in tests. */
  render?: (node: HTMLElement, variant: ShareVariant) => Promise<string>;
  download?: (dataUrl: string, filename: string) => void;
}

function defaultDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Slide 12: scaled 342px preview of the story card, Save story / Save square, Start over. */
export function ShareSlide({ onExportingChange, onStartOver, render = renderCardPng, download = defaultDownload, ...card }: ShareSlideProps) {
  const storyRef = useRef<HTMLDivElement>(null);
  const squareRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<ShareVariant | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const infoId = "share-unavailable-tooltip";
  const scale = PREVIEW_WIDTH / SHARE_SIZES.story.width;

  const save = async (variant: ShareVariant) => {
    const node = variant === "story" ? storyRef.current : squareRef.current;
    if (!node || busy) return;
    setBusy(variant);
    onExportingChange?.(true);
    try {
      const url = await render(node, variant);
      download(url, `${en.appName.toLowerCase()}-${variant}.png`);
    } catch {
      // Export failed (e.g. canvas unsupported); the card stays on screen.
    } finally {
      setBusy(null);
      onExportingChange?.(false);
    }
  };

  return (
    <div className="rise relative flex flex-1 flex-col items-center px-6 pb-6 pt-9">
      <h2 className="sr-only">{fill(en.slides.share.headline[card.period], { year: shareYear(card.stats) })}</h2>
      <div className="relative shadow-card" style={{ width: PREVIEW_WIDTH, height: SHARE_SIZES.story.height * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <ShareCard ref={storyRef} variant="story" {...card} onInfo={() => setInfoOpen((v) => !v)} infoOpen={infoOpen} infoId={infoId} />
        </div>
        {/* Tooltip lives outside the card node, so it can never be baked into the PNG. */}
        {infoOpen && !card.watchTime && (
          <div
            id={infoId}
            role="note"
            data-testid="unavailable-tooltip"
            className="absolute right-2 top-[226px] z-10 w-[220px] rounded-[8px] bg-ink px-3 py-2.5 font-serif text-[13px] leading-snug text-paper-2 shadow-chip"
          >
            <span className="absolute -top-1.5 right-5 size-3 rotate-45 bg-ink" aria-hidden="true" />
            {en.slides.watchTime.unavailableTooltip}
          </div>
        )}
      </div>
      <div className="mt-4 grid w-full max-w-[342px] grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => save("story")}
          disabled={!!busy}
          aria-busy={busy === "story"}
          className="h-[52px] rounded-pill border-2 border-ink bg-paper-2 font-serif text-[18px] font-bold text-ink shadow-sticker disabled:opacity-70"
        >
          {en.slides.share.saveStory}
        </button>
        <button
          type="button"
          onClick={() => save("square")}
          disabled={!!busy}
          aria-busy={busy === "square"}
          className="h-[52px] rounded-pill border-2 border-ink bg-ink font-serif text-[18px] font-bold text-paper-2 disabled:opacity-70"
        >
          {en.slides.share.saveSquare}
        </button>
      </div>
      {onStartOver && (
        <button type="button" onClick={onStartOver} disabled={!!busy} className="mt-2 h-11 px-4 font-serif text-[17px] font-bold text-ink underline decoration-tomato decoration-2 underline-offset-4">
          {en.slides.share.startOver}
        </button>
      )}
      {/* The square card is laid out off-screen at its export size. */}
      <div aria-hidden="true" inert className="pointer-events-none absolute left-[-10000px] top-0">
        <ShareCard ref={squareRef} variant="square" {...card} />
      </div>
    </div>
  );
}
