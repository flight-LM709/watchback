# Watchback

A "year in review" for YouTube and YouTube Music, built from a Google Takeout export.
**The Takeout .zip is parsed entirely in the browser, in a Web Worker. Nothing gets uploaded.**

Stack: Next.js 16 (App Router), TypeScript, Tailwind 4, JSZip, Vitest, pnpm.

```bash
pnpm install
pnpm dev          # / = the app (landing → upload → story), /demo = story with synthetic data, /debug = raw parser output
pnpm test         # vitest run (includes QA fixtures if /workspace/watchback-fixtures/out exists)
pnpm test:fixtures  # QA fixture suite only (override dir with WATCHBACK_FIXTURES_DIR)
YOUTUBE_API_MOCK=1 pnpm start   # fake durations for /api/durations without an API key
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
* **All calendar bucketing** (hour, weekday, date, month, streaks, range boundaries, peak-hour badge) happens in `StatsOptions.timeZone`, which defaults to `Intl.DateTimeFormat().resolvedOptions().timeZone`.
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

### Peak-hour badge
`stats.peakHourBadge` is `{ badge, pct, plays } | null` (also exported as `peakHourBadge(hourOfDay)`). It picks one of six local-time windows that cover the whole day:

| Badge | Window |
| --- | --- |
| early-bird | 5–9 |
| coffee-break | 9–11 |
| lunch-break | 11–14 |
| afternoon-drifter | 14–18 |
| evening-regular | 18–22 |
| night-owl | 22–5 |

* The winner is the window with the highest **plays per hour** (plays ÷ window length), so the 7-hour night-owl window can't win just by being wide. Ties go to more raw plays, then table order.
* `pct` is the integer % of all plays that fall in the winning window. The result is null only when there are zero plays.

## UI: Paper Mixtape (`design/SPEC.md`, `design/tokens.css`)

Designer's tokens are pasted into `src/app/globals.css` (`@theme static` + the plain `:root` vars, fonts via
`next/font` in `layout.tsx`). Follow the tokens.css contrast list: no tomato text on mustard (ink), text on
teal / teal-dark / tomato (heat-8) / ink is paper-2, no text in heat-6/7, mustard is never text. A test helper
(`src/test-utils/contrast.ts`) checks rendered slides, share cards and screens for those pairs.

| Where | What |
| --- | --- |
| `src/components/story/` | `StoryPlayer` (progress bars, brand row + ✕, tap left third = back / right two thirds = next, hold ≥250ms to pause, ←/→/Space, SR buttons, aria-live progress, first-run hints, "Tap to continue" under reduced motion; `bare` slides hide the chrome), `PeriodPill` (opens the period **bottom sheet**), `planSlides`, `useStoryStats` |
| `src/components/paper/` | Sticker, TapeStrip, HandCircle, Underline, VHSLabel, `HeroNumber` (≥ 96px always, roll-up, final value for screen readers), `MonogramSticker`, EstimateChip, `BottomSheet` (role=dialog, aria-modal, focus trap, Esc / ✕ / scrim close, focus returns to the opener), decorative SVGs |
| `src/components/watchback/` | `WatchbackStory` (the 12 slides + explainer sheet + share slide), `slides.tsx`, `charts.tsx` (heatmap, bar chart, streak calendar, CSS cassette), `share.tsx`, `VideoThumb` + `useThumbnailCache`, `screens.tsx` (landing / upload / crunching), `App.tsx` |
| `src/lib/monogram/` | `initials()` + FNV-1a palette/tilt hash, exactly SPEC §8 |
| `src/lib/thumb/client.ts` | `fetchThumbnail(id)` for Backend's `POST /api/thumb` |

* **Story (12 slides when everything is present):** total videos · watch time · #1 creator · top 5 creators · favorite video · busiest month · prime time (heatmap **and** the peak-hour badge; there's no separate badge slide) · streak · top searches · music total · top songs · share. `planSlides` drops what has no data (watch time when durations failed, music slides without Music, etc.), and the progress bars show the planned count.
* **Favorite video thumbnail:** only via `POST /api/thumb` with `{ id }` (never `i.ytimg.com`), only for valid 11-char IDs, `AbortSignal.timeout(3000)`. Non-2xx (incl. 404 while the route didn't exist), network errors, decode errors and >3 s all keep the hatch placeholder; a response that arrives after the timeout is discarded, so nothing swaps in late. The image fades in over 200ms (no fade with reduced motion); `alt` is the full title. The blob URL is held per video ID at **story level** (`useThumbnailCache`), so it survives the slide unmounting and period switches, and is revoked only when the story unmounts.
* **Share images:** `ShareCard` lays out at 360×640 and 360×360 CSS px; `renderCardPng` waits for `document.fonts.ready` and exports with `html-to-image` at `pixelRatio: 3` (1080×1920 / 1080×1080). When watch time is unavailable the tile becomes "Your peak hour" with an ⓘ; its tooltip renders outside the card node and the ⓘ carries `data-export-exclude`, so neither is ever in the PNG. The stamp is `en.appName` (uppercased in CSS). The PNG has flat paper-2 instead of grain (feTurbulence doesn't survive the foreignObject render).
* **Pre-story screens:** landing shows `privacy.body` in full; the upload cassette is the `<label>` for a hidden `.zip` input (drag-over: tomato label border, scale 1.02, reels spin; error: 300ms shake + tomato text with a 2px rule) and shows `upload.cassetteLabel`; crunching shows the live count.
* **Watch time in the real app:** one `/api/durations` request (≤ 2,000 IDs, sampled from the default period) after parsing; each period's estimate reuses those durations (IDs not looked up are filled from the sampled average).
* **Motion:** rise/slap/tape/draw-on/bar-grow per SPEC §4, all replaced by short fades or nothing under `prefers-reduced-motion`. Grain is never animated.
* **Line clamping:** `clamp-title` (2 lines) for video titles, `clamp-name` (1 line, ellipsis) for creator/artist/song/search strings. Strings are never cut in JS.
* **`/demo`:** deterministic synthetic history (2023 has no Music), a generated stand-in thumbnail (no network), and a checkbox that simulates the durations endpoint failing.
* **Component tests** use jsdom 26 + Testing Library (opt-in per file via `// @vitest-environment jsdom`). jsdom 27+ needs Node 22.

