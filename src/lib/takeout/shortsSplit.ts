/**
 * Shorts vs long-form split (slides.shortsVsLong / slides.topCreatorsSplit), an estimate built from
 * the same ≤2,000-ID /api/durations lookup as the watch-time slide.
 *
 * Only non-ad YouTube (non-Music) plays take part. Each play is:
 *   - Short, when it was opened from a /shorts/ URL (always, whatever the API says);
 *   - otherwise Short / long-form from the API's `isShort[id]` (true / false);
 *   - otherwise unknown and LEFT OUT of the split: `isShort[id]` null (private/deleted/shape
 *     unreadable), removed videos (no ID), and IDs that weren't looked up. Unknown is never long-form.
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
export type ShortsVsLongSub = "shortsBoth" | "longBoth" | "shortsPlaysLongTime" | "longPlaysShortsTime";

export interface ShortsSplitSide {
  /** ≈ plays (rounded). `slides.shortsVsLong.count` {n}. */
  plays: number;
  /** ≈ watch time in seconds (rounded); null when this side has plays but no known duration at all. */
  seconds: number | null;
  /** Integer % of the split's plays (Shorts + long-form; unknown and Music excluded). shorts.pct + long.pct = 100. */
  pct: number;
  /** Top creators on this side, ≈ counts (rounded, ≥ 1), most first. `slides.topCreatorsSplit.item` {n}. Empty → column empty state. */
  topCreators: CountedName[];
}

export interface ShortsSplitEstimate {
  isEstimate: true;
  shorts: ShortsSplitSide;
  long: ShortsSplitSide;
  /** No Shorts at all (≈ 0 plays) → `slides.shortsVsLong.noShorts`. */
  noShorts: boolean;
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
 * Returns null when the API classified nothing (old API without `isShort`, failed request, or every
 * looked-up video came back null): without long-form data there's no split, so the slides drop.
 */
export function estimateShortsSplit(
  stats: SplitStats,
  isShort: IsShortResponse | undefined,
  durations: DurationsResponse,
  sample: Pick<DurationSample, "topIds" | "sampleIds">,
  options: ShortsSplitOptions = {},
): ShortsSplitEstimate | null {
  if (!isShort) return null;
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
    const flag = isShort[id];
    const isTop = top.has(id);
    const inSample = isTop || (sampled.has(id) && lookedUp(id));
    if (inSample && typeof flag === "boolean") apiClassified = true;

    if (r.shortsUrlPlays > 0) {
      add(side.shorts, id, r.channel, r.shortsUrlPlays, 1);
      directPlays += r.shortsUrlPlays;
    }
    const other = r.plays - r.shortsUrlPlays;
    if (other <= 0 || !inSample || typeof flag !== "boolean") continue;
    add(flag ? side.shorts : side.long, id, r.channel, other, isTop ? 1 : restWeight);
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
  const shorts: ShortsSplitSide = { plays: shortsPlays, seconds: seconds(side.shorts), pct: shortsPct, topCreators: creators(side.shorts) };
  const long: ShortsSplitSide = { plays: Math.round(L), seconds: seconds(side.long), pct: 100 - shortsPct, topCreators: creators(side.long) };

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
    playsWinner,
    timeWinner,
    sub,
    sameTopCreator,
    unknownPlays: Math.max(0, Math.round(stats.totalVideos - S - L)),
    coverage: stats.totalVideos > 0 ? directPlays / stats.totalVideos : 0,
  };
}
