import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { en } from "../en";
import { badgeName, errorMessage, fill, fillNodes, periodVariant } from "../format";
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
});
