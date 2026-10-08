/**
 * Shorts vs long-form split (design/SPEC.md §9: slide 16 `16-shorts-vs-long` / slides.shortsVsLong,
 * slide 17 `17-creators-by-format` / slides.topCreatorsSplit), an estimate built from the same
 * ≤2,000-ID /api/durations lookup as the watch-time slide.
 *
 * Only non-ad YouTube (non-Music) plays take part. The detection rule lives in classifyShortsPlay()
 * (change it there if Backend's accuracy check moves the rule). Removed videos (no ID) and IDs that
 * weren't looked up are unknown and LEFT OUT of the split. Unknown is never long-form.
 *
 * Scaling mirrors estimateWatchTime() (watchTime.ts): top IDs count exactly; the rest of the
 * history is extrapolated from the uniform random sample with a ratio estimator:
 *     restClass ≈ Σ_sampled(class plays) × (restPlays / sampledPlaysLookedUp)
 * where the plays are the YouTube non-/shorts/-URL plays (the only ones that need the API), and
 * "looked up" means the ID came back in the `isShort` map at all. Unlike watch time, a sampled
 * null stays in the denominator, so the unknown share of the sample is extrapolated as unknown
 * instead of being filled in.
 * Creator counts: exact parts (top IDs, /shorts/ URL plays) as is; each creator's non-top plays are
 * scaled by THAT creator's own looked-up Short/long share (per-creator ratio estimator; a creator with
 * nothing looked up borrows the overall sample share). On QA's 5,000-ID fixture this picks the true #1
 * far more often than one global weight (44 vs 29 of 60 seed×side runs). So a side's creator counts
 * need not add up exactly to its total.
 * Watch time per side: every play counts min(duration, 3h); that side's plays with no duration
 * (e.g. /shorts/ plays of IDs not looked up) are filled at that side's own average.
 */
import type { IsShortResponse } from "./durationsClient";
import { mergeByName, type CountedName, type WatchStats } from "./stats";
import { MAX_SECONDS_PER_PLAY, type DurationSample, type DurationsResponse } from "./watchTime";

export type SplitSideKey = "shorts" | "long";
export type PlayFormat = SplitSideKey | "unknown";

export interface ShortsPlayInput {
  /** The Takeout entry linked to a /shorts/ URL. */
  shortsUrl: boolean;
  /** `isShort[id]` from /api/durations: true/false, null = private/deleted/shape unreadable, undefined = not looked up. */
  apiIsShort: boolean | null | undefined;
  /** Looked-up duration in seconds (null/undefined = unknown). Unused by the current rule; here so a rule change stays local. */
  durationSec?: number | null;
}

/**
 * THE detection rule, in one place. Current rule (Project Lead / Backend Dev):
 * a /shorts/ link → Short, whatever the API says; otherwise the API's flag (it applies
 * "≤ 180s and vertical" server-side); otherwise unknown (left out, never long-form).
 * Keep `slides.shortsVsLong.note` / `.chipExplainer` in sync if this changes.
 */
export function classifyShortsPlay({ shortsUrl, apiIsShort }: ShortsPlayInput): PlayFormat {
  if (shortsUrl) return "shorts";
  if (apiIsShort === true) return "shorts";
  if (apiIsShort === false) return "long";
  return "unknown";
}
export type ShortsVsLongSub =
  | "shortsBoth" | "longBoth" | "shortsPlaysLongTime" | "longPlaysShortsTime"
  | "tieBoth" | "tiePlaysShortsTime" | "tiePlaysLongTime" | "shortsPlaysTieTime" | "longPlaysTieTime"
  | "shortsPlaysOnly" | "longPlaysOnly" | "tiePlaysOnly";

/**
 * The DISPLAYED form of one side's time (Project Lead's rule; the visible and screen-reader lines
 * both render from this, and time ties compare it). Rounds to whole minutes first:
 *   null → "unknown" (em dash) · ≤ 0 → "none" (no line) · 0 min → "under" (under a minute) ·
 *   1–59 min → minutes · ≥ 59.5 min → hours, rounded (so 59.6 min is "1 hour", never "60 minutes" or "0 hours").
 */
export type SplitTimeDisplay =
  | { unit: "unknown" }
  | { unit: "none" }
  | { unit: "under" }
  | { unit: "minutes"; n: number }
  | { unit: "hours"; n: number };

