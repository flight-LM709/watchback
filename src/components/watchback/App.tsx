"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useHydrated } from "@/components/story";
import { errorMessage } from "@/copy/format";
import { parseTakeoutInWorker, type WorkerParseResult } from "@/lib/takeout/client";
import { MAX_DURATION_IDS, fetchDurations } from "@/lib/takeout/durationsClient";
import type { WatchStats } from "@/lib/takeout/stats";
import { isTakeoutError } from "@/lib/takeout/types";
import { buildDurationSample, estimateWatchTime, type DurationsResponse } from "@/lib/takeout/watchTime";
import { Crunching, Landing, Upload } from "./screens";
import { WatchbackStory } from "./WatchbackStory";

type Screen = { name: "landing" } | { name: "upload"; error: string | null } | { name: "crunching" } | { name: "story"; result: WorkerParseResult; durations: DurationsResponse };

const noop = () => () => {};

/** Landing → upload → crunching → story. Everything is parsed in a Web Worker; only video IDs leave the device. */
export function WatchbackApp() {
  const hydrated = useHydrated();
  const [screen, setScreen] = useState<Screen>({ name: "landing" });
  const [progress, setProgress] = useState({ count: 0, fraction: 0 });
  const host = useSyncExternalStore(noop, () => window.location.host, () => "");

  const onFiles = async (files: File[]) => {
    setScreen({ name: "crunching" });
    setProgress({ count: 0, fraction: 0 });
    try {
      const result = await parseTakeoutInWorker(files, {
        onProgress: (p) => setProgress({ count: p.watchCount, fraction: p.phase === "done" ? 1 : p.total ? p.processed / p.total : 0 }),
      });
      // One request, ≤ 2,000 IDs (sampled from the default period). Any failure drops the watch-time slide.
      const sample = buildDurationSample(result.stats, { cap: MAX_DURATION_IDS });
      const { durations } = await fetchDurations(sample.ids, { timeoutMs: 10_000 });
      setScreen({ name: "story", result, durations });
    } catch (e) {
      setScreen({ name: "upload", error: isTakeoutError(e) ? errorMessage(e.code) : errorMessage("NOT_TAKEOUT_ZIP") });
    }
  };

  const durations = screen.name === "story" ? screen.durations : null;
  const watchTimeFor = useCallback(
    (stats: WatchStats) => {
      if (!durations || !Object.keys(durations).length) return null;
      const sample = buildDurationSample(stats, { cap: MAX_DURATION_IDS, seed: 1 });
      return estimateWatchTime(durations, stats.playCountsById, sample);
    },
    [durations],
  );

  if (!hydrated) return <div className="paper min-h-dvh w-full max-w-[430px]" aria-busy="true" />;
  switch (screen.name) {
    case "landing":
      return <Landing onStart={() => setScreen({ name: "upload", error: null })} />;
    case "upload":
      return <Upload onFiles={onFiles} error={screen.error} />;
    case "crunching":
      return <Crunching count={progress.count} fraction={progress.fraction} />;
    case "story":
      return (
        <div className="flex min-h-dvh items-center justify-center">
          <WatchbackStory events={screen.result.events} watchTimeFor={watchTimeFor} onExit={() => setScreen({ name: "landing" })} host={host} />
        </div>
      );
  }
}
