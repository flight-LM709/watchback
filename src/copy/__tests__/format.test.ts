import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { en } from "../en";
import { badgeDetail, badgeName, badgeShareLine, errorMessage, fill, fillNodes, peakValue, periodVariant, primeTimeHeadline, siteLabel } from "../format";
import { PEAK_HOUR_WINDOWS } from "@/lib/takeout/stats";

describe("copy helpers", () => {
  it("fill replaces placeholders and leaves unknown ones visible", () => {
    expect(fill(en.player.ariaProgress, { current: 2, total: 8 })).toBe("Slide 2 of 8");
    expect(fill("{a} and {b}", { a: 1 })).toBe("1 and {b}");
  });
  it("fillNodes keeps React nodes (e.g. a clamped title)", () => {
    const html = renderToStaticMarkup(createElement("p", null, fillNodes(en.slides.favoriteVideo.sub, { title: createElement("span", { className: "clamp-title" }, "Cats"), n: 3 })));
    expect(html).toBe('<p><span class="clamp-title">Cats</span>, watched 3 times.</p>');
  });
  it("period variants", () => {
    expect(periodVariant({ type: "last12Months" })).toBe("last12");
    expect(periodVariant({ type: "calendarYear", year: 2025 })).toBe("year");
    expect(periodVariant({ type: "allTime" })).toBe("allTime");
    expect(periodVariant({ type: "custom", start: new Date(0), end: new Date(1) })).toBe("last12");
  });
  it("every badge has a name in en.ts", () => {
    for (const w of PEAK_HOUR_WINDOWS) expect(badgeName(w.badge)).toBeTruthy();
    expect(badgeName("night-owl")).toBe("Night owl");
  });
  it("error codes map to Copywriter's messages", () => {
    expect(errorMessage("NOT_TAKEOUT_ZIP")).toBe(en.errors.notTakeout);
    expect(errorMessage("NO_WATCH_HISTORY")).toBe(en.errors.noHistory);
  });
  it("prime time: plural day names (getDay order), peak value, badge detail + one-liner", () => {
    expect(en.slides.primeTime.headline).not.toContain("{day}s");
    expect(primeTimeHeadline(0, "6 PM")).toBe("Prime time: Sundays at 6 PM.");
    expect(primeTimeHeadline(6, "10 PM")).toBe("Prime time: Saturdays at 10 PM.");
    expect(peakValue(0, "5 AM")).toBe("Sun 5 AM");
    expect(peakValue(3, "11 PM")).toBe("Wed 11 PM");
    expect(badgeDetail({ badge: "early-bird", pct: 19 })).toBe("19% of plays between 5 and 9 AM");
    expect(badgeShareLine({ badge: "night-owl", pct: 41 })).toBe("Night owl: 41% of plays between 10 PM and 5 AM");
  });
  it("share-card site: host without www.", () => {
    expect(siteLabel("www.watchback.app")).toBe("watchback.app");
    expect(siteLabel("watchback.app")).toBe("watchback.app");
    expect(siteLabel("localhost:3005")).toBe("localhost:3005");
    expect(siteLabel("")).toBe("");
  });
});