export function splitTimeDisplay(seconds: number | null): SplitTimeDisplay {
  if (seconds === null || !Number.isFinite(seconds)) return { unit: "unknown" };
  if (seconds <= 0) return { unit: "none" };
  const minutes = Math.round(seconds / 60);
  if (minutes === 0) return { unit: "under" };
  if (minutes < 60) return { unit: "minutes", n: minutes };
  return { unit: "hours", n: Math.round(seconds / 3600) };
}

const sameDisplay = (a: SplitTimeDisplay, b: SplitTimeDisplay) =>
  a.unit === b.unit && ("n" in a ? a.n : 0) === ("n" in b ? b.n : 0);

export interface ShortsVerdict {
  /** Who won on plays; ties → "long" (kept for QA's expected files; see playsTie). */
  playsWinner: SplitSideKey;
  /** Displayed shares both round to 50%. */
  playsTie: boolean;
  /** Who won on time; ties → "long"; null when either side's time is unknown. */
  timeWinner: SplitSideKey | null;
  /** Both sides show the same rounded time (same unit and number). False when a time is unknown. */
  timeTie: boolean;
  /** `slides.shortsVsLong.subs` key; null with zero Shorts. Plays-only subs when either time is unknown. */
  sub: ShortsVsLongSub | null;
}

/** Sub line from the DISPLAYED values (shares, rounded times), so a tie is a tie the user can see. */
export function shortsVerdict(
  shorts: Pick<ShortsSplitSide, "pct" | "seconds">,
  long: Pick<ShortsSplitSide, "pct" | "seconds">,
  noShorts: boolean,
): ShortsVerdict {
  const playsTie = shorts.pct === 50 && long.pct === 50;
  const playsWinner: SplitSideKey = shorts.pct > long.pct ? "shorts" : "long";
  const st = splitTimeDisplay(shorts.seconds), lt = splitTimeDisplay(long.seconds);
  const timeKnown = st.unit !== "unknown" && lt.unit !== "unknown";
  const timeTie = timeKnown && sameDisplay(st, lt);
  const timeWinner: SplitSideKey | null = !timeKnown ? null : (shorts.seconds ?? 0) > (long.seconds ?? 0) && !timeTie ? "shorts" : "long";
  const p = playsTie ? "tie" : playsWinner;
  let sub: ShortsVsLongSub | null = null;
  if (noShorts) sub = null;
  else if (!timeKnown) sub = p === "tie" ? "tiePlaysOnly" : p === "shorts" ? "shortsPlaysOnly" : "longPlaysOnly";
  else if (timeTie) sub = p === "tie" ? "tieBoth" : p === "shorts" ? "shortsPlaysTieTime" : "longPlaysTieTime";
  else if (p === "tie") sub = timeWinner === "shorts" ? "tiePlaysShortsTime" : "tiePlaysLongTime";
  else if (p === "shorts") sub = timeWinner === "shorts" ? "shortsBoth" : "shortsPlaysLongTime";
  else sub = timeWinner === "long" ? "longBoth" : "longPlaysShortsTime";
  return { playsWinner, playsTie, timeWinner, timeTie, sub };
}

export interface ShortsSplitSide {
  /** ≈ plays (rounded). SPEC §9 shortsCount / longCount; `slides.shortsVsLong.count` {n}. */
  count: number;
  /** ≈ watch time in seconds (rounded); null when this side has plays but no known duration at all. */
  seconds: number | null;
  /** Integer % of the split's plays (Shorts + long-form; unknown and Music excluded). shorts.pct + long.pct = 100. */
  pct: number;
  /** Top creators on this side, ≈ counts (rounded, ≥ 1), most first. `slides.topCreatorsSplit.item` {n}. */
  topCreators: CountedName[];
  /** Fewer than 2 creators (QA's field). The column shows `emptyShorts` / `emptyLong` with 0 creators, `noRunnersUp` under a lone #1. */
  showEmptyState: boolean;
}

