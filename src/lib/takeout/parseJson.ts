/**
 * Parser for Takeout JSON history files (watch-history.json, search-history.json,
 * or My Activity/YouTube/MyActivity.json). Pure; safe to run in a Web Worker.
 */
import { classifyEntry, tally, type RawEntry } from "./entries";
import { extractVideoId, isAdText, isSearchUrl, learnAffix } from "./normalize";
import { emptyDiagnostics, type ParseDiagnostics, type SourceRole, type TakeoutEvent } from "./types";

export interface FileParseOptions {
  role: SourceRole;
  /** Called every `progressEvery` entries. */
  onProgress?: (processed: number, total: number, watchCount: number) => void;
  progressEvery?: number;
  fallbackTimeZone?: string;
}

export interface FileParseResult {
  events: TakeoutEvent[];
  diagnostics: ParseDiagnostics;
  entries: number;
}

interface JsonEntry {
  header?: unknown;
  title?: unknown;
  titleUrl?: unknown;
  subtitles?: Array<{ name?: unknown; url?: unknown }>;
  time?: unknown;
  details?: Array<{ name?: unknown }>;
  products?: unknown;
}

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Quick structural check used for sniffing unknown files. */
export function looksLikeActivityJson(data: unknown): data is JsonEntry[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true;
  const n = Math.min(data.length, 20);
  let ok = 0;
  for (let i = 0; i < n; i++) {
    const e = data[i] as JsonEntry;
    if (e && typeof e === "object" && typeof e.title === "string" && typeof e.time === "string") ok++;
  }
  return ok / n >= 0.5;
}

function sampleEvenly<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const out: T[] = [];
  const step = arr.length / max;
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}

export function parseJsonHistory(input: string | unknown[], opts: FileParseOptions): FileParseResult {
  const data: unknown = typeof input === "string" ? JSON.parse(input) : input;
  if (!looksLikeActivityJson(data)) throw new TypeError("Not a Takeout activity JSON array");
  const diag = emptyDiagnostics();
  const total = data.length;
  diag.totalEntries = total;

  // Learn localized verbs from entries we can already classify by URL.
  const sample = sampleEvenly(data, 2000);
  const watchTitles: string[] = [];
  const searchTitles: string[] = [];
  for (const e of sample) {
    const url = str(e?.titleUrl);
    const title = str(e?.title);
    if (!url || !title) continue;
    if (isSearchUrl(url)) searchTitles.push(title);
    else if (extractVideoId(url)) watchTitles.push(title);
  }
  const ctx = {
    role: opts.role,
    watchAffix: learnAffix(watchTitles),
    searchAffix: learnAffix(searchTitles),
  };

  const events: TakeoutEvent[] = [];
  const every = opts.progressEvery ?? 2000;
  for (let i = 0; i < total; i++) {
    const e = data[i] as JsonEntry;
    if (opts.onProgress && i % every === 0) opts.onProgress(i, total, diag.watchEvents);
    const title = str(e?.title);
    const time = str(e?.time);
    if (!title || !time) {
      diag.skippedEntries++;
      continue;
    }
    const ms = Date.parse(time);
    if (Number.isNaN(ms)) {
      diag.unparsedDates++;
      if (diag.unparsedDateSamples.length < 5) diag.unparsedDateSamples.push(time);
      continue;
    }
    let isAd = false;
    if (Array.isArray(e.details)) {
      for (const d of e.details) if (typeof d?.name === "string" && isAdText(d.name)) isAd = true;
    }
    const sub = Array.isArray(e.subtitles) ? e.subtitles[0] : undefined;
    const raw: RawEntry = {
      header: str(e.header),
      text: title,
      url: str(e.titleUrl),
      channelName: str(sub?.name),
      channelUrl: str(sub?.url),
      ms,
      isAd,
    };
    const out = classifyEntry(raw, ctx);
    tally(diag, out);
    if (typeof out === "object") events.push(out);
  }
  opts.onProgress?.(total, total, diag.watchEvents);
  return { events, diagnostics: diag, entries: total };
}
