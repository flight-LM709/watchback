"use client";

import { useState } from "react";
import { parseTakeoutInWorker, type WorkerParseResult } from "@/lib/takeout/client";
import { isTakeoutError, type ProgressInfo } from "@/lib/takeout/types";

export function TakeoutDebug() {
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [result, setResult] = useState<WorkerParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setResult(null);
    setError(null);
    try {
      const r = await parseTakeoutInWorker(Array.from(files), { onProgress: setProgress });
      setResult(r);
    } catch (e) {
      setError(isTakeoutError(e) ? `${e.code}: ${e.message}` : String(e));
    }
  }

  return (
    <div className="space-y-4">
      <input type="file" accept=".zip,application/zip" multiple onChange={(e) => onFiles(e.target.files)} />
      {progress && progress.phase !== "done" && !result && (
        <p>
          {progress.phase}… counting {progress.watchCount.toLocaleString()} videos
        </p>
      )}
      {error && <p className="text-red-600">{error}</p>}
      {result && (
        <pre className="overflow-auto whitespace-pre-wrap rounded border p-3">
          {JSON.stringify(
            { stats: { ...result.stats, uniqueVideoIds: `${result.stats.uniqueVideoIds.length} ids`, playCountsById: "…" }, diagnostics: result.diagnostics },
            null,
            2,
          )}
        </pre>
      )}
    </div>
  );
}
