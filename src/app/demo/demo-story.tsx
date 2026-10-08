"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useHydrated } from "@/components/story";
import { WatchbackStory } from "@/components/watchback/WatchbackStory";
import type { WatchStats } from "@/lib/takeout/stats";
import { buildDurationSample, estimateWatchTime } from "@/lib/takeout/watchTime";
import { demoThumbnail, fakeDurations, makeDemoEvents } from "./demo-data";

const noop = () => () => {};

function Story() {
  const events = useMemo(() => makeDemoEvents(), []);
  const [durationsOk, setDurationsOk] = useState(true);
  const [run, setRun] = useState(0);
  const host = useSyncExternalStore(noop, () => window.location.host, () => "");

  const watchTimeFor = useCallback(
    (stats: WatchStats) => {
      if (!durationsOk) return null;
      const sample = buildDurationSample(stats, { cap: 2000, seed: 1 });
      return estimateWatchTime(fakeDurations(sample.ids), stats.playCountsById, sample);
    },
    [durationsOk],
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <WatchbackStory key={run} events={events} watchTimeFor={watchTimeFor} thumbLoader={demoThumbnail} onExit={() => setRun((r) => r + 1)} host={host} />
      <label className="flex min-h-11 items-center gap-2 px-4 font-mono text-xs text-ink-2">
        <input type="checkbox" checked={!durationsOk} onChange={(e) => setDurationsOk(!e.target.checked)} />
        Demo only: simulate the durations endpoint returning nothing
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
