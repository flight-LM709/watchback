# Watchback · Paper Mixtape build spec

For Frontend Dev. Direction B, picked by vedrico. Mockups: `B/*.png` (story order in `B/order.json`, overview `B-contact-full.png`). Tokens: `tokens.css`. SVGs: `assets/`. Copy: `src/copy/en.ts` (branch `copy/en`). Use its keys. Don't hard-code strings from the mockups.

## 1. Foundations
- Paste the `@theme` block from `tokens.css` into `globals.css`. The utilities you get are `bg-paper`, `bg-paper-2`, `text-ink`, `text-ink-2`, `text-tomato`, `bg-mustard`, `bg-teal`, `font-serif|mono|hand`, `text-hero|hero-xl|display|headline|title|sub|body|small|label|micro`, `shadow-sticker|chip|card|pill`, `rounded-pill|card|label|cassette|sheet`, `animate-slap|rise`.
- Fonts come from `next/font/google`: Fraunces (opsz axis, 400/600/700/800 + italics), Space Mono 400/700, and Caveat 600/700. Caveat is only for decorative annotations, which are `aria-hidden`.
- Every number uses Space Mono 700 with tight tracking (`-0.075em` on heroes). Headlines and body use Fraunces.
- Each slide gets the paper grain and gradients (`--paper-bg`) from `tokens.css`. Never animate the grain.
- Contrast pairs are in the `tokens.css` header. - **Do not use these pairs for text** (they fail AA). Use the alternative:

  | Fails | Ratio | Use instead |
  |---|---|---|
  | tomato on mustard | 2.76 | ink on mustard (7.99). Ranks and labels on mustard rows are ink. |
  | ink on teal | 2.73 | paper-2 on teal (5.82). Cassette shell marks (".ZIP ▲") and song cards use paper or white. |
  | ink-2 on teal | 1.57 | paper-2 on teal (5.82) |
  | ink on teal-dark | 1.47 | paper-2 on teal-dark (10.82) |
  | ink on heat-8 / tomato | 2.89 | paper-2 on tomato (5.50). Applies to a labelled peak heatmap cell, the peak bar, streak start/end days, and tomato stickers. |
  | ink-2 on tomato | 1.67 | paper-2 on tomato (5.50) |
  | any text on heat-6 / heat-7 | ≤4.26 | No text inside these fills. Put the label outside the cell or bar. |
  | mustard on paper | 1.81 | Mustard is only ever a fill. |

  The cassette *label* is a paper-2 sticker, so ink text on it is fine (15.89). In the mockups the peak heatmap cell is ink with no text, and the peak-bar value sits above the bar in tomato on grid paper (5.6).

