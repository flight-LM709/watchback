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

