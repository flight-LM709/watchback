"use client";

import { useState } from "react";
import { parseTakeoutInWorker, type WorkerParseResult } from "@/lib/takeout/client";
import { lookupWatchTime } from "@/lib/takeout/durationsClient";
import type { WatchTimeEstimate } from "@/lib/takeout/watchTime";
import { isTakeoutError, type ProgressInfo } from "@/lib/takeout/types";
import { en } from "@/copy/en";
import { errorMessage, fill } from "@/copy/format";

export function TakeoutDebug() {
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [result, setResult] = useState<WorkerParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchTime, setWatchTime] = useState<{ estimate: WatchTimeEstimate | null; error?: string; requestedIds: number } | "loading" | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setResult(null);
    setError(null);
    setWatchTime(null);
    try {
      const r = await parseTakeoutInWorker(Array.from(files), { onProgress: setProgress });
      setResult(r);
      setWatchTime("loading");
      setWatchTime(await lookupWatchTime(r.stats));
    } catch (e) {
      setError(isTakeoutError(e) ? errorMessage(e.code) : String(e));
    }
  }

  return (
    <div className="space-y-4">
      <input type="file" accept=".zip,application/zip" multiple onChange={(e) => onFiles(e.target.files)} />
      {progress && progress.phase !== "done" && !result && (
        <p>
          {fill(en.crunching.counter, { n: progress.watchCount.toLocaleString("en-US") })}
        </p>
      )}
      {error && <p className="text-red-600">{error}</p>}
      {watchTime && (
        <p data-testid="watch-time">
          {watchTime === "loading"
            ? "Looking up video lengths…"
            : watchTime.estimate
              ? `Watch time ≈ ${(watchTime.estimate.seconds / 3600).toFixed(1)} h (${watchTime.estimate.seconds} s, coverage ${Math.round(watchTime.estimate.coverage * 100)}%, ${watchTime.requestedIds} IDs sent)`
              : `Watch-time slide dropped (${watchTime.error ?? "no durations"})`}
        </p>
      )}
      {result && (
        <pre className="overflow-auto whitespace-pre-wrap rounded border p-3">
          {JSON.stringify(
            { stats: { ...result.stats, uniqueVideoIds: `${result.stats.uniqueVideoIds.length} ids`, playCountsById: "…", videoPlays: `${result.stats.videoPlays.length} rows`, channels: "…" }, diagnostics: result.diagnostics },
            null,
            2,
          )}
        </pre>
      )}
    </div>
  );
}
