// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { en } from "@/copy/en";
import { contrastViolations } from "@/test-utils/contrast";
import { DemoStory } from "../demo-story";

afterEach(cleanup);
const region = () => screen.getByRole("region");
const next = () => fireEvent.keyDown(region(), { key: "ArrowRight" });
const slide = () => region().querySelector('[aria-roledescription="slide"]') as HTMLElement;
const h2 = () => slide().querySelector("h2")?.textContent ?? "";

describe("/demo: Paper Mixtape story", () => {
  it("12 slides, copy from en.ts, peak-hour badge on the prime-time slide, heroes ≥ 96px, no banned contrast pairs", () => {
    render(<DemoStory />);
    expect(screen.getAllByTestId("story-progress")).toHaveLength(12);
    const heroes: number[] = [];
    const violations: string[] = [];
    const seen: string[] = [];
    const check = () => {
      slide().querySelectorAll<HTMLElement>("[data-hero-px]").forEach((h) => heroes.push(Number(h.dataset.heroPx)));
      violations.push(...contrastViolations(slide()));
      seen.push(h2());
    };

    check();
    expect(h2()).toMatch(/^You pressed play on [\d,]+ videos\.$/);
    next();
    check();
    expect(h2()).toMatch(/^≈ [\d,]+ hours of watching\.$/);
    fireEvent.click(screen.getByRole("button", { name: /Estimate/ }));
    const sheet = screen.getByRole("dialog", { name: en.slides.watchTime.chip });
    expect(sheet.textContent).toContain(en.slides.watchTime.chipExplainer);
    expect(region().dataset.paused).toBe("true");
    fireEvent.keyDown(sheet, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();

    next(); // 3: #1 creator, monogram + hero, no runners-up list
    check();
    expect(h2()).toMatch(/^Your #1 creator was .+\.$/);
    const creator = h2().replace("Your #1 creator was ", "").replace(/\.$/, "");
    const avatar = within(slide()).getByRole("img", { name: creator });
    expect(avatar.getAttribute("style")).toMatch(/width: 176px/);
    expect(slide().querySelectorAll("li")).toHaveLength(0);
    expect(slide().querySelector("[data-hero-px]")!.getAttribute("data-hero-px")).toBe("120");

    next(); // 4: top 5 list with monograms
    check();
    expect(h2()).toBe(en.slides.topCreators.headline);
    expect(slide().querySelectorAll("li")).toHaveLength(5);

    next(); // 5: favorite video; demo thumbnail can't render in jsdom -> placeholder
    check();
    expect(h2()).toBe(en.slides.favoriteVideo.headline);
    expect(within(slide()).getByTestId("video-thumb")).toBeTruthy();
    expect(slide().textContent).toMatch(/watched \d+ times\./);

    next(); // 6
    check();
    expect(h2()).toMatch(/^[A-Z][a-z]+ was your biggest month\.$/);
    next(); // 7: prime time with heatmap header + badge
    check();
    expect(h2()).toMatch(/^Prime time: [A-Z][a-z]+days at \d{1,2}\u00a0(AM|PM)\.$/);
    expect(slide().textContent).toMatch(/Day × hour · /);
    expect(within(slide()).getByTestId("badge-share").textContent).toMatch(new RegExp(`^(${Object.values(en.slides.primeTime.badges).join("|")}): \\d+% of plays (${Object.values(en.slides.primeTime.badgeWindows).join("|")})$`));
    next(); // 8
    check();
    expect(h2()).toMatch(/^\d+ days in a row\.$/);
    next(); // 9
    check();
    expect(h2()).toBe(en.slides.topSearches.headline);
    next(); // 10
    check();
    expect(h2()).toMatch(/^You played [\d,]+ songs on YouTube Music\.$/);
    next(); // 11
    check();
    expect(h2()).toBe(en.slides.topSongs.headline);
    next(); // 12: share
    check();
    expect(h2()).toBe(en.slides.share.headline.last12);
    expect(within(slide()).getAllByTestId("share-stamp")[0].textContent).toBe(en.appName);

    expect(new Set(seen).size).toBe(12);
    expect(heroes.length).toBeGreaterThanOrEqual(7);
    expect(Math.min(...heroes)).toBeGreaterThanOrEqual(96);
    expect(violations).toEqual([]);

    // Period sheet: switching to All time keeps us on the share slide with the allTime headline.
    fireEvent.keyDown(region(), { key: "ArrowLeft" });
    fireEvent.click(screen.getByRole("button", { name: /Change time period/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: en.periodSheet.allTime }));
    next();
    expect(h2()).toBe(en.slides.share.headline.allTime);
  });

  it("durations failing drops the watch-time slide (11 slides); share card swaps to the peak-hour tile", () => {
    render(<DemoStory />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getAllByTestId("story-progress")).toHaveLength(11);
    next();
    expect(h2()).toMatch(/^Your #1 creator was/);
    for (let i = 0; i < 9; i++) next();
    expect(h2()).toBe(en.slides.share.headline.last12);
    expect(slide().querySelector('[data-share-card="story"]')!.textContent).toContain(en.slides.primeTime.peakLabel);
  });

  it("the contrast checker itself catches banned pairs", () => {
    const div = document.createElement("div");
    div.innerHTML = '<div class="bg-mustard"><span class="text-tomato">x</span></div><div class="bg-teal"><p class="text-ink">y</p><p class="text-paper-2">ok</p></div>';
    expect(contrastViolations(div)).toEqual(['tomato on mustard: "x"', 'ink on teal: "y"']);
  });
});
