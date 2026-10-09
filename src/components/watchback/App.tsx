"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useHydrated } from "@/components/story";
import { errorMessage } from "@/copy/format";
import { parseTakeoutInWorker, type WorkerParseResult } from "@/lib/takeout/client";
import { MAX_DURATION_IDS, fetchDurations, type IsShortResponse } from "@/lib/takeout/durationsClient";
import { progressFraction } from "@/lib/takeout/progress";
import { estimateShortsSplit } from "@/lib/takeout/shortsSplit";
import { shortsUnavailableFor, type ShortsUnavailable } from "@/lib/takeout/shortsUnavailable";
import type { WatchStats } from "@/lib/takeout/stats";
import { isTakeoutError, type ProgressPhase } from "@/lib/takeout/types";
import { buildDurationSample, estimateWatchTime, type DurationsResponse } from "@/lib/takeout/watchTime";
import { Crunching, Landing, Upload } from "./screens";
import { WatchbackStory } from "./WatchbackStory";

type Screen = { name: "landing" } | { name: "upload"; error: string | null } | { name: "crunching" } | { name: "story"; result: WorkerParseResult; durations: DurationsResponse; isShort?: IsShortResponse; shortsUnavailable: ShortsUnavailable | null };

const noop = () => () => {};
const SAMPLE = { cap: MAX_DURATION_IDS, seed: 1 };
const START = { count: 0, fraction: 0, phase: "unzipping" as ProgressPhase };

/** Landing → upload → crunching → story. Everything is parsed in a Web Worker; only video IDs leave the device. */
export function WatchbackApp() {
  const hydrated = useHydrated();
  const [screen, setScreen] = useState<Screen>({ name: "landing" });
  const [progress, setProgress] = useState<{ count: number; fraction: number; phase: ProgressPhase }>(START);
  const host = useSyncExternalStore(noop, () => window.location.host, () => "");

  const onFiles = async (files: File[]) => {
    setScreen({ name: "crunching" });
    setProgress(START);
    try {
      const result = await parseTakeoutInWorker(files, {
        // Bar only moves forward: a later file's "reading" phase must not pull it back.
        onProgress: (p) => setProgress((prev) => ({ count: p.watchCount, fraction: Math.max(prev.fraction, progressFraction(p)), phase: p.phase })),
      });
      // One request, ≤ 2,000 IDs (sampled from the default period). Any failure drops the watch-time
      // and Shorts slides; one lookup-failed ("No split this time.") card stands in for the Shorts pair.
      // Same seed as SAMPLE below, so the default period's estimates use exactly the IDs that were looked up.
      const sample = buildDurationSample(result.stats, SAMPLE);
      const lookup = await fetchDurations(sample.ids, { timeoutMs: 10_000 });
      setScreen({ name: "story", result, durations: lookup.durations, isShort: lookup.isShort, shortsUnavailable: shortsUnavailableFor(lookup) });
    } catch (e) {
      setScreen({ name: "upload", error: isTakeoutError(e) ? errorMessage(e.code) : errorMessage("NOT_TAKEOUT_ZIP") });
    }
  };

  const durations = screen.name === "story" ? screen.durations : null;
  const isShort = screen.name === "story" ? screen.isShort : undefined;
  const watchTimeFor = useCallback(
    (stats: WatchStats) => {
      if (!durations || !Object.keys(durations).length) return null;
      const sample = buildDurationSample(stats, SAMPLE);
      return estimateWatchTime(durations, stats.playCountsById, sample);
    },
    [durations],
  );
  const shortsSplitFor = useCallback(
    (stats: WatchStats) => {
      if (!durations || !isShort) return null;
      return estimateShortsSplit(stats, isShort, durations, buildDurationSample(stats, SAMPLE));
    },
    [durations, isShort],
  );

  if (!hydrated) return <div className="paper min-h-dvh w-full max-w-[430px]" aria-busy="true" />;
  switch (screen.name) {
    case "landing":
      return <Landing onStart={() => setScreen({ name: "upload", error: null })} />;
    case "upload":
      return <Upload onFiles={onFiles} error={screen.error} />;
    case "crunching":
      return <Crunching count={progress.count} fraction={progress.fraction} phase={progress.phase} />;
    case "story":
      return (
        <div className="flex min-h-dvh items-center justify-center">
          <WatchbackStory events={screen.result.events} watchTimeFor={watchTimeFor} shortsSplitFor={shortsSplitFor} shortsUnavailable={screen.shortsUnavailable} onExit={() => setScreen({ name: "landing" })} host={host} />
        </div>
      );
  }
}
