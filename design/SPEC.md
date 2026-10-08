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
| **RankList** | J-card sticker. Each row has a mono rank (tomato, or ink on mustard), a 1-line clamped name, and a value in mono 13px. Variants: **creators** (40px avatar, 52px for #1, mustard row for #1, proportional bar ≤62% width under the name), **songs** (title plus italic artist, both 1-line clamps, plays on the right), and **searches** (label-maker tapes: ink bg, paper text, mono uppercase 15px, rotated ±2°, #1 tomato). |
| **EstimateChip** | Mono 12px uppercase tomato with a 2px tomato border, rotated −2°, plus an ⓘ icon. The visual height is 30px inside a 44px hit area. Opens the **BottomSheet** with `watchTime.chipExplainer`. On the share card it becomes a static ink/paper variant (not interactive in the image). |
| **BottomSheet** | `paper-2` + grain, a 2px ink top border, 24px top radius, a 44×5 handle, and a ✕ button (44×44 round, `aria-label` "Close"). The scrim is `--scrim`. Use `role="dialog" aria-modal`, trap focus, close on Esc. The story pauses while it's open. |
| **ShareCard** | Lay it out at **360×640 CSS px** for story and **360×360** for square, and export with `pixelRatio: 3` → **1080×1920** and **1080×1080** PNGs (`html-to-image` or canvas). The in-app preview scales it to 342px wide. Use web fonts only once `document.fonts.ready` resolves. Contents: stripe header, cassette icon + `WATCHBACK` stamp, the period headline from `share.headline`, range + "YouTube + YouTube Music", the Videos tile, the Watch-time tile (or the peak-hour tile, see §6), top 5 creators (square: #1 only), the top song with `Now playing`, and a footer with the URL and the disclaimer. The "Example data" tags exist in mockups only. Buttons sit below the card: `Save story` (secondary) and `Save square` (primary), with a `Start over` text link (44px tall) under them. |

## 3. Slide order and layout
Pre-story screens: **00-landing → 01-upload → 02b-crunching**. Story (12 slides when everything is present):

| # | File | Copy keys | Layout notes |
|---|---|---|---|
| 1 | 02-big-number | totalVideos | The lead headline is split around the hero: "You pressed *play* on" (underline under *play*), the VHSLabel hero (100px), then "videos." in italic 32px, right-aligned. The `sub` goes in a mustard sticker. |
| 2 | 05b-watch-time | watchTime | A tomato "≈" (56px) followed by a tape-counter hero: each digit in a 58×112 paper box with a 96px digit. Then "hours of watching." in italic 32px, the EstimateChip, and `sub` in a mustard sticker. The `-explainer` variant shows the open sheet. |
| 3 | 03-top-creator | topCreator | Centered, with no runners-up list (they live on slide 4). The headline is split as "Your #1 creator *was*". Below it: a 176px avatar circle (`shadow-sticker`) with a hand circle and a 72px star stamp "#1", then the name (32px, 1-line clamp, trailing "."). The hero count (120px tomato) sits in a VHSLabel-style sticker with stripes, rotated −2° with two tapes. Last comes "videos. That's loyalty." (22px italic) with a hand underline. Decorative sparkles, arrow and star fill the margins (`aria-hidden`). |
| 4 | 06b-top5-creators | topCreators | Headline with an underline under "in heavy rotation". A J-card RankList where the #1 row is mustard. |
| 5 | 07-favorite-video | favoriteVideo | A polaroid sticker with tape around a **VideoThumb** (see §7). The title is clamped to **2 lines** (Fraunces 19px/700), then the creator in mono 12px with a 1-line ellipsis. The hero reads "watched **23** times." with 120px tomato digits. |
| 6 | 08-busiest-month | busiestMonth | Headline with the month underlined. Hero count 96px + "videos in one month." Then the BarChart on a graph-paper sticker. |
| 7 | 04-prime-time | primeTime | "Prime time:" 30px / "Sundays at" 44px/800 / "10 PM." 96px italic tomato inside a hand circle. Then `sub`, the Heatmap, and two stickers: `peakLabel` + count + "videos", and a mustard badge card with the icon + `badgeShare` ("Night owl, 38% of plays"). **This covers the `peak-hour-badge` slide.** Frontend can drop that separate slide. |
| 8 | 09-streak | bingeStreak + deco.streakSticker | Hero "17" (120px tomato) + "days in a row." on one baseline. `sub` sits below. A month calendar sticker (Mon-first), with streak days in mustard and start/end in tomato with white text. If the streak spans 2 months, show both months stacked and shrink the cells to 30px. A tomato round "No skips" sticker at the bottom-right corner. |
| 9 | 10-top-searches | topSearches | 5 label-maker tapes with round rank badges. A 1-line clamp with ellipsis inside each tape. The `footer` line with a teal lock sits under them. |
| 10 | 11-music-total | music | "You played" / 96px teal hero / "songs on YouTube Music." Then "Most of them were by" and a tomato cassette whose label holds the artist (30px/800, 1-line clamp, trailing "."). |
| 11 | 12-top5-songs | topSongs + deco.nowPlaying | "*Side A:*" in teal italic. #1 in a teal "Now playing" cassette card (title 1-line clamp, then "artist · N plays"), with 2–5 in a J-card RankList. |
| 12 | 05-share-card | share | ShareCard preview + buttons. Progress bars are full. |
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
- **No Music data** (`totalSongs === 0`): skip slides 10–11 (`11-music-total`, `12-top5-songs`). The share card drops the Top-song block and lets the creator list breathe (larger row padding). The square swaps the Top-song tile for the busiest-month tile (`{month}` + `{n} videos`). If watch time is also unavailable, the square's tiles are Videos, Your peak hour, #1 creator, and Busiest month.
- **Durations unavailable** (`/api/durations` 429 or empty): drop slide 2 (watch time). On the share card the watch-time tile becomes `primeTime.peakLabel` with the peak hour (mono 27px) and the day ("Sundays"), plus a 44px ⓘ button that opens a tooltip with `watchTime.unavailableTooltip` (ink bg, paper text, 8px radius, caret toward the ⓘ). The tooltip lives in the app UI only and is never baked into the exported image. Same swap on the square.
- Slides without enough data are skipped by `planSlides()` (already built). Progress bars reflect the planned count, not a fixed 12.
- Favorite video with count < 2 is skipped (already built).

## 7. Notes
- **No YouTube logo, no red play button, no YouTube red.** Tomato `#B33A24` is the brand accent. "Not affiliated with YouTube or Google." goes on landing, upload, and both share images.
- **VideoThumb (favorite video)**
  - Source: `<img src="/api/thumb/{id}">`, our own proxy route. The browser never calls `i.ytimg.com` directly.
  - Frame: 16:9 box (`aspect-ratio: 16/9`), 2px ink border, image `object-fit: cover` filling it, with a duration chip (mono 11px, paper on ink) bottom-right if known.
  - Alt text: the video title (`alt={favoriteVideo.title}`). The visible title below is clamped, but the alt is the full title.
  - Fallback: the generated placeholder (paper-dark + 45° teal hatch, no text) shows while loading. It stays if the image errors (`onError`) **or hasn't loaded within 3s** (cancel by ignoring a late `onLoad`, so the slide doesn't jump mid-view). Fade the image in over 200ms when it arrives; no fade with reduced motion.
  - Export: the image **must be same-origin** (which `/api/thumb` is) so `html-to-image` can inline it without tainting the canvas. Never fall back to a cross-origin URL. If the image failed, the placeholder is what gets exported.
  - Share cards don't show a thumbnail today.
  - Mockup stand-in: `B/img/thumb-example.jpg` is a generated abstract image (`B/gen_thumb.py`), not YouTube content.
- **Unused deco string**: `deco.runnersUp` ("Side B · Runners-up") is no longer used now that the runners-up list is off slide 3. Copywriter can delete it or keep it for later.
- "Example data" tags are mockup-only.
- Re-render mockups: `cd design && npm i && cd B && python3 gen_b.py && cd .. && node render.js B`.
