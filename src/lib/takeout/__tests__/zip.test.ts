import { describe, expect, it } from "vitest";
import { NoWatchHistoryError, NotTakeoutZipError, TakeoutError, type ProgressInfo } from "../types";
import { parseTakeoutZip } from "../zip";
import { fixture, makeZip } from "./helpers";

const opts = { fallbackTimeZone: "Asia/Jakarta" };

describe("parseTakeoutZip", () => {
  it("reads the English JSON export and reports progress", async () => {
    const zip = await makeZip({
      "Takeout/archive_browser.html": "<html></html>",
      "Takeout/YouTube and YouTube Music/history/watch-history.json": fixture("watch-history.en.json"),
      "Takeout/YouTube and YouTube Music/history/search-history.json": fixture("search-history.en.json"),
      "Takeout/YouTube and YouTube Music/subscriptions/subscriptions.csv": "a,b",
    });
    const progress: ProgressInfo[] = [];
    const r = await parseTakeoutZip(zip, { ...opts, onProgress: (p) => progress.push(p), progressEvery: 1 });
    expect(r.diagnostics.watchEvents).toBe(12);
    expect(r.diagnostics.searchEvents).toBe(4);
    expect(r.diagnostics.sources.map((s) => s.role).sort()).toEqual(["search", "watch"]);
    // sorted ascending
    const ts = r.events.map((e) => e.timestamp.getTime());
    expect([...ts].sort((a, b) => a - b)).toEqual(ts);
    expect(progress.some((p) => p.phase === "parsing" && p.watchCount > 0)).toBe(true);
    expect(progress.at(-1)).toMatchObject({ phase: "done", watchCount: 12 });
  });

  it("finds localized folders + unknown file names by content (Indonesian HTML)", async () => {
    const zip = await makeZip({
      "Takeout/YouTube dan YouTube Music/histori/histori-tontonan.html": fixture("histori-tontonan.id.html"),
    });
    const r = await parseTakeoutZip(zip, opts);
    expect(r.diagnostics.sources).toEqual([
      { path: "Takeout/YouTube dan YouTube Music/histori/histori-tontonan.html", format: "html", role: "watch", entries: 6 },
    ]);
    expect(r.events.filter((e) => e.kind === "watch")).toHaveLength(5);
  });

  it("English HTML export", async () => {
    const zip = await makeZip({
      "Takeout/YouTube and YouTube Music/history/watch-history.html": fixture("watch-history.en.html"),
      "Takeout/YouTube and YouTube Music/history/search-history.html": fixture("search-history.en.html"),
    });
    const r = await parseTakeoutZip(zip, opts);
    expect(r.diagnostics.watchEvents).toBe(7);
    expect(r.diagnostics.searchEvents).toBe(2);
  });

  it("prefers JSON when both formats are present", async () => {
    const zip = await makeZip({
      "Takeout/YouTube and YouTube Music/history/watch-history.html": fixture("watch-history.en.html"),
      "Takeout/YouTube and YouTube Music/history/watch-history.json": fixture("watch-history.en.json"),
    });
    const r = await parseTakeoutZip(zip, opts);
    expect(r.diagnostics.sources).toHaveLength(1);
    expect(r.diagnostics.sources[0].format).toBe("json");
  });

  it("accepts a split export (multiple zips)", async () => {
    const a = await makeZip({ "Takeout/Drive/foo.txt": "x" });
    const b = await makeZip({ "Takeout/YouTube and YouTube Music/history/watch-history.json": fixture("watch-history.en.json") });
    const r = await parseTakeoutZip([a, b], opts);
    expect(r.diagnostics.watchEvents).toBe(12);
  });

  it("falls back to My Activity/YouTube/MyActivity.json", async () => {
    const mixed = JSON.stringify([
      ...JSON.parse(fixture("watch-history.en.json")),
      ...JSON.parse(fixture("search-history.en.json")),
    ]);
    const zip = await makeZip({ "Takeout/My Activity/YouTube/MyActivity.json": mixed });
    const r = await parseTakeoutZip(zip, opts);
    expect(r.diagnostics.watchEvents).toBe(12);
    expect(r.diagnostics.searchEvents).toBe(4);
    expect(r.diagnostics.sources[0].role).toBe("activity");
  });

  it("works with a Blob input", async () => {
    const zip = await makeZip({ "Takeout/YouTube and YouTube Music/history/watch-history.json": fixture("watch-history.en.json") });
    const r = await parseTakeoutZip(new Blob([zip as BlobPart]), opts);
    expect(r.diagnostics.watchEvents).toBe(12);
  });

  describe("errors", () => {
    it("not a zip -> NotTakeoutZipError", async () => {
      const err = await parseTakeoutZip(new TextEncoder().encode("hello"), opts).catch((e) => e);
      expect(err).toBeInstanceOf(NotTakeoutZipError);
      expect(err).toBeInstanceOf(TakeoutError);
      expect(err.code).toBe("NOT_TAKEOUT_ZIP");
    });
    it("random zip -> NotTakeoutZipError", async () => {
      const zip = await makeZip({ "photos/cat.jpg": "x", "notes.json": "[]" });
      await expect(parseTakeoutZip(zip, opts)).rejects.toBeInstanceOf(NotTakeoutZipError);
    });
    it("Takeout without YouTube history -> NoWatchHistoryError", async () => {
      const zip = await makeZip({ "Takeout/archive_browser.html": "<html></html>", "Takeout/Drive/a.txt": "x" });
      const err = await parseTakeoutZip(zip, opts).catch((e) => e);
      expect(err).toBeInstanceOf(NoWatchHistoryError);
      expect(err.code).toBe("NO_WATCH_HISTORY");
    });
    it("only search history -> NoWatchHistoryError", async () => {
      const zip = await makeZip({ "Takeout/YouTube and YouTube Music/history/search-history.json": fixture("search-history.en.json") });
      await expect(parseTakeoutZip(zip, opts)).rejects.toBeInstanceOf(NoWatchHistoryError);
    });
    it("empty watch history -> NoWatchHistoryError", async () => {
      const zip = await makeZip({ "Takeout/YouTube and YouTube Music/history/watch-history.json": "[]" });
      await expect(parseTakeoutZip(zip, opts)).rejects.toBeInstanceOf(NoWatchHistoryError);
    });
  });
});