export interface ShortsSplitEstimate {
  isEstimate: true;
  shorts: ShortsSplitSide;
  long: ShortsSplitSide;
  /** shortsCount === 0 → slide 16 shows `slides.shortsVsLong.noShorts`, slide 17 is skipped. */
  noShorts: boolean;
  /** Which of the two slides to plan (Project Lead's skip rules). Same as shortsSlides(this). */
  slides: ShortsSlidesPlan;
  /** Who won on plays (ties → "long"; see playsTie). */
  playsWinner: SplitSideKey;
  /** Displayed shares both 50%. */
  playsTie: boolean;
  /** Who won on time (ties → "long"; see timeTie); null when either side's time is unknown. */
  timeWinner: SplitSideKey | null;
  /** Both sides show the same rounded time. */
  timeTie: boolean;
  /** Which `slides.shortsVsLong.subs` line to show (shortsVerdict); null with noShorts. */
  sub: ShortsVsLongSub | null;
  /** Display name when the #1 creator is the same on both lists → `slides.topCreatorsSplit.sameTop`. */
  sameTopCreator: string | null;
  /** ≈ YouTube plays left out of the split (removed / private / unreadable / not looked up). */
  unknownPlays: number;
  /** Share (0..1) of YouTube plays classified directly (/shorts/ URL or looked up), before scaling. */
  coverage: number;
}

export interface ShortsSlidesPlan {
  /** Slide 16 `16-shorts-vs-long`: whenever the split exists (incl. zero Shorts, with `noShorts`). */
  shortsVsLong: boolean;
  /** Slide 17 `17-creators-by-format`: only when there are Shorts. */
  creatorsByFormat: boolean;
}

/** Skip rules: no split (durations / isShort unavailable) → both skipped; zero Shorts → slide 17 skipped. */
export function shortsSlides(split: Pick<ShortsSplitEstimate, "noShorts"> | null | undefined): ShortsSlidesPlan {
  return { shortsVsLong: !!split, creatorsByFormat: !!split && !split.noShorts };
}

export interface ShortsSplitOptions {
  /** Creators per column. Default 3 (Copywriter: "top 3 each suggested"). */
  topN?: number;
}

type SplitStats = Pick<WatchStats, "videoPlays" | "channels" | "totalVideos">;

const validDuration = (d: unknown): d is number => typeof d === "number" && Number.isFinite(d) && d >= 0;
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

interface Acc {
  plays: number;
  knownPlays: number;
  knownSec: number;
  creators: Map<string, CountedName>;
}
const acc = (): Acc => ({ plays: 0, knownPlays: 0, knownSec: 0, creators: new Map() });

/**
 * Returns null (→ skip slides 16 and 17) when durations are unavailable (no usable duration came
 * back, i.e. estimateWatchTime() would be null too) or the API classified nothing (old API without
 * `isShort`, or every looked-up video came back null): without long-form data there's no split.
 */
