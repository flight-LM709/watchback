/**
 * Watch-time estimate from a capped sample of video IDs.
 *
 * Privacy + cost: at most `cap` (default 2,000) IDs are sent to POST /api/durations,
 * once. Play counts never leave the device. We send:
 *   - the most-played IDs (exact contribution), and
 *   - a uniform random sample of the remaining IDs, used as a ratio estimator:
 *       restSeconds ≈ Σ_sampled(duration × plays) × (restPlays / sampledPlaysWithDuration)
 */
import type { WatchStats } from "./stats";

export interface DurationSampleOptions {
  /** Hard cap on IDs per upload. Default 2000. */
  cap?: number;
  /** How many most-played IDs to always include when over the cap. Default floor(cap / 2). */
  topCount?: number;
  /** Seed for the random sample (for tests / reproducibility). Default: random. */
  seed?: number;
}

export interface DurationSample {
  /** What to POST: ≤ cap, unique. topIds followed by sampleIds. */
  ids: string[];
  /** Most-played IDs (or every ID when the history fits under the cap). */
  topIds: string[];
  /** Uniform random sample of the non-top IDs (empty when everything fits). */
  sampleIds: string[];
  /** restPlays / sampledPlays: how much each sampled play stands for. 1 when nothing is sampled. */
  scale: number;
  totalPlays: number;
  topPlays: number;
  /** Plays of all non-top IDs. */
  restPlays: number;
  /** Plays of the sampled IDs. */
  sampledPlays: number;
}

export type DurationsResponse = Record<string, number | null | undefined>;

export interface WatchTimeEstimate {
  seconds: number;
  isEstimate: true;
  /** Share of all plays (0..1) whose duration was looked up and returned. The rest is extrapolated. */
  coverage: number;
  /** The exactly known part: Σ min(duration, 3h) × plays over IDs that came back with a duration. */
  exactSeconds: number;
}

type StatsLike = Pick<WatchStats, "uniqueVideoIds" | "playCountsById">;

/** Small, fast, seedable PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDurationSample(stats: StatsLike, options: DurationSampleOptions = {}): DurationSample {
  const cap = Math.max(1, Math.floor(options.cap ?? 2000));
  const plays = stats.playCountsById;
  // Dedupe defensively and keep most-played-first order.
  const all = [...new Set(stats.uniqueVideoIds)].sort((a, b) => (plays[b] ?? 0) - (plays[a] ?? 0));
  const p = (id: string) => plays[id] ?? 0;
  const sum = (ids: string[]) => ids.reduce((s, id) => s + p(id), 0);
  const totalPlays = sum(all);

  if (all.length <= cap) {
    return { ids: all, topIds: all, sampleIds: [], scale: 1, totalPlays, topPlays: totalPlays, restPlays: 0, sampledPlays: 0 };
  }

  const topCount = Math.min(cap, Math.max(0, Math.floor(options.topCount ?? cap / 2)));
  const topIds = all.slice(0, topCount);
  const rest = all.slice(topCount);
  const k = Math.min(cap - topCount, rest.length);

  // Partial Fisher–Yates: uniform sample of k without replacement.
  const rand = mulberry32(options.seed ?? Math.floor(Math.random() * 2 ** 32));
  const pool = rest.slice();
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rand() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const sampleIds = pool.slice(0, k);

  const topPlays = sum(topIds);
  const restPlays = totalPlays - topPlays;
  const sampledPlays = sum(sampleIds);
  return {
    ids: [...topIds, ...sampleIds],
    topIds,
    sampleIds,
    scale: sampledPlays > 0 ? restPlays / sampledPlays : 1,
    totalPlays,
    topPlays,
    restPlays,
    sampledPlays,
  };
}

/** Each play counts for at most 3 hours, so 10h livestreams don't blow up the total. */
export const MAX_SECONDS_PER_PLAY = 10800;

const validDuration = (d: unknown): d is number => typeof d === "number" && Number.isFinite(d) && d >= 0;
const capped = (d: number) => Math.min(d, MAX_SECONDS_PER_PLAY);

/**
 * Combine the endpoint's durations with local play counts.
 * Every play counts min(duration, MAX_SECONDS_PER_PLAY), everywhere (exact, sampled and averages).
 * - Top IDs: exact duration × plays. Top IDs that came back null (private/removed) are
 *   filled in at the average seconds-per-play of the top IDs that did come back.
 * - Remaining IDs: sampled seconds × (restPlays / sampled plays that came back with a duration).
 * - If one group has no durations at all, it borrows the other group's average seconds-per-play.
 * Returns null when no usable duration came back (UI drops the watch-time slide).
 */
export function estimateWatchTime(
  durations: DurationsResponse,
  playCountsById: Record<string, number>,
  sample: DurationSample,
): WatchTimeEstimate | null {
  const p = (id: string) => playCountsById[id] ?? 0;

  let topKnownSec = 0, topKnownPlays = 0;
  for (const id of sample.topIds) {
    const d = durations[id];
    if (validDuration(d)) { topKnownSec += capped(d) * p(id); topKnownPlays += p(id); }
  }
  let sampKnownSec = 0, sampKnownPlays = 0;
  for (const id of sample.sampleIds) {
    const d = durations[id];
    if (validDuration(d)) { sampKnownSec += capped(d) * p(id); sampKnownPlays += p(id); }
  }

  const knownPlays = topKnownPlays + sampKnownPlays;
  if (knownPlays === 0) return null;
  const exactSeconds = topKnownSec + sampKnownSec;
  const overallPerPlay = exactSeconds / knownPlays;

  // Top group: exact + nulls at the group's own average (or the overall one if none came back).
  const topPerPlay = topKnownPlays > 0 ? topKnownSec / topKnownPlays : overallPerPlay;
  const topSeconds = topKnownSec + (sample.topPlays - topKnownPlays) * topPerPlay;

  // Rest group: ratio estimator over the sample.
  let restSeconds = 0;
  if (sample.restPlays > 0) {
    restSeconds = sampKnownPlays > 0 ? sampKnownSec * (sample.restPlays / sampKnownPlays) : sample.restPlays * topPerPlay;
  }

  return {
    seconds: Math.round(topSeconds + restSeconds),
    isEstimate: true,
    coverage: sample.totalPlays > 0 ? knownPlays / sample.totalPlays : 0,
    exactSeconds: Math.round(exactSeconds),
  };
}
