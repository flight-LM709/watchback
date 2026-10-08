# Watchback

A "year in review" for YouTube and YouTube Music, built from a Google Takeout export.
**The Takeout .zip is parsed entirely in the browser, in a Web Worker. Nothing gets uploaded.**

Stack: Next.js 16 (App Router), TypeScript, Tailwind 4, JSZip, Vitest, pnpm.

```bash
pnpm install
pnpm dev          # placeholder page at / (drop a Takeout .zip to dump stats as JSON)
pnpm test         # vitest run
pnpm build
```

## Parser: `src/lib/takeout/`

| File | What it does |
| --- | --- |
| `zip.ts` | `parseTakeoutZip(zipOrZips, { onProgress, fallbackTimeZone })` finds the history files, parses them, and returns `{ events, diagnostics }` |
| `parseJson.ts` / `parseHtml.ts` | Per-format parsers. Pure and DOM-free. The HTML parser is string-based because `DOMParser` doesn't exist in workers |
| `entries.ts`, `normalize.ts` | Shared classification: localized verbs, video-ID/Shorts/Music URLs, ads, removed videos |
| `dates.ts` | Locale-aware parser for HTML date strings |
| `stats.ts` | `computeStats(events, { range, timeZone })`. Pure functions; all bucketing uses `timeZone` |
| `tz.ts` | Intl-based timezone helpers (`LocalClock` caches offsets per day) |
| `worker.ts`, `client.ts`, `protocol.ts` | Web Worker entry and the main-thread helper `parseTakeoutInWorker(files, { onProgress })` |
| `types.ts` | `TakeoutEvent`, diagnostics, and the typed errors `NotTakeoutZipError` / `NoWatchHistoryError` (with `code`) |

### Finding the history files
* The user drops the .zip as-is; split exports (`-001.zip`, `-002.zip`) are also accepted as an array.
* Matching uses **file name patterns and content, not exact paths**. Known names (`watch-history`, `search-history`, plus a few localized guesses) are tried first. After that, any `.json`/`.html` under a path containing "youtube" is content-sniffed (an activity JSON array, or MyActivity `outer-cell` HTML) and classified by its URLs (watch vs. search).
* If there's no dedicated history file, `My Activity/YouTube/MyActivity.(json|html)` is used as a fallback.
* JSON is preferred over HTML when both are present.

### Timezones
* Takeout JSON times are UTC ISO strings. HTML dates are wall-clock strings with a zone abbreviation.
* **All calendar bucketing** (hour, weekday, date, month, streaks, range boundaries, night-owl) happens in `StatsOptions.timeZone`, which defaults to `Intl.DateTimeFormat().resolvedOptions().timeZone`.
* The default range is the **12 local calendar months ending with the latest watch's month**, so the month chart always has exactly 12 buckets. `calendarYear` and `allTime` ranges are also available, plus `custom`.

### Known limitations / edge cases
* **HTML dates**
  * Month names are supported in en/id/ms/es/pt/fr/de/nl/it/tr, matched by unique prefix (so `Agu`, `Agt`, `juil.`, `März` all work). Numeric `d.m.y`, `y-m-d`, CJK `年月日`, and Korean `오전/오후` are also handled.
  * Zone abbreviations come from a fixed table (WIB/WITA/WIT, US, EU, AU, and others). Unknown abbreviations or missing zones are read as wall time in `fallbackTimeZone` (the browser zone) and counted in `diagnostics.unknownTimezones`.
  * Ambiguous abbreviations (CST, IST, BST, AST, PST) are resolved from the fallback zone's region.
  * Slash dates (`05/01/2024`) are ambiguous. The order is detected across the whole file, and if every date is ≤12/≤12 we assume day-first.
  * HTML only has second precision. Dates we can't parse are dropped and sampled in `diagnostics.unparsedDateSamples`.
  * Not supported: AM/PM markers before the time in non-CJK languages, and non-Latin month names (Thai, Arabic, Russian…).
* **Localized verbs**: there's a known list (Watched/Menonton/Ditonton, Searched for/Menelusuri, Visited/Mengunjungi, and es/pt/fr/de/it/nl variants). For JSON in an unknown language, the verb is learned from the file as a common prefix or suffix of titles that have watch URLs (this needs 20+ samples). HTML doesn't depend on verbs, because the title is the link text.
* **Removed videos** have no video ID. **Private/deleted** videos keep their ID but use the URL as the title. Both are `unavailable: true`: they count toward totals, but they can't be the favorite video or a top song.
* **Shorts**: Takeout usually records Shorts as plain `watch?v=` URLs, so `isShort` / `shortsWatched` only catches `/shorts/` URLs and undercounts.
* **Ads** (`From Google Ads` / `Dari Google Ads`) stay in `events` with `isAd: true` and are reported as `adsExcluded`. They're left out of every other stat and out of `uniqueVideoIds`.
* "Visited YouTube Music" entries are dropped and counted in `diagnostics.visitEntries`.
* "Watched" ≠ finished. Each entry counts as one play.

## For Backend Dev: video ID list for the duration lookup

`computeStats(...).uniqueVideoIds: string[]` is a list of unique, non-ad YouTube **and** YouTube Music video IDs in the selected range, most-played first. Every ID matches `/^[A-Za-z0-9_-]{11}$/` (exported as `VIDEO_ID_PATTERN`). A heavy user can have tens of thousands of IDs per year.

Proposed contract (only IDs leave the device, never counts or timestamps):

```
POST /api/durations        { "ids": ["dQw4w9WgXcQ", ...] }    // client sends chunks of <= 1000
200                        { "durations": { "dQw4w9WgXcQ": 213, "xxxxxxxxxxx": null } }  // seconds; null = unknown/private
```

The client computes `watchSeconds ≈ Σ durations[id] × stats.playCountsById[id]`. `playCountsById` stays client-side.
