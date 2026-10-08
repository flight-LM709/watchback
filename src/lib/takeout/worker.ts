/**
 * Web Worker entry: unzip + parse + compute default stats off the main thread.
 * Usage: new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })
 * (see client.ts).
 */
import { throttleProgress } from "./progress";
import type { WorkerRequest, WorkerResponse } from "./protocol";
import { computeStats } from "./stats";
import { isTakeoutError } from "./types";
import { parseTakeoutZip } from "./zip";

// Typed loosely so this file compiles under the DOM lib used by the rest of the app.
const ctx = self as unknown as {
  postMessage(msg: WorkerResponse): void;
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
};

ctx.onmessage = async (e) => {
  const req = e.data;
  if (req.type !== "parse") return;
  try {
    const { events, diagnostics } = await parseTakeoutZip(req.files, {
      fallbackTimeZone: req.timeZone,
      // ≤ ~20 posts/s; counts arrive every 500 entries so the counter ticks smoothly even on fast devices.
      progressEvery: 500,
      onProgress: throttleProgress((progress) => ctx.postMessage({ type: "progress", progress })),
    });
    const stats = computeStats(events, { timeZone: req.timeZone, range: req.range });
    ctx.postMessage({ type: "result", events, diagnostics, stats });
  } catch (err) {
    if (isTakeoutError(err)) ctx.postMessage({ type: "error", code: err.code, message: err.message });
    else ctx.postMessage({ type: "error", code: "UNKNOWN", message: err instanceof Error ? err.message : String(err) });
  }
};
