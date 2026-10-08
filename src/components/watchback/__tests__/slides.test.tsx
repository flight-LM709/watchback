// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { en } from "@/copy/en";
import { fill } from "@/copy/format";
import { makeDemoEvents } from "@/app/demo/demo-data";
import { computeStats, type WatchStats } from "@/lib/takeout/stats";
import { contrastViolations } from "@/test-utils/contrast";
import type { SlideKind } from "@/components/story/slides";
import { BadgeSticker, SlideView, type SlideContext } from "../slides";
import { PEAK_HOUR_WINDOWS } from "@/lib/takeout/stats";
import type { ShortsSplitEstimate } from "@/lib/takeout/shortsSplit";

afterEach(cleanup);
const base = computeStats(makeDemoEvents(), { timeZone: "Asia/Jakarta" });
const P = en.slides.primeTime;

function show(kind: SlideKind, patch: Partial<WatchStats> = {}, extra: Partial<SlideContext> = {}) {
  const ctx: SlideContext = {
    stats: { ...base, ...patch },
    watchTime: { seconds: 1920 * 3600, isEstimate: true, coverage: 1, exactSeconds: 0 },
    period: "last12",
    periodLabel: "p",
    thumb: null,
    openExplainer: () => {},
    explainerOpen: false,
    explainerId: "x",
    share: null,
    ...extra,
  };
  const r = render(<SlideView kind={kind} ctx={ctx} />);
  return r.container;
}

