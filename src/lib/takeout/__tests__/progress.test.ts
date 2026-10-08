import { describe, expect, it } from "vitest";
import { isPreparing, progressFraction, throttleProgress } from "../progress";
import type { ProgressInfo } from "../types";
import { parseTakeoutZip } from "../zip";
import { makeZip } from "./helpers";

const p = (phase: ProgressInfo["phase"], processed: number, total: number, watchCount = 0): ProgressInfo => ({ phase, processed, total, watchCount });

function bigWatchHistory(n: number): string {
  const entries = Array.from({ length: n }, (_, i) => ({
    header: "YouTube",
    title: `Watched Video ${i}`,
    titleUrl: `https://www.youtube.com/watch?v=${String(i).padStart(11, "A")}`,
    subtitles: [{ name: `Channel ${i % 50}`, url: `https://www.youtube.com/channel/UC${i % 50}` }],
    time: new Date(Date.UTC(2025, 0, 1) + i * 60_000).toISOString(),
    products: ["YouTube"],
    activityControls: ["YouTube watch history"],
  }));
  return JSON.stringify(entries);
}

describe("parse progress (regression: counter looked stuck at 0 on large-100k.zip)", () => {
  it("reports inflate progress for the file being read, then rising counts before done", async () => {
    const zip = await makeZip({ "Takeout/YouTube and YouTube Music/history/watch-history.json": bigWatchHistory(6000) });
    const events: ProgressInfo[] = [];
    await parseTakeoutZip(zip, { fallbackTimeZone: "UTC", progressEvery: 500, onProgress: (e) => events.push(e) });

    const phases = events.map((e) => e.phase).filter((ph, i, a) => ph !== a[i - 1]);
    expect(phases).toEqual(["unzipping", "locating", "reading", "parsing", "done"]);
    const reading = events.filter((e) => e.phase === "reading");
    expect(reading.at(-1)).toMatchObject({ processed: 100, total: 100, watchCount: 0, file: expect.stringMatching(/watch-history\.json$/) });

    const counts = events.filter((e) => e.phase === "parsing").map((e) => e.watchCount);
    expect(new Set(counts.filter((c) => c > 0 && c < 6000)).size).toBeGreaterThanOrEqual(10); // 500, 1000, … not one jump
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(events.at(-1)).toMatchObject({ phase: "done", watchCount: 6000 });
  });

  it("throttle drops in-between updates but never phase changes, a phase's 100% or done", () => {
    let t = 0;
    const posted: ProgressInfo[] = [];
    const post = throttleProgress((e) => posted.push(e), 100, () => t);
    post(p("unzipping", 0, 100));
    post(p("locating", 0, 1)); // phase change, same ms
    post(p("reading", 10, 100)); // phase change
    t = 20; post(p("reading", 40, 100)); // dropped
    t = 40; post(p("reading", 100, 100)); // end of phase
    t = 50; post(p("parsing", 0, 6000)); // phase change
    t = 90; post(p("parsing", 500, 6000, 500)); // dropped
    t = 160; post(p("parsing", 1000, 6000, 1000)); // 110ms later
    t = 170; post(p("done", 1, 1, 6000));
    expect(posted.map((e) => `${e.phase}:${e.processed}`)).toEqual([
      "unzipping:0", "locating:0", "reading:10", "reading:100", "parsing:0", "parsing:1000", "done:1",
    ]);
  });

  it("bar fraction moves forward across phases; the phase label shows only while nothing is counted yet", () => {
    const seq = [p("unzipping", 0, 100), p("unzipping", 100, 100), p("locating", 0, 2), p("reading", 50, 100), p("reading", 100, 100), p("parsing", 0, 10), p("parsing", 5, 10), p("done", 1, 1)];
    const f = seq.map(progressFraction);
    expect(f).toEqual([...f].sort((a, b) => a - b));
    expect(f[0]).toBe(0);
    expect(f.at(-1)).toBe(1);

    expect(isPreparing("unzipping", 0)).toBe(true);
    expect(isPreparing("reading", 0)).toBe(true);
    expect(isPreparing("parsing", 0)).toBe(false);
    expect(isPreparing("reading", 42)).toBe(false); // a later file inflating keeps the count on screen
  });
});