## 2. Components
| Component | Notes |
|---|---|
| **StoryPlayer** | Already built. Full-bleed 9:16 container with max-width 430px, centered on desktop over `paper-dark`. Tapping the right 2/3 goes forward and the left 1/3 goes back. Holding 250ms or more pauses. The ✕ (44×44) exits to landing. |
| **ProgressBars** | One 3px segment per *planned* slide, with a 3px gap and 16px inset from the top. Done segments are `ink`, the rest are `ink/18%`. The current one fills linearly. |
| **PeriodPill** | Sits at top 66px, left 24px, and is 30px tall. The hit area is extended to 44px with `::after`. Mono 12px/700, `paper-2` with a 1.5px ink border and `shadow-pill`. Opens a **BottomSheet** (`15-period-sheet`): `Last 12 months` (+ range in mono), a "Calendar years" group (newest first), then `All time`. The selected row is mustard with an ink border and a hand check. Rows are 52px or taller. The sheet closes on select, on a scrim tap, or on Esc. The current dropdown in `PeriodPill.tsx` becomes the sheet. |
| **Sticker** | `paper-2`, 2px ink border, `shadow-sticker`, and a −2° to +2° rotation set via a prop. Used for cards, lists and calendars. |
| **TapeStrip** | 74×22, `--tape-mustard` or `--tape-clear` (`assets/tape.svg`), rotated ±20–30° and overlapping a sticker corner by about 12px. Purely decorative, so `aria-hidden`. A label variant (upload liner notes) holds mono 10.5px ink text. |
| **CassetteDropZone** | Teal cassette shell (`radius-cassette`, 2px ink border, `shadow-sticker`) with a dashed paper label, a window with 2 reels, and screws. The whole cassette is the `<label>` for a hidden `<input type=file accept=".zip">`. Drag-over: the label border goes solid tomato, the shell scales to 1.02, and the reels spin. Error: shake 300ms, then show the error copy under it in tomato with a 2px left rule. The same CSS cassette is reused on landing, crunching, and music (tomato shell). |
| **VHSLabel** | A sticker with the 4-colour stripe header (`assets/vhs-label-frame.svg` or CSS), `T-120` left, `● REC` right in tomato, and the hero number centered. Used for total videos. |
| **HandCircle / Underline** | `assets/hand-circle.svg` and `underline.svg` use `stroke="currentColor"` and `vector-effect: non-scaling-stroke`, so they stretch to any box. Position absolute, with the circle inset −12 to −16px around the target. Colour is tomato. Animate with `stroke-dasharray` draw-on. |
| **Heatmap** | 7×24 grid with Mon–Sun rows and a 30px label column. The cells are 15px tall with a 2px gap, drawn from heat ramp `--color-heat-0..7`. The peak cell is ink with a 2.5px ink outline at 1.5px offset, and the Caveat note "prime time!" plus `arrow.svg` sit above it. Axis ticks are 12 AM / 6 AM / 12 PM / 6 PM. The header shows the user's tz label. Accessible as a `<table>` that's visually hidden, or with `aria-label` "Most plays: Sunday 10 PM, 214 videos". |
| **BarChart** | 12 columns. For last 12 months and a calendar year, these are the months of the period. For All time, they're the 12 months of the calendar year that contains the busiest month, and the axis shows that year. Bars are `heat-2` with a 1.5px ink outline and 3px top radius. The peak bar is tomato with its value above it in mono 12px tomato. Month initials sit underneath, the peak initial in tomato. The first and last month are full under the axis. The height scale is max = 150px. |
| **RankList** | J-card sticker. Each row has a mono rank (tomato, or ink on mustard), a 1-line clamped name, and a value in mono 13px. Variants: **creators** (MonogramSticker 40px, 52px for #1, mustard row for #1, proportional bar ≤62% width under the name), **songs** (title plus italic artist, both 1-line clamps, plays on the right), and **searches** (label-maker tapes: ink bg, paper text, mono uppercase 15px, rotated ±2°, #1 tomato). |
| **EstimateChip** | Mono 12px uppercase tomato with a 2px tomato border, rotated −2°, plus an ⓘ icon. The visual height is 30px inside a 44px hit area. Opens the **BottomSheet** with `watchTime.chipExplainer`. On the share card it becomes a static ink/paper variant (not interactive in the image). |
| **BottomSheet** | `paper-2` + grain, a 2px ink top border, 24px top radius, a 44×5 handle, and a ✕ button (44×44 round, `aria-label` "Close"). The scrim is `--scrim`. Use `role="dialog" aria-modal`, trap focus, close on Esc. The story pauses while it's open. |
| **MonogramSticker** | The creator avatar. See §8. |
| **ShareCard** | Lay it out at **360×640 CSS px** for story and **360×360** for square, and export with `pixelRatio: 3` → **1080×1920** and **1080×1080** PNGs (`html-to-image` or canvas). The in-app preview scales it to 342px wide. Use web fonts only once `document.fonts.ready` resolves. Contents: stripe header, cassette icon + `WATCHBACK` stamp, the period headline from `share.headline`, range + "YouTube + YouTube Music", the Videos tile, the Watch-time tile (or the peak-hour tile, see §6), top 5 creators (square: #1 only), the top song with `Now playing`, and a footer with the URL and the disclaimer. The "Example data" tags exist in mockups only. Buttons sit below the card: `Save story` (secondary) and `Save square` (primary), with a `Start over` text link (44px tall) under them. |

## 3. Slide order and layout
Pre-story screens: **00-landing → 01-upload → 02b-crunching**. Story (**14 slides** when everything is present. Without Shorts it's 12; see §9):

| # | File | Copy keys | Layout notes |
|---|---|---|---|
| 1 | 02-big-number | totalVideos | The lead headline is split around the hero: "You pressed *play* on" (underline under *play*), the VHSLabel hero (100px), then "videos." in italic 32px, right-aligned. The `sub` goes in a mustard sticker. |
| 2 | 05b-watch-time | watchTime | A tomato "≈" (56px) followed by a tape-counter hero: each digit in a 58×112 paper box with a 96px digit. Then "hours of watching." in italic 32px, the EstimateChip, and `sub` in a mustard sticker. The `-explainer` variant shows the open sheet. |
| 3 | 16-shorts-vs-long | shortsVsLong + deco.shortsTape/longTape | **New.** See §9. Two stacked format cards (Shorts, then Long‑form), each with a ≈ hero count, plays share and ≈ hours. The `subs.*` line and the EstimateChip with the detection note sit below. |
| 4 | 17-creators-by-format | topCreatorsSplit + deco.shortsTape/longTape | **New.** See §9. Two column stickers: top 3 Shorts creators and top 3 long‑form creators. Each #1 gets a 64px MonogramSticker. |
| 5 | 03-top-creator | topCreator | Centered, with no runners-up list (they live on slide 6). The headline is split as "Your #1 creator *was*". Below it: a 176px **MonogramSticker** (with tape) inside a hand circle and a 72px star stamp "#1", then the name (32px, 1-line clamp, trailing "."). The hero count (120px tomato) sits in a VHSLabel-style sticker with stripes, rotated −2° with two tapes. Last comes "videos. That's loyalty." (22px italic) with a hand underline. Decorative sparkles, arrow and star fill the margins (`aria-hidden`). |
| 6 | 06b-top5-creators | topCreators | Headline with an underline under "in heavy rotation". A J-card RankList where the #1 row is mustard. |
| 7 | 07-favorite-video | favoriteVideo | A polaroid sticker with tape around a **VideoThumb** (see §7). The title is clamped to **2 lines** (Fraunces 19px/700), then the creator in mono 12px with a 1-line ellipsis. The hero reads "watched **23** times." with 120px tomato digits. |
| 8 | 08-busiest-month | busiestMonth | Headline with the month underlined. Hero count 96px + "videos in one month." Then the BarChart on a graph-paper sticker. |
| 9 | 04-prime-time | primeTime | "Prime time:" 30px / "Sundays at" 44px/800 / "10 PM." 96px italic tomato inside a hand circle. Then `sub`, the Heatmap, and two stickers: `peakLabel` + count + "videos", and a mustard badge card with the icon + `badgeShare` ("Night owl, 38% of plays"). **This covers the `peak-hour-badge` slide.** Frontend can drop that separate slide. |
| 10 | 09-streak | bingeStreak + deco.streakSticker | Hero "17" (120px tomato) + "days in a row." on one baseline. `sub` sits below. A month calendar sticker (Mon-first), with streak days in mustard and start/end in tomato with white text. If the streak spans 2 months, show both months stacked and shrink the cells to 30px. A tomato round "No skips" sticker at the bottom-right corner. |
| 11 | 10-top-searches | topSearches | 5 label-maker tapes with round rank badges. A 1-line clamp with ellipsis inside each tape. The `footer` line with a teal lock sits under them. |
| 12 | 11-music-total | music | "You played" / 96px teal hero / "songs on YouTube Music." Then "Most of them were by" and a tomato cassette whose label holds the artist (30px/800, 1-line clamp, trailing "."). |
| 13 | 12-top5-songs | topSongs + deco.nowPlaying | "*Side A:*" in teal italic. #1 in a teal "Now playing" cassette card (title 1-line clamp, then "artist · N plays"), with 2–5 in a J-card RankList. |
| 14 | 05-share-card | share | ShareCard preview + buttons. Progress bars are full. |
| – | 13-share-square | share | The 1080×1080 export, with 4 tiles: Videos, Watch time, #1 creator, Top song (title clamped to 2 lines). |
| – | 14-fallback-share-card | watchTime.unavailableTooltip, primeTime.peakLabel | See §6. |
| – | 15-period-sheet | period | The pill's open state. |

**Chrome on every story slide**: progress bars (top 14), brand and ✕ (top 24, 44px row), and the period pill (top 66). Content starts at about y=108. Keep 24px gutters and nothing important below y=780, which is the gesture zone. One hero number per slide at 96px or more, and at most one chart.

## 4. Motion
All enters are ≤600ms and staggered by 60–80ms per element. The default easing is `--ease-out-paper`. Each slide's enter starts after the progress segment resets.

| Element | Motion | Reduced motion (`prefers-reduced-motion: reduce`) |
|---|---|---|
| Slide content | `rise`: 16px up + fade over 420ms | 150ms opacity fade only |
| Hero counter | Roll-up from 0 to n over 600ms with ease-out, using `tabular-nums` so the width doesn't jitter. The watch-time digits flip per box like a tape counter (each box translateY −100%→0, staggered 60ms). | Show the final number immediately |
| Sticker / stamp / badge | "Slap": scale 1.35→0.97→1 with a rotation from −9° to its resting angle, 360ms `--ease-slap`, plus a 2px shadow pop | Fade in 150ms at the resting angle |
| TapeStrip | Scale-x 0→1 from one end, 240ms, after the sticker lands | Static |
| HandCircle / Underline | Stroke draw-on (`stroke-dashoffset`), 500ms, starting 200ms after the headline | Static, fully drawn |
| Bars / heatmap | Bars grow from the baseline staggered 30ms (≤600ms total). Heatmap cells fade in by column, 400ms total. | Static |
| Crunching cassette | Reels rotate (1.2s linear, infinite) while the tape bar fills | Reels still. The bar still fills, since that's information. |
| Crunching line | Rotate `crunching.rotating` every 2.2s with a 200ms crossfade. Dots show the position. | Change the text without the crossfade |
| BottomSheet | Slide up 320ms + scrim fade 200ms. Close takes 220ms. | Fade 150ms |
| Drop zone | Drag-over scale 1.02 + reel spin. Error shake ±6px ×3 over 300ms. | Border colour change only. No shake. |

## 5. Hit areas and text rules
- Every tappable target is at least **44×44px**: ✕, period pill, estimate chip, sheet rows (52px), info icon on the fallback tile, buttons (52–56px), and the `Start over` link.
- Accessible labels and hints come from `en.player`. Slide 1 shows `player.firstSlideHint` at the bottom (mono 11px ink-2, balanced) for the first run only, and `player.tapToContinue` replaces it when reduced motion stops auto-advance. The pill's label is `player.periodPillAria`.
- Story tap zones exclude the interactive elements (`data-story-interactive`, already in the code).
- Clamp rules: video titles get **2 lines** (`line-clamp: 2`). Creator, artist, and song names get 1 line (`white-space: nowrap; text-overflow: ellipsis`). Search terms get 1 line. Headlines never clamp; size them so the longest placeholder still fits at 320px wide, and use `text-wrap: balance`. Hero numbers are `white-space: nowrap`. Above 6 digits, step down to 80px (still the only hero).
- Long data (`{creator}` inside a headline) uses the split layout (name on its own clamped line), never inline.
- Dates are shown as "Mar 3". The period range uses `Intl` `en-US` "MMM yyyy", in the user's tz.

## 6. Empty and fallback states
- **No Music data** (`totalSongs === 0`): skip slides 12–13 (`11-music-total`, `12-top5-songs`). The share card drops the Top-song block and lets the creator list breathe (larger row padding). The square swaps the Top-song tile for the busiest-month tile (`{month}` + `{n} videos`). If watch time is also unavailable, the square's tiles are Videos, Your peak hour, #1 creator, and Busiest month.
- **Durations unavailable** (`/api/durations` 429 or empty): drop slide 2 (watch time). On the share card the watch-time tile becomes `primeTime.peakLabel` with the peak hour (mono 27px) and the day ("Sundays"), plus a 44px ⓘ button that opens a tooltip with `watchTime.unavailableTooltip` (ink bg, paper text, 8px radius, caret toward the ⓘ). The tooltip lives in the app UI only and is never baked into the exported image. Same swap on the square.
- Slides without enough data are skipped by `planSlides()` (already built). Progress bars reflect the planned count, not a fixed 14.
- **No Shorts detected** (`shortsCount === 0`): skip **both** slides 3 and 4 (`16-shorts-vs-long`, `17-creators-by-format`). `shortsVsLong.noShorts` stays unused in v1 (reserved for a possible one-line mention elsewhere). If Shorts exist but there's no long-form (`longCount === 0`), also skip both. The split is only interesting with two sides.
- **Durations unavailable**: also skip slides 3–4. Shorts detection needs lengths and orientation from `/api/durations`, except for `/shorts/` links, and a partial split would mislead.
- Favorite video with count < 2 is skipped (already built).

## 7. Notes
- **No YouTube logo, no red play button, no YouTube red.** Tomato `#B33A24` is the brand accent. "Not affiliated with YouTube or Google." goes on landing, upload, and both share images.
- **VideoThumb (favorite video)**
  - Source: our own proxy, `POST /api/thumb` with JSON body `{"id":"<videoId>"}`. The browser never calls `i.ytimg.com` directly.
    ```ts
    const res = await fetch("/api/thumb", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }), signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(String(res.status));
    const url = URL.createObjectURL(await res.blob()); // <img src={url}>; URL.revokeObjectURL(url) on unmount
    ```
  - Frame: 16:9 box (`aspect-ratio: 16/9`), 2px ink border, image `object-fit: cover` filling it, with a duration chip (mono 11px, paper on ink) bottom-right if known.
  - Alt text: the video title (`alt={favoriteVideo.title}`). The visible title below is clamped, but the alt is the full title.
  - Fallback: the generated placeholder (paper-dark + 45° teal hatch, no text) shows while loading. It stays if the fetch fails, returns non-2xx, or is aborted by **`AbortSignal.timeout(3000)`** (>3s), and also if the `<img>` errors decoding the blob (`onError`). Because the timeout aborts the request, there's never a late swap mid-view. Fade the image in over 200ms when it arrives; no fade with reduced motion.
  - Export: the image **must be same-origin**. A `blob:` URL made from our own `/api/thumb` response is, so `html-to-image` can inline it without tainting the canvas. Never fall back to a cross-origin URL. Keep the object URL alive until the export finishes. If the image failed, the placeholder is what gets exported.
  - Share cards don't show a thumbnail today.
  - Mockup stand-in: `B/img/thumb-example.jpg` is a generated abstract image (`B/gen_thumb.py`), not YouTube content.
- **Unused deco string**: `deco.runnersUp` ("Side B · Runners-up") is no longer used now that the runners-up list is off slide 5 (#1 creator). Copywriter can delete it or keep it for later.
- "Example data" tags are mockup-only.
- Re-render mockups: `cd design && npm i && cd B && python3 gen_b.py && cd .. && node render.js B`.

## 8. Monogram avatar
Takeout has no creator avatars, so in v1 every creator avatar is a **MonogramSticker**: slide 5 (#1 creator, hero), slide 6 (top 5 list) and slide 4 (top creators by format). The share cards show no avatars. Reference SVG: `assets/monogram-sticker.svg`.

**Initials** (1–2 characters):
1. `NFKC`-normalize and trim the name, then split on whitespace.
2. Strip leading non-letter/non-digit characters from each word (emoji, ★, #, &…) and drop words that become empty.
3. If the first remaining character is **not Latin and not a digit** (CJK, Cyrillic, Arabic, Thai…), show **just that character**.
4. Otherwise: with 2+ words, take the first character of word 1 + the first of word 2. With 1 word, take its first two letters/digits.
5. Uppercase (`toLocaleUpperCase("en")`). If nothing is left, show `?`.

```ts
export function initials(name: string): string {
  const words = name.normalize("NFKC").trim().split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+/u, "")).filter(Boolean);
  if (!words.length) return "?";
  const first = [...words[0]][0];
  if (!/[\p{Script=Latin}\p{N}]/u.test(first)) return first;
  const raw = words.length > 1 ? first + [...words[1]][0]
    : [...words[0]].filter((c) => /[\p{L}\p{N}]/u.test(c)).slice(0, 2).join("");
  return raw.toLocaleUpperCase("en");
}
```
Examples: "Creator Name A" → CN · "★ Example Gaming Channel" → EG · "Exampletube" → EX · "見本チャンネル" → 見 · "Tom & Jerry" → TJ · "3Blue1Brown" → 3B · "Пример Канал" → П.

**Hash → palette**: FNV-1a 32-bit over the code points of `name.normalize("NFKC").trim().toLowerCase()`, then `index = h % 5`. The tilt comes from the same hash: `((h >>> 8) % 11) − 5` degrees (−5°…+5°). This is stable across sessions and devices.
```ts
let h = 0x811c9dc5;
for (const ch of key) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 0x01000193) >>> 0; }
```

| index | Background (tokens.css) | Initials colour | Contrast |
|---|---|---|---|
| 0 | teal `#1E6B66` | paper-2 `#FBF6EC` | **5.82:1** |
| 1 | tomato `#B33A24` | paper-2 `#FBF6EC` | **5.50:1** |
| 2 | mustard `#E2A72E` | ink `#1F1B16` | **7.99:1** |
| 3 | teal-dark `#123F3C` | paper-2 `#FBF6EC` | **10.82:1** |
| 4 | paper-dark `#EDE3CF` | ink `#1F1B16` | **13.44:1** |

The ratios are computed with the WCAG 2.x relative-luminance formula from the hex values in `tokens.css`. All 5 pass **4.5:1** (normal-text AA) even though the initials are large, so nothing was dropped. None of these pairs is on the "do not use for text" list (no tomato on mustard, no ink on teal/teal-dark/tomato). The paper-2 rim against its ink outline is 15.89:1.

**Anatomy** (viewBox 100): paper-2 rim `r=48` with an ink outline (2px at hero size, ~1.6px at 40px), coloured disc `r=41`, and a die-cut dashed ring `r=44.5` (ink at 30% opacity). The initials are Fraunces 800, centered, `letter-spacing −1.5`, at font-size 38 for 2 characters and 46 for 1 (≈ 0.38/0.46 × diameter). The wrapper has `rotate(tilt)` and a hard shadow `drop-shadow(4px 4px 0 ink)` at hero size, 2px at list size. The hero adds a mustard **TapeStrip** across the top (about 42% of the diameter wide, rotated opposite the tilt).

**Sizes**: **176px** hero (slide 5, with tape, hand circle and the "#1" star stamp), **40px** list rows (slide 6), **52px** for the #1 row on slide 6, and **64px** for each #1 on slide 4 (by format). A11y: `role="img"` with `aria-label` = the creator name. The SVG internals are `aria-hidden`.

**Later**: real channel avatars may come in a later version through the same proxy (`POST /api/thumb`, or a sibling avatar route), with the same fetch + `AbortSignal.timeout(3000)` + `URL.createObjectURL` flow. The MonogramSticker would stay as the loading and failure fallback, and the image would sit inside the same paper rim, clipped to the disc.

## Share export: grain
SVG `feTurbulence` grain renders as a black box in html-to-image, so share cards must not use the SVG filter. Use `assets/grain-tile.png` instead: a 256px seamless noise tile with alpha of 11% or less. Set it as `background-image` on the card root, `background-size: 128px` (so it stays fine at pixelRatio 3), over the `paper` token (`#F3EBDD`). This is a raster, so it exports correctly. On-screen slides can keep the SVG filter or use the same tile.

## 9. Shorts vs long‑form (slides 3–4)
Copy lives in `src/copy/en.ts` on `copy/en` (draft commit `b834d58`, chip explainer updated in `084a184`). Key paths:
- `slides.shortsVsLong.headline` · `.shortsLabel` · `.longLabel` · `.count` ("≈ {n} videos") · `.time` ("≈ {hours} hours") · `.timeMinutes` ("≈ {minutes} min", when under 1 hour) · `.share` ("{pct}% of your plays") · `.subs.{shortsBoth|longBoth|shortsPlaysLongTime|longPlaysShortsTime}` · `.noShorts` · `.chip` · `.chipExplainer` · `.aria`
- `slides.topCreatorsSplit.headline` · `.shortsColumn` · `.longColumn` · `.item` ("≈ {n} videos") · `.sameTop` ("{creator} topped both lists.") · `.emptyShorts` · `.emptyLong`
- `deco.shortsTape` ("Singles") · `deco.longTape` ("Long play"). These are Caveat 22px/700 ink on a TapeStrip (mustard tape for Shorts, clear tape for long‑form), `aria-hidden`.

**Detection (Backend).** `/api/durations` will return an `isShort` flag per ID. A video is a Short if it was opened from a **`/shorts/` link**, **or** its **duration ≤ 180s and it's vertical** (height > width). The `/shorts/` check can run client-side from the Takeout URL. Counts and hours are estimated from the same 2,000-ID sample and scaled up like watch time (3h cap per play still applies). Deleted/private videos are left out of the split (per `chipExplainer`), so Shorts + long‑form can be slightly less than slide 1's total. Music plays are excluded.

**Slide 3, `16-shorts-vs-long`.**
- Headline 30px. The second half is in tomato italic with a hand underline.
- Two stacked **format cards**, full width (342px). Each is a Sticker (paper-2, 2px ink, `shadow-sticker`) tilted −1.2° / +1°.
  - **Band (30px).** Shorts: tomato with paper-2 label (5.50:1). Long‑form: teal-dark with paper-2 label (10.82:1). Fraunces 16px/700.
  - **Motif**, overlapping the band's top-right (`aria-hidden`). Shorts get a vertical phone (40×68: ink body, paper screen, mustard tile, no play button). Long‑form gets a 16:9 landscape frame (80×50: teal screen, teal-dark hills, mustard sun).
  - **Tape label** on the top-left corner: `deco.shortsTape` / `deco.longTape`.
  - **Hero**: "≈" (mono 48px) + the count at **96px Space Mono**. Shorts is tomato (5.50:1 on paper-2) and long‑form is ink. `count` is split around the hero: "≈" before it and "videos" in italic 22px under it.
  - **Stats row** under a dashed rule, mono 14px/700: `time` on the left and `share` on the right. Under 1 hour, use `timeMinutes`.
- Below the cards: the `subs.*` line (italic 18px/600). Pick it by comparing plays and hours (e.g. Shorts win plays and long‑form wins hours → `shortsPlaysLongTime`).
- Then the **EstimateChip**, which opens a BottomSheet with `shortsVsLong.chipExplainer`. Next to the chip goes a one-sentence detection note in italic 13px ink-2. The mockup uses the second sentence of `chipExplainer` verbatim. Copywriter: if this note stays, it wants its own key (e.g. `shortsVsLong.note`).
- `aria-label` on the slide region: `shortsVsLong.aria`.
- At most one hero per card. This slide deliberately has two equal heroes: the split *is* the stat. There's no chart.

**Slide 4, `17-creators-by-format`.**
- Headline 30px, with "short" in tomato italic and "long." in teal italic.
- **Two columns** (2 × 163px, 16px gap). Each is a Sticker tilted −1.5° / +1.5°.
  - **Band**: `shortsColumn` / `longColumn` (Fraunces 15px/700, up to 2 lines, balanced), same colours as slide 3. The tape labels sit on the outer top corners.
  - **#1**: a 64px **MonogramSticker** (rules in §8, same hash/palette), then the name, centered at 18px/700. In these narrow columns the #1 name may **clamp to 2 lines**. This is the one exception to the 1-line creator rule, so the #1 stays readable at 360px. Then `item` with the number at mono 34px (tomato for Shorts, ink for long‑form), and "videos" in italic below.
  - **Runners 2–3** (top 3 per side): rank + name (15px/700, **1-line clamp**) with `item` under it in mono 11.5px ink-2. If a side has fewer than 2 creators, show `emptyShorts` / `emptyLong` in italic in place of the runners.
- If the #1 is the same creator on both sides, add `sameTop` as an italic line under the columns, above the chip.
- EstimateChip (same explainer as slide 3) below the columns.
- No 96px hero here. It's a list slide like slide 6.

**Motion.** The cards/columns use the standard `rise` with an 80ms stagger. The tape labels "slap" in after their card. Counts roll up (≤600ms). Reduced motion: fade only, final numbers shown.

**Hit areas.** The EstimateChip has a 44px hit area. Nothing else on these slides is interactive.
