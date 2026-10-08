/**
 * Main-thread helper: runs the parser in a Web Worker and resolves with events + stats.
 * Import only from client components.
 */
import type { WorkerRequest, WorkerResponse } from "./protocol";
import type { DateRange, WatchStats } from "./stats";
import { takeoutErrorFromCode, type ParseDiagnostics, type ProgressCallback, type TakeoutEvent } from "./types";
import { runtimeTimeZone } from "./tz";

export interface WorkerParseResult {
  events: TakeoutEvent[];
  diagnostics: ParseDiagnostics;
  stats: WatchStats;
}

export function parseTakeoutInWorker(
  files: Blob | Blob[],
  opts: { onProgress?: ProgressCallback; timeZone?: string; range?: DateRange; signal?: AbortSignal } = {},
): Promise<WorkerParseResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    const done = () => worker.terminate();
    opts.signal?.addEventListener("abort", () => {
      done();
      reject(new DOMException("Aborted", "AbortError"));
    });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === "progress") opts.onProgress?.(msg.progress);
      else if (msg.type === "result") {
        done();
        resolve({ events: msg.events, diagnostics: msg.diagnostics, stats: msg.stats });
      } else {
        done();
        reject(msg.code === "UNKNOWN" ? new Error(msg.message) : takeoutErrorFromCode(msg.code, msg.message));
      }
    };
    worker.onerror = (e) => {
      done();
      reject(new Error(e.message || "Worker failed"));
    };
    const req: WorkerRequest = {
      type: "parse",
      files: Array.isArray(files) ? files : [files],
      timeZone: opts.timeZone ?? runtimeTimeZone(),
      range: opts.range,
    };
    worker.postMessage(req);
  });
}