### Copy

All user-facing words come from Copywriter's `src/copy/en.ts` (don't hardcode strings). Helpers in
`src/copy/format.ts`: `fill(template, vars)`, `fillNodes` (when a placeholder holds JSX, e.g. a clamped title),
`periodVariant(range)` (last12 / year / allTime; custom ranges use last12 wording), `badgeName`, `errorMessage`.
`StoryPlayer` takes `copy` (defaults to `en.player`): aria-live progress, visually hidden Prev/Pause-Play/Next
buttons, first-slide gesture + keyboard hints (keyboard hint hidden on coarse pointers), and a "Tap to continue"
prompt when reduced motion turns off auto-advance. `PeriodPill` gets its `label`/`options` from `useStoryStats`.
The share-card stamp renders `en.appName` uppercased in CSS (`deco.shareStamp` and `deco.runnersUp` are unused).

## Stat definitions

Which plays each slide counts. The one switch is `TIME_STATS_BASIS` in `src/lib/takeout/stats.ts`, checked by
`countsForTimeStats(event)`. Change that constant (or pass `computeStats(events, { timeBasis })`) if the definition changes.

| Stat | Counts |
| --- | --- |
| **Busiest month** (`monthly`, `busiestMonth`) | YouTube (non-Music) plays, **including removed/private videos**, **excluding ads and YouTube Music** |
| **Prime time** (`heatmap`, `hourOfDay`, `dayOfWeek`, `peak`) | same |
| **Peak-hour badge** (`peakHourBadge`) | same |
| **Streak** (`longestStreak`, local calendar days) | same |
| **Per-day average** (`avgVideosPerDay` = those plays ÷ local days in range) | same |
| Total videos, top creators, favorite video | non-ad YouTube (non-Music) plays; favorite video skips removed/private videos |
| Watch time | non-ad plays with a looked-up duration, Music included (via `uniqueVideoIds`) |
| Music slides (top songs/artists, music plays) | YouTube Music plays only |
| `uniqueVideoIds` | every non-ad play with an ID, **including Music** (it feeds `/api/durations`) |

`TIME_STATS_BASIS` values:
* `"youtube-videos"` (default, Project Lead's call): the definition above.
* `"all-plays"`: every non-ad play, Music included.
* `"linked-videos"`: YouTube plays that still have a video link (removed videos excluded).

Ads and searches never count toward any time-based stat. `stats.timeBasis` records which basis produced a result.
QA's fixture suite (`pnpm test:fixtures`) asserts these stats with its own `QA_TIME_BASIS` constant, currently the same default.

## For Backend Dev: duration lookup (watch-time estimate)

**Hard cap: 2,000 video IDs per upload, sent in a single request.** Only IDs leave the device. Play counts and timestamps never do.

```
POST /api/durations     { "ids": ["dQw4w9WgXcQ", ...] }        // 1..2000 unique IDs, one request
200                     { "durations": { "dQw4w9WgXcQ": 213, "xxxxxxxxxxx": null } }   // seconds; null = unknown/private/removed
```

* Every ID matches `/^[A-Za-z0-9_-]{11}$/` (exported as `VIDEO_ID_PATTERN`). Please reject requests with more than 2,000 IDs or any malformed ID, and don't log or store the IDs (the privacy copy depends on it).
* An ID missing from `durations` is treated the same as `null`.

The client is `lookupWatchTime(stats)` / `fetchDurations(ids)` in `src/lib/takeout/durationsClient.ts`. It sends a single request, and any HTTP or network error, bad JSON or timeout becomes `durations: {}`, so the watch-time slide is dropped. The contract tests run the client against Backend Dev's real handler. Underneath, it does the following (`src/lib/takeout/watchTime.ts`):

```ts
const stats = computeStats(events);
const sample = buildDurationSample(stats, { cap: 2000 });           // { ids, topIds, sampleIds, scale, ... }
const { durations } = await (await fetch("/api/durations", { method: "POST", body: JSON.stringify({ ids: sample.ids }) })).json();
const wt = estimateWatchTime(durations, stats.playCountsById, sample); // { seconds, isEstimate: true, coverage, exactSeconds } | null
// wt === null -> no durations came back -> drop the watch-time slide
```

* **At or under 2,000 unique IDs**: every ID is sent, `scale = 1`, and the result is exact apart from null durations.
* **Over 2,000**: we send the top 1,000 most-played IDs (counted exactly) plus a uniform random sample of 1,000 from the rest (seedable via `seed`). The rest is extrapolated: `sampledSeconds × restPlays / (plays of sampled IDs that returned a duration)`.
* Null durations among the top IDs are filled in at the top group's average seconds per play. If a whole group has no durations, it borrows the other group's average.
* Each play counts as `min(duration, 10800s)`.
* `coverage` is the share of plays whose duration was actually looked up. On a synthetic 40k-ID history the estimate came within about 0.3–2.6% of the true total across 5 seeds.
* Every play counts as watched to the end, **capped at 3 hours per play** (`MAX_SECONDS_PER_PLAY = 10800`). So a 10-hour livestream watched once counts as 3h, and the cap also applies inside the sampled and averaged math.
