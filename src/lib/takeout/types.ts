/**
 * Shared types for the client-side Takeout parser.
 * Everything in src/lib/takeout is DOM-free so it can run inside a Web Worker.
 */

export type Product = "youtube" | "music";
export type EventKind = "watch" | "search";
export type HistoryFormat = "json" | "html";

export interface TakeoutEvent {
  kind: EventKind;
  product: Product;
  /** 11-char YouTube video ID, when the entry links to a video. */
  videoId?: string;
  /** Video/song title for watches, the query text for searches. */
  title: string;
  channelName?: string;
  channelUrl?: string;
  timestamp: Date;
  /** "From Google Ads" entries. Kept in the list (so they can be counted) but excluded from stats. */
  isAd: boolean;
  /** Removed / private / deleted video: Takeout has no real title (title is a placeholder or the bare URL). */
  unavailable?: boolean;
  /** Entry linked to a /shorts/ URL. (Most Shorts show up as plain watch?v= URLs in Takeout, so this undercounts.) */
  isShort?: boolean;
}

export type SourceRole = "watch" | "search" | "activity";

export interface SourceFile {
  path: string;
  format: HistoryFormat;
  role: SourceRole;
  entries: number;
}

export interface ParseDiagnostics {
  /** Raw entries seen across the used history files. */
  totalEntries: number;
  watchEvents: number;
  searchEvents: number;
  /** Watch/search events flagged "From Google Ads" (included in events, excluded from stats). */
  adEvents: number;
  /** Removed/private videos. */
  unavailableEvents: number;
  /** "Visited YouTube Music" style entries: no video, dropped. */
  visitEntries: number;
  /** Entries we couldn't classify (dropped). */
  skippedEntries: number;
  /** HTML entries whose date string we couldn't parse (dropped). */
  unparsedDates: number;
  /** Example date strings that failed to parse (max 5), to help debug new locales. */
  unparsedDateSamples: string[];
  /** Timezone abbreviations we didn't recognise -> count. Those dates were read as wall time in the fallback zone. */
  unknownTimezones: Record<string, number>;
  /** Files that were actually parsed. */
  sources: SourceFile[];
}

export interface ParseResult {
  /** Sorted ascending by timestamp. */
  events: TakeoutEvent[];
  diagnostics: ParseDiagnostics;
}

/**
 * unzipping → locating → (reading → parsing) per file → done.
 * "reading" covers inflating one file (processed = percent); JSON.parse right after it is synchronous and silent.
 */
export type ProgressPhase = "unzipping" | "locating" | "reading" | "parsing" | "done";

export interface ProgressInfo {
  phase: ProgressPhase;
  /** Work done in the current phase. Use processed/total as a fraction (units: entries for JSON, characters for HTML, percent while unzipping/reading). */
  processed: number;
  total: number;
  /** Running count of watch events found so far — use it for the "Counting {n} videos…" screen. */
  watchCount: number;
  file?: string;
}

export type ProgressCallback = (info: ProgressInfo) => void;

export interface ParseOptions {
  onProgress?: ProgressCallback;
  /**
   * IANA zone used for HTML dates whose timezone abbreviation is unknown or missing,
   * and to disambiguate abbreviations like CST/IST. Defaults to the runtime's zone.
   */
  fallbackTimeZone?: string;
  /** How often (in entries) to report progress. Default 2000. */
  progressEvery?: number;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type TakeoutErrorCode = "NOT_TAKEOUT_ZIP" | "NO_WATCH_HISTORY";

export class TakeoutError extends Error {
  readonly code: TakeoutErrorCode;
  constructor(code: TakeoutErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "TakeoutError";
  }
}

/** The file isn't a zip, or is a zip with nothing that looks like Google Takeout in it. */
export class NotTakeoutZipError extends TakeoutError {
  constructor(message = "That file isn't a Google Takeout .zip.") {
    super("NOT_TAKEOUT_ZIP", message);
    this.name = "NotTakeoutZipError";
  }
}

/** A Takeout zip, but no YouTube watch history file (or the file has zero watch entries). */
export class NoWatchHistoryError extends TakeoutError {
  constructor(message = "No YouTube watch history found in this Takeout.") {
    super("NO_WATCH_HISTORY", message);
    this.name = "NoWatchHistoryError";
  }
}

export function isTakeoutError(e: unknown): e is TakeoutError {
  return e instanceof TakeoutError;
}

/** Rebuild a typed error from its code (errors lose their class crossing a worker boundary). */
export function takeoutErrorFromCode(code: TakeoutErrorCode, message?: string): TakeoutError {
  return code === "NOT_TAKEOUT_ZIP" ? new NotTakeoutZipError(message) : new NoWatchHistoryError(message);
}

export function emptyDiagnostics(): ParseDiagnostics {
  return {
    totalEntries: 0,
    watchEvents: 0,
    searchEvents: 0,
    adEvents: 0,
    unavailableEvents: 0,
    visitEntries: 0,
    skippedEntries: 0,
    unparsedDates: 0,
    unparsedDateSamples: [],
    unknownTimezones: {},
    sources: [],
  };
}