describe("prime-time slide", () => {
  it("headline uses daysPlural; peak tile = peakLabel / peakValue / {n} videos; badge name + detail, badgeShare for SR", () => {
    const root = show("prime-time", { peak: { day: 0, hour: 5, count: 12 }, peakHourBadge: { badge: "early-bird", pct: 19, plays: 40 } });
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Prime time: Sundays at 5\u00a0AM.");
    expect(root.textContent).not.toMatch(/Sundayss|Sundays at.*Sundays at.*Sundays at/);
    expect(root.textContent).toContain(P.peakLabel);
    expect(screen.getByTestId("peak-value").textContent).toBe("Sun 5\u00a0AM");
    expect(screen.getByTestId("peak-value").nextElementSibling!.textContent).toBe(fill(en.slides.topCreators.item, { n: 12 }));
    expect(screen.getByTestId("badge-share").textContent).toBe("Early bird: 19% of plays between 5 and 9 AM");
    expect(screen.getByTestId("badge-share").className).toContain("sr-only");
    expect(screen.getByTestId("badge-detail").textContent).toBe("19% of plays between 5 and 9 AM");
    expect(contrastViolations(root)).toEqual([]);
  });

  it("the 'prime time!' note sits under the hour axis, not in the header, so the tz label is alone up there", () => {
    show("prime-time", { peak: { day: 2, hour: 21, count: 9 } });
    const header = screen.getByTestId("heatmap-header");
    expect(header.textContent).toBe(fill(P.heatmapHeader, { tz: "GMT+7" }));
    const note = screen.getByTestId("heatmap-note");
    expect(note.textContent).toBe(en.deco.heatmapArrow);
    const peakCell = document.querySelector("[data-peak]")!;
    expect(peakCell.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // arrow is horizontally on the peak column
    expect(note.querySelector("svg")!.getAttribute("style")).toContain(`${(21 + 0.5) / 24}`);
  });
});

describe("streak slide", () => {
  it("long streak: end-month calendar plus the bingeStreak.range line above it", () => {
    show("streak", { longestStreak: { days: 79, start: "2024-03-03", end: "2024-05-20" } });
    expect(screen.getByTestId("streak-range").textContent).toBe(fill(en.slides.bingeStreak.range, { start: "Mar 3", end: "May 20" }));
    expect(screen.getByTestId("streak-range").textContent).toBe("Mar 3 – May 20");
  });
  it("short streaks (calendar shows all of it) don't repeat the range", () => {
    show("streak", { longestStreak: { days: 5, start: "2024-03-28", end: "2024-04-01" } });
    expect(screen.queryByTestId("streak-range")).toBeNull();
  });
});

describe("hero abbreviation on slides", () => {
  it("total videos that don't fit at 360px show 12.4K + 'Exactly 12,412'", () => {
    const root = show("total-videos", { totalVideos: 12412 });
    const hero = root.querySelector<HTMLElement>("[data-hero-px]")!;
    expect(Number(hero.dataset.heroPx)).toBeGreaterThanOrEqual(96);
    expect(hero.dataset.abbreviated).toBe("true");
    expect(screen.getByTestId("exact-caption").textContent).toBe("Exactly 12,412");
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("12,412");
  });
  it("watch-time counter beyond 4 digits abbreviates with the caption", () => {
    show("watch-time", {}, { watchTime: { seconds: 12412 * 3600, isEstimate: true, coverage: 1, exactSeconds: 0 } });
    expect(screen.getByTestId("exact-caption").textContent).toBe("Exactly 12,412");
    show("watch-time", {}, {});
    expect(screen.getAllByTestId("exact-caption")).toHaveLength(1);
  });
  it("#1 creator star uses topCreator.rankSticker", () => {
    const root = show("top-creator");
    expect(within(root).getByText(en.slides.topCreator.rankSticker)).toBeTruthy();
  });
});

describe("badge sticker", () => {
  it("icon on its own line above the name; name 22px, clamped to two lines; U+2011 drawn as a nowrap U+002D", () => {
    for (const w of PEAK_HOUR_WINDOWS) {
      const { container, unmount } = render(<BadgeSticker badge={{ badge: w.badge, pct: 20, plays: 9 }} />);
      const icon = within(container).getByTestId("badge-icon");
      const name = within(container).getByTestId("badge-name");
      expect(icon.getAttribute("class")).toContain("block");
      expect(icon.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(icon.contains(name) || name.contains(icon)).toBe(false);
      expect(name.className).toContain("text-[22px]");
      expect(name.className).toContain("clamp-title"); // 2-line clamp
      expect(name.textContent).not.toContain("\u2011");
      expect(name.textContent).toBe(Object.values(en.slides.primeTime.badges)[PEAK_HOUR_WINDOWS.indexOf(w)].replaceAll("\u2011", "-"));
      const nb = name.querySelector("[data-nb-word]");
      if (/[‑]/.test(en.slides.primeTime.badges[(["earlyBird", "coffeeBreak", "lunchBreak", "afternoonDrifter", "eveningRegular", "nightOwl"] as const)[PEAK_HOUR_WINDOWS.indexOf(w)]])) {
        expect(nb!.className).toContain("whitespace-nowrap");
        expect(nb!.textContent).toMatch(/^\w+-\w+$/);
      }
      unmount();
    }
  });
});

describe("streak sticker", () => {
  it("'No skips' hangs below the calendar card (64px, bottom -56px, right -12px) instead of over the dates", () => {
    show("streak", { longestStreak: { days: 29, start: "2024-02-04", end: "2024-03-03" } });
    const sticker = screen.getByTestId("streak-sticker");
    expect(sticker.className).toContain("-bottom-14");
    expect(sticker.className).toContain("size-16");
    expect(sticker.className).toContain("-right-3");
    expect(sticker.textContent).toBe(en.deco.streakSticker);
  });
});

describe("song titles and the prime-time hour", () => {
  it("Side A strips a leading '{artist} - ' (artist after ' - Topic' is removed)", () => {
    const root = show("top-songs", {
      topSongs: [
        { videoId: "a", title: "NOAH - Lagu 8", artist: "NOAH", count: 9 },
        { videoId: "b", title: "noah — Separuh Aku", artist: "NOAH", count: 5 },
        { videoId: "c", title: "Tulus", artist: "Tulus", count: 3 },
      ],
    });
    expect(root.textContent).toContain("Lagu 8");
    expect(root.textContent).not.toContain("NOAH - Lagu 8");
    expect(root.textContent).toContain("Separuh Aku");
    expect(root.textContent).not.toMatch(/noah —/i);
    expect(root.textContent).toContain("Tulus"); // title == artist: kept
  });
  it("hero hour keeps the U+00A0 and gives it an explicit width", () => {
    show("prime-time", { peak: { day: 0, hour: 18, count: 8 } });
    const sp = screen.getByTestId("hour-space");
    expect(sp.textContent).toBe("\u00a0");
    expect(sp.className).toContain("w-[0.26em]");
    expect(sp.parentElement!.textContent!.startsWith("6\u00a0PM.")).toBe(true);
  });
});


describe("Shorts slides (SPEC §9)", () => {
  const c = (name: string, count: number) => ({ name, url: `u:${name}`, count });
  const split = (patch: Partial<ShortsSplitEstimate> = {}): ShortsSplitEstimate => ({
    isEstimate: true,
    shorts: { count: 8620, seconds: 84 * 3600, pct: 69, topCreators: [c("Alpha", 476), c("Beta", 391), c("Gamma", 302)], showEmptyState: false },
    long: { count: 3860, seconds: 1836 * 3600, pct: 31, topCreators: [c("Delta", 1150)], showEmptyState: true },
    noShorts: false,
    slides: { shortsVsLong: true, creatorsByFormat: true },
    playsWinner: "shorts", timeWinner: "long", sub: "shortsPlaysLongTime", sameTopCreator: null, unknownPlays: 0, coverage: 1,
    ...patch,
  });

  it("16: two cards with ≈ heroes, time + share, the matching sub, chip + note; 4-digit counts fit at 96px", () => {
    const root = show("shorts-vs-long", {}, { shortsSplit: split() });
    const shorts = screen.getByTestId("format-card-shorts");
    expect(shorts.textContent).toContain("8,620");
    expect(shorts.textContent).toContain("≈ 84 hours");
    expect(shorts.textContent).toContain("69% of your plays");
    expect(shorts.querySelector("[data-hero-px]")!.getAttribute("data-hero-px")).toBe("96");
    expect(shorts.querySelector("[data-abbreviated]")).toBeNull();
    expect(screen.getByTestId("format-card-long").textContent).toContain("≈ 1,836 hours");
    expect(screen.getByTestId("shorts-sub").textContent).toBe("Shorts got most of your plays. Long-form got most of your time.");
    expect(screen.getByTestId("shorts-note").textContent).toBe(en.slides.shortsVsLong.note);
    expect(root.textContent).not.toContain("\u2011");
    expect(contrastViolations(root)).toEqual([]);
  });

  it("16: under an hour uses timeMinutes; 5-digit counts abbreviate with the exact caption", () => {
    show("shorts-vs-long", {}, { shortsSplit: split({ shorts: { count: 12412, seconds: 35 * 60, pct: 70, topCreators: [], showEmptyState: true } }) });
    const card = screen.getByTestId("format-card-shorts");
    expect(card.textContent).toContain("≈ 35 min");
    expect(within(card).getByTestId("exact-caption").textContent).toBe("Exactly 12,412");
  });

  it("16: zero Shorts → noShorts line instead of the cards, no sub", () => {
    show("shorts-vs-long", {}, { shortsSplit: split({ noShorts: true, sub: null }) });
    expect(screen.getByTestId("no-shorts").textContent).toContain("No Shorts at all. You kept it long-form.");
    expect(screen.queryByTestId("format-card-shorts")).toBeNull();
    expect(screen.queryByTestId("shorts-sub")).toBeNull();
  });

  it("17: #1 + runners per column, empty state under 2 creators, sameTop line", () => {
    const root = show("creators-by-format", {}, { shortsSplit: split({ sameTopCreator: "Alpha" }) });
    const s = screen.getByTestId("creator-column-shorts");
    expect(within(s).getByTestId("split-top-name").textContent).toBe("Alpha");
    expect(s.querySelectorAll("li")).toHaveLength(2);
    expect(s.textContent).toContain("≈ 391 videos");
    const l = screen.getByTestId("creator-column-long");
    expect(within(l).getByTestId("split-empty").textContent).toBe(en.slides.topCreatorsSplit.emptyLong.replaceAll("\u2011", "-"));
    expect(l.textContent).toContain("Top long-form creators");
    expect(screen.getByTestId("same-top").textContent).toBe("Alpha topped both lists.");
    expect(contrastViolations(root)).toEqual([]);
  });
});
