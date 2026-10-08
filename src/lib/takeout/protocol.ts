import type { DateRange, WatchStats } from "./stats";
import type { ParseDiagnostics, ProgressInfo, TakeoutErrorCode, TakeoutEvent } from "./types";

export type WorkerRequest = {
  type: "parse";
  files: Array<Blob | ArrayBuffer>;
  /** Browser zone from the main thread (workers usually match, but be explicit). */
  timeZone: string;
  range?: DateRange;
};

export type WorkerResponse =
  | { type: "progress"; progress: ProgressInfo }
  | { type: "result"; events: TakeoutEvent[]; diagnostics: ParseDiagnostics; stats: WatchStats }
  | { type: "error"; code: TakeoutErrorCode | "UNKNOWN"; message: string };
