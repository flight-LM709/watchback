"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useHydrated } from "@/components/story";
import { WatchbackStory } from "@/components/watchback/WatchbackStory";
import type { WatchStats } from "@/lib/takeout/stats";
import { estimateShortsSplit, estimateShortsSplitLinksOnly } from "@/lib/takeout/shortsSplit";
import { buildDurationSample, estimateWatchTime } from "@/lib/takeout/watchTime";
import { demoThumbnail, fakeDurations, fakeIsShort, makeDemoEvents } from "./demo-data";

const noop = () => () => {};

function Story() {
  const events = useMemo(() => makeDemoEvents(), []);
  const [durationsOk, setDurationsOk] = useState(true);
  const [zeroShorts, setZeroShorts] = useState(false);
  const [unknownShortsTime, setUnknownShortsTime] = useState(false);
  const [noShortsCreators, setNoShortsCreators] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [run, setRun] = useState(0);
  const host = useSyncExternalStore(noop, () => window.location.host, () => "");

  const watchTimeFor = useCallback(
    (stats: WatchStats) => {
      if (!durationsOk || lookupFailed) return null;
      const sample = buildDurationSample(stats, { cap: 2000, seed: 1 });
      return estimateWatchTime(fakeDurations(sample.ids), stats.playCountsById, sample);
    },
    [durationsOk, lookupFailed],
  );
  const shortsSplitFor = useCallback(
    (stats: WatchStats) => {
      if (!durationsOk) return null;
      const sample = buildDurationSample(stats, { cap: 2000, seed: 1 });
      const flags = fakeIsShort(sample.ids);
      // Demo only: every looked-up video reads as long-form (the demo history has no /shorts/ links).
      if (zeroShorts) for (const id in flags) if (flags[id]) flags[id] = false;
      if (lookupFailed) {
        // Demo only: the lookup failed (like a 429/503), so the app falls back to /shorts/ links only.
        // The demo history has no /shorts/ links, so pretend about 2 in 3 of the fake Shorts were
        // opened from one (the rest land in long-form, as the links-only note warns).
        const viaLink = (id: string) => flags[id] === true && [...id].reduce((h, ch) => (h * 33 + ch.charCodeAt(0)) >>> 0, 5) % 3 !== 0;
        const rows = stats.videoPlays.map((r) => (viaLink(r.videoId) ? { ...r, shortsUrlPlays: r.plays, ...(noShortsCreators ? { channel: undefined } : {}) } : r));
        return estimateShortsSplitLinksOnly({ ...stats, videoPlays: rows });
      }
      const durations = fakeDurations(sample.ids);
      // Demo only: no length came back for any Short → that side's time is unknown (em dash, plays-only sub).
      if (unknownShortsTime) for (const id in flags) if (flags[id]) durations[id] = null;
      // Demo only: Shorts with no channel info → empty Shorts creator column.
      const input = noShortsCreators
        ? { ...stats, videoPlays: stats.videoPlays.map((r) => (flags[r.videoId] ? { ...r, channel: undefined } : r)) }
        : stats;
      return estimateShortsSplit(input, flags, durations, sample);
    },
    [durationsOk, zeroShorts, unknownShortsTime, noShortsCreators, lookupFailed],
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <WatchbackStory key={`${run}-${zeroShorts}-${unknownShortsTime}-${noShortsCreators}-${lookupFailed}`} events={events} watchTimeFor={watchTimeFor} shortsSplitFor={shortsSplitFor} thumbLoader={demoThumbnail} onExit={() => setRun((r) => r + 1)} host={host} />
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
      <label className="flex min-h-11 items-center gap-2 px-4 font-mono text-xs text-ink-2">
        <input type="checkbox" checked={lookupFailed} onChange={(e) => setLookupFailed(e.target.checked)} />
        Demo only: simulate the length lookup failing (Shorts from links only)
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
