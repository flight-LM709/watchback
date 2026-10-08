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
 * instead of being filled in. Counts and creator counts use the same weights, so each side's
 * creators add up to its total.
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
export type ShortsVsLongSub = "shortsBoth" | "longBoth" | "shortsPlaysLongTime" | "longPlaysShortsTime";

export interface ShortsSplitSide {
  /** ≈ plays (rounded). SPEC §9 shortsCount / longCount; `slides.shortsVsLong.count` {n}. */
  count: number;
  /** ≈ watch time in seconds (rounded); null when this side has plays but no known duration at all. */
  seconds: number | null;
  /** Integer % of the split's plays (Shorts + long-form; unknown and Music excluded). shorts.pct + long.pct = 100. */
  pct: number;
  /** Top creators on this side, ≈ counts (rounded, ≥ 1), most first. `slides.topCreatorsSplit.item` {n}. */
  topCreators: CountedName[];
  /** Fewer than 2 creators → SPEC §9: show `emptyShorts` / `emptyLong` in place of the runners. */
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
  /** Who won on plays (ties → "long"). */
  playsWinner: SplitSideKey;
  /** Who won on time (ties → "long"); null when either side's time is unknown. */
  timeWinner: SplitSideKey | null;
  /** Which `slides.shortsVsLong.subs` line to show; null with noShorts or an unknown time side. */
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

  // Ratio-estimator weight for the non-top group (plays that need the API: non-/shorts/ URL).
  let restOther = 0, lookedUpOther = 0;
  for (const r of stats.videoPlays) {
    if (top.has(r.videoId)) continue;
    const other = r.plays - r.shortsUrlPlays;
    restOther += other;
    if (sampled.has(r.videoId) && lookedUp(r.videoId)) lookedUpOther += other;
  }
  const restWeight = lookedUpOther > 0 ? restOther / lookedUpOther : 0;

  const side: Record<SplitSideKey, Acc> = { shorts: acc(), long: acc() };
  let apiClassified = false;
  let directPlays = 0;

  const add = (s: Acc, id: string, channel: string | undefined, plays: number, weight: number) => {
    const w = plays * weight;
    s.plays += w;
    const d = durations[id];
    if (validDuration(d)) { s.knownPlays += w; s.knownSec += w * Math.min(d, MAX_SECONDS_PER_PLAY); }
    if (channel !== undefined) {
      const c = s.creators.get(channel);
      if (c) c.count += w;
      else {
        const info = stats.channels[channel];
        s.creators.set(channel, { name: info?.name ?? channel, ...(info?.url ? { url: info.url } : {}), count: w });
      }
    }
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
      if (f !== "unknown") { add(side[f], id, r.channel, r.shortsUrlPlays, 1); directPlays += r.shortsUrlPlays; }
    }
    const other = r.plays - r.shortsUrlPlays;
    if (other <= 0 || !inSample) continue;
    const f = classifyShortsPlay({ shortsUrl: false, apiIsShort, durationSec });
    if (f === "unknown") continue;
    add(side[f], id, r.channel, other, isTop ? 1 : restWeight);
    directPlays += other;
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

  const playsWinner: SplitSideKey = S > L ? "shorts" : "long";
  const timeWinner: SplitSideKey | null =
    shorts.seconds === null || long.seconds === null ? null : shorts.seconds > long.seconds ? "shorts" : "long";
  const sub: ShortsVsLongSub | null =
    noShorts || !timeWinner
      ? null
      : playsWinner === "shorts"
        ? timeWinner === "shorts" ? "shortsBoth" : "shortsPlaysLongTime"
        : timeWinner === "long" ? "longBoth" : "longPlaysShortsTime";

  const s0 = shorts.topCreators[0], l0 = long.topCreators[0];
  const sameTopCreator = s0 && l0 && s0.name.trim().toLowerCase() === l0.name.trim().toLowerCase() ? l0.name : null;

  return {
    isEstimate: true,
    shorts,
    long,
    noShorts,
    slides: shortsSlides({ noShorts }),
    playsWinner,
    timeWinner,
    sub,
    sameTopCreator,
    unknownPlays: Math.max(0, Math.round(stats.totalVideos - S - L)),
    coverage: stats.totalVideos > 0 ? directPlays / stats.totalVideos : 0,
  };
}
