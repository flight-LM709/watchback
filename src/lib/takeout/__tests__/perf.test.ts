import { describe, expect, it } from "vitest";
import { parseJsonHistory } from "../parseJson";
import { parseHtmlHistory } from "../parseHtml";
import { computeStats } from "../stats";

const N = 150_000;

function id(i: number) {
  return ("v" + i.toString(36)).padEnd(11, "_").slice(0, 11);
}

describe("performance (150k entries)", () => {
  it("JSON parse + stats", () => {
    const start = Date.UTC(2023, 0, 1);
    const entries = Array.from({ length: N }, (_, i) => ({
      header: i % 5 === 0 ? "YouTube Music" : "YouTube",
      title: `Watched Video ${i % 20000}`,
      titleUrl: `https://www.youtube.com/watch?v=${id(i % 20000)}`,
      subtitles: [{ name: `Channel ${i % 300}`, url: `https://www.youtube.com/channel/UC${i % 300}` }],
      time: new Date(start + i * 210_000).toISOString(),
      products: ["YouTube"],
      activityControls: ["YouTube watch history"],
      ...(i % 97 === 1 ? { details: [{ name: "From Google Ads" }] } : {}),
    }));
    const text = JSON.stringify(entries);
    let calls = 0;
    const t0 = performance.now();
    const { events } = parseJsonHistory(text, { role: "watch", onProgress: () => calls++ });
    const t1 = performance.now();
    const stats = computeStats(events, { timeZone: "Asia/Jakarta", range: { type: "allTime" } });
    const t2 = performance.now();
    console.log(`JSON ${N}: parse ${(t1 - t0).toFixed(0)}ms, stats ${(t2 - t1).toFixed(0)}ms`);
    expect(events).toHaveLength(N);
    expect(calls).toBeGreaterThan(50);
    expect(stats.adsExcluded).toBe(Math.floor((N - 2) / 97) + 1);
    expect(t1 - t0).toBeLessThan(5000);
    expect(t2 - t1).toBeLessThan(3000);
  });

  it("HTML parse", () => {
    const cells: string[] = [];
    for (let i = 0; i < N; i++) {
      const d = new Date(Date.UTC(2023, 0, 1) + i * 210_000);
      const date = d.toLocaleString("en-US", { timeZone: "Asia/Jakarta", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" }) + " WIB";
      cells.push(
        `<div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp"><div class="mdl-grid"><div class="header-cell mdl-cell mdl-cell--12-col"><p class="mdl-typography--title">YouTube<br></p></div><div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">Watched&nbsp;<a href="https://www.youtube.com/watch?v=${id(i % 20000)}">Video ${i}</a><br><a href="https://www.youtube.com/channel/UC${i % 300}">Channel ${i % 300}</a><br>${date}<br></div><div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1 mdl-typography--text-right"></div><div class="content-cell mdl-cell mdl-cell--12-col mdl-typography--caption"><b>Products:</b><br>&emsp;YouTube<br></div></div></div>`,
      );
    }
    const html = `<html><body><div class="mdl-grid">${cells.join("")}</div></body></html>`;
    const t0 = performance.now();
    const { events, diagnostics } = parseHtmlHistory(html, { role: "watch", fallbackTimeZone: "Asia/Jakarta" });
    const t1 = performance.now();
    console.log(`HTML ${N} (${(html.length / 1e6).toFixed(0)}MB): parse ${(t1 - t0).toFixed(0)}ms`);
    expect(events).toHaveLength(N);
    expect(diagnostics.unparsedDates).toBe(0);
    expect(events[0].timestamp.toISOString()).toBe("2023-01-01T00:00:00.000Z");
    expect(t1 - t0).toBeLessThan(10000);
  });
});