export function estimateShortsSplit(
  stats: SplitStats,
  isShort: IsShortResponse | undefined,
  durations: DurationsResponse,
  sample: Pick<DurationSample, "topIds" | "sampleIds">,
  options: ShortsSplitOptions = {},
): ShortsSplitEstimate | null {
  if (!isShort || !Object.values(durations).some(validDuration)) return null;
  const topN = options.topN ?? 3;
  const top = new Set(sample.topIds);
  const sampled = new Set(sample.sampleIds);
  const lookedUp = (id: string) => has(isShort, id);

  // Ratio-estimator weight for the non-top group (plays that need the API: non-/shorts/ URL),
  // overall and per creator.
  let restOther = 0, lookedUpOther = 0;
  const perChannel = new Map<string, { rest: number; lookedUp: number; shorts: number; long: number }>();
  const chan = (k: string) => {
    let c = perChannel.get(k);
    if (!c) perChannel.set(k, (c = { rest: 0, lookedUp: 0, shorts: 0, long: 0 }));
    return c;
  };
  for (const r of stats.videoPlays) {
    if (top.has(r.videoId)) continue;
    const other = r.plays - r.shortsUrlPlays;
    const looked = sampled.has(r.videoId) && lookedUp(r.videoId);
    restOther += other;
    if (looked) lookedUpOther += other;
    if (r.channel !== undefined) {
      const c = chan(r.channel);
      c.rest += other;
      if (looked) c.lookedUp += other;
    }
  }
  const restWeight = lookedUpOther > 0 ? restOther / lookedUpOther : 0;
  const sampledSide: Record<SplitSideKey, number> = { shorts: 0, long: 0 };

  const side: Record<SplitSideKey, Acc> = { shorts: acc(), long: acc() };
  let apiClassified = false;
  let directPlays = 0;

  const credit = (s: Acc, channel: string, n: number) => {
    const c = s.creators.get(channel);
    if (c) c.count += n;
    else {
      const info = stats.channels[channel];
      s.creators.set(channel, { name: info?.name ?? channel, ...(info?.url ? { url: info.url } : {}), count: n });
    }
  };
  /** `exact`: also credit the creator now (top IDs, /shorts/ URL plays); sampled plays credit creators below. */
  const add = (s: Acc, id: string, channel: string | undefined, plays: number, weight: number, exact: boolean) => {
    const w = plays * weight;
    s.plays += w;
    const d = durations[id];
    if (validDuration(d)) { s.knownPlays += w; s.knownSec += w * Math.min(d, MAX_SECONDS_PER_PLAY); }
    if (exact && channel !== undefined) credit(s, channel, w);
  };

  for (const r of stats.videoPlays) {
    const id = r.videoId;
    const isTop = top.has(id);
    const inSample = isTop || (sampled.has(id) && lookedUp(id));
    // Looked-up data only counts for IDs in the sample; anything else is extrapolated by restWeight.
    const apiIsShort = inSample ? isShort[id] : undefined;
    const durationSec = durations[id];
    if (typeof apiIsShort === "boolean") apiClassified = true;

    // /shorts/ URL plays are known locally for every ID → exact (weight 1).
    if (r.shortsUrlPlays > 0) {
      const f = classifyShortsPlay({ shortsUrl: true, apiIsShort, durationSec });
      if (f !== "unknown") { add(side[f], id, r.channel, r.shortsUrlPlays, 1, true); directPlays += r.shortsUrlPlays; }
    }
    const other = r.plays - r.shortsUrlPlays;
    if (other <= 0 || !inSample) continue;
    const f = classifyShortsPlay({ shortsUrl: false, apiIsShort, durationSec });
    if (f === "unknown") continue;
    add(side[f], id, r.channel, other, isTop ? 1 : restWeight, isTop);
    directPlays += other;
    if (!isTop) {
      sampledSide[f] += other;
      if (r.channel !== undefined) chan(r.channel)[f] += other;
    }
  }
  // Per-creator ratio estimator for the non-top plays.
  for (const [k, c] of perChannel) {
    if (c.rest <= 0) continue;
    for (const f of ["shorts", "long"] as const) {
      const n = c.lookedUp > 0 ? (c.rest * c[f]) / c.lookedUp : lookedUpOther > 0 ? (c.rest * sampledSide[f]) / lookedUpOther : 0;
      if (n > 0) credit(side[f], k, n);
    }
  }

  if (!apiClassified) return null;
  const S = side.shorts.plays, L = side.long.plays;
  if (S + L <= 0) return null;

  const seconds = (s: Acc): number | null =>
    s.plays <= 0 ? 0 : s.knownPlays > 0 ? Math.round(s.knownSec + (s.plays - s.knownPlays) * (s.knownSec / s.knownPlays)) : null;
  const creators = (s: Acc): CountedName[] =>
    [...mergeByName(s.creators).values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .map((c) => ({ ...c, count: Math.round(c.count) }))
      .filter((c) => c.count >= 1)
      .slice(0, topN);

  const shortsPlays = Math.round(S);
  const noShorts = shortsPlays === 0;
  const shortsPct = noShorts ? 0 : Math.round((S / (S + L)) * 100);
  const mkSide = (s: Acc, count: number, pct: number): ShortsSplitSide => {
    const topCreators = creators(s);
    return { count, seconds: seconds(s), pct, topCreators, showEmptyState: topCreators.length < 2 };
  };
  const shorts = mkSide(side.shorts, shortsPlays, shortsPct);
  const long = mkSide(side.long, Math.round(L), 100 - shortsPct);

  const { playsWinner, playsTie, timeWinner, timeTie, sub } = shortsVerdict(shorts, long, noShorts);

  const s0 = shorts.topCreators[0], l0 = long.topCreators[0];
  const sameTopCreator = s0 && l0 && s0.name.trim().toLowerCase() === l0.name.trim().toLowerCase() ? l0.name : null;

  return {
    isEstimate: true,
    shorts,
    long,
    noShorts,
    slides: shortsSlides({ noShorts }),
    playsWinner,
    playsTie,
    timeWinner,
    timeTie,
    sub,
    sameTopCreator,
    unknownPlays: Math.max(0, Math.round(stats.totalVideos - S - L)),
    coverage: stats.totalVideos > 0 ? directPlays / stats.totalVideos : 0,
  };
}
