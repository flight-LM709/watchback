"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useHydrated } from "@/components/story";
import { WatchbackStory } from "@/components/watchback/WatchbackStory";
import type { WatchStats } from "@/lib/takeout/stats";
import { estimateShortsSplit } from "@/lib/takeout/shortsSplit";
import type { ShortsUnavailable } from "@/lib/takeout/shortsUnavailable";
import { buildDurationSample, estimateWatchTime } from "@/lib/takeout/watchTime";
import { demoThumbnail, fakeDurations, fakeIsShort, makeDemoEvents } from "./demo-data";

const noop = () => () => {};

function Story() {
  const events = useMemo(() => makeDemoEvents(), []);
  const [durationsOk, setDurationsOk] = useState(true);
  const [zeroShorts, setZeroShorts] = useState(false);
  const [unknownShortsTime, setUnknownShortsTime] = useState(false);
  const [noShortsCreators, setNoShortsCreators] = useState(false);
  // Demo only: the length lookup failed → no watch time, no split, one "No split this time." card.
  const [lookupFailing, setLookupFailing] = useState<ShortsUnavailable | null>(null);
  const [run, setRun] = useState(0);
  const host = useSyncExternalStore(noop, () => window.location.host, () => "");

  const watchTimeFor = useCallback(
    (stats: WatchStats) => {
      if (!durationsOk || lookupFailing) return null;
      const sample = buildDurationSample(stats, { cap: 2000, seed: 1 });
      return estimateWatchTime(fakeDurations(sample.ids), stats.playCountsById, sample);
    },
    [durationsOk, lookupFailing],
  );
  const shortsSplitFor = useCallback(
    (stats: WatchStats) => {
      if (!durationsOk || lookupFailing) return null;
      const sample = buildDurationSample(stats, { cap: 2000, seed: 1 });
      const flags = fakeIsShort(sample.ids);
      // Demo only: every looked-up video reads as long-form (the demo history has no /shorts/ links).
      if (zeroShorts) for (const id in flags) if (flags[id]) flags[id] = false;
      const durations = fakeDurations(sample.ids);
      // Demo only: no length came back for any Short → that side's time is unknown (em dash, plays-only sub).
      if (unknownShortsTime) for (const id in flags) if (flags[id]) durations[id] = null;
      // Demo only: Shorts with no channel info → empty Shorts creator column.
      const input = noShortsCreators
        ? { ...stats, videoPlays: stats.videoPlays.map((r) => (flags[r.videoId] ? { ...r, channel: undefined } : r)) }
        : stats;
      return estimateShortsSplit(input, flags, durations, sample);
    },
    [durationsOk, zeroShorts, unknownShortsTime, noShortsCreators, lookupFailing],
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <WatchbackStory key={`${run}-${zeroShorts}-${unknownShortsTime}-${noShortsCreators}-${lookupFailing}`} events={events} watchTimeFor={watchTimeFor} shortsSplitFor={shortsSplitFor} shortsUnavailable={lookupFailing} thumbLoader={demoThumbnail} onExit={() => setRun((r) => r + 1)} host={host} />
      <label className="flex min-h-11 items-center gap-2 px-4 font-mono text-xs text-ink-2">
        <input type="checkbox" checked={!durationsOk} onChange={(e) => setDurationsOk(!e.target.checked)} />
        Demo only: simulate the durations endpoint returning nothing
      </label>
      <label className="flex min-h-11 items-center gap-2 px-4 font-mono text-xs text-ink-2">
        <input type="checkbox" checked={zeroShorts} onChange={(e) => setZeroShorts(e.target.checked)} />
        Demo only: simulate zero Shorts
      </label>
      <label className="flex min-h-11 items-center gap-2 px-4 font-mono text-xs text-ink-2">
        <input type="checkbox" checked={unknownShortsTime} onChange={(e) => setUnknownShortsTime(e.target.checked)} />
        Demo only: simulate unknown Shorts watch time
      </label>
      <label className="flex min-h-11 items-center gap-2 px-4 font-mono text-xs text-ink-2">
        <input type="checkbox" checked={noShortsCreators} onChange={(e) => setNoShortsCreators(e.target.checked)} />
        Demo only: simulate no Shorts creators
      </label>
      <label className="flex min-h-11 flex-wrap items-center gap-2 px-4 font-mono text-xs text-ink-2">
        Demo only: simulate the length lookup failing
        <select
          className="min-h-11 rounded border border-ink/30 bg-paper-2 px-2 text-ink"
          value={lookupFailing ?? "off"}
          onChange={(e) => setLookupFailing(e.target.value === "off" ? null : (e.target.value as ShortsUnavailable))}
        >
          <option value="off">off</option>
          <option value="soon">soon (502 / wait ≤ 15 min)</option>
          <option value="later">later (503 / longer / network)</option>
        </select>
      </label>
    </div>
  );
}

export function DemoStory() {
  // Timezone-dependent output: render only in the browser to avoid hydration mismatches.
  const hydrated = useHydrated();
  if (!hydrated) return <div className="story-frame paper" aria-busy="true" />;
  return <Story />;
}
