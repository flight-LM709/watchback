// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { en } from "@/copy/en";
import { DemoStory } from "../demo-story";

afterEach(cleanup);
const region = () => screen.getByRole("region");
const next = () => fireEvent.keyDown(region(), { key: "ArrowRight" });
const h2 = () => region().querySelector("h2")?.textContent ?? "";

describe("/demo slides use en.ts copy", () => {
  it("headlines, estimate explainer, badge names, period variants and the appName stamp", () => {
    render(<DemoStory />);
    expect(h2()).toMatch(/^You pressed play on [\d,]+ videos\.$/);
    next();
    expect(h2()).toMatch(/^≈ [\d,]+ hours of watching\.$/);
    fireEvent.click(screen.getByRole("button", { name: /Estimate/ }));
    expect(screen.getByRole("note").textContent).toBe(en.slides.watchTime.chipExplainer);
    next();
    expect(h2()).toBe(en.slides.topCreators.headline);
    expect(screen.getAllByText(/^\d+ videos$/).length).toBeGreaterThan(0);
    next(); // favorite video
    expect(h2()).toBe(en.slides.favoriteVideo.headline);
    next(); // busiest month (last12 variant)
    expect(h2()).toMatch(/^[A-Z][a-z]+ was your biggest month\.$/);
    next(); // peak-hour badge
    expect(Object.values(en.slides.primeTime.badges)).toContain(h2());
    next(); // top songs
    expect(h2()).toBe(en.slides.topSongs.headline);
    next(); // share
    expect(h2()).toBe(en.slides.share.headline.last12);
    expect(screen.getByTestId("share-stamp").textContent).toBe(en.appName);

    // switch to all time: share + busiest month use the allTime variants, story stays on the share slide
    fireEvent.click(screen.getByRole("button", { name: /Change time period/ }));
    fireEvent.click(screen.getByRole("option", { name: en.period.allTime }));
    expect(h2()).toBe(en.slides.share.headline.allTime);
  });

  it("drops the watch-time slide and shows the fallback tooltip when durations fail", () => {
    render(<DemoStory />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByTestId("watch-time-unavailable"));
    expect(screen.getByRole("note").textContent).toBe(en.slides.watchTime.unavailableTooltip);
    next();
    expect(h2()).toBe(en.slides.topCreators.headline); // watch-time slide skipped
  });
});
