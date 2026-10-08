/**
 * Entry point: read a Google Takeout .zip (Blob/File/ArrayBuffer/Uint8Array) and return
 * normalized events. Runs fine in a Web Worker (JSZip + pure string parsing, no DOM).
 */
import JSZip from "jszip";
import { looksLikeActivityHtml, parseHtmlHistory } from "./parseHtml";
import { looksLikeActivityJson, parseJsonHistory, type FileParseResult } from "./parseJson";
import {
  emptyDiagnostics,
  NotTakeoutZipError,
  NoWatchHistoryError,
  type HistoryFormat,
  type ParseOptions,
  type ParseResult,
  type ParseDiagnostics,
  type SourceRole,
  type TakeoutEvent,
} from "./types";
import { runtimeTimeZone } from "./tz";

export type ZipInput = Blob | ArrayBuffer | Uint8Array;

// Known (English + a few localized) file names. Anything else under a YouTube-ish folder is content-sniffed.
const WATCH_NAME_RE =
  /^(watch[-_ ]?history|histori(?:a|al|que)?[-_ ](?:tontonan|de[-_ ]reprodu[cç][aã]o|de[-_ ]reproducciones|des[-_ ]vid[ée]os[-_ ]regard[ée]es)|riwayat[-_ ]tontonan|wiedergabeverlauf|kijkgeschiedenis|cronologia[-_ ]visualizzazioni)\.(json|html?)$/i;
const SEARCH_NAME_RE =
  /^(search[-_ ]?history|histori(?:a|al|que)?[-_ ](?:penelusuran|pencarian|de[-_ ](?:busca|b[uú]squeda|recherche)s?|des[-_ ]recherches)|riwayat[-_ ](?:penelusuran|pencarian)|suchverlauf|zoekgeschiedenis|cronologia[-_ ]ricerche)\.(json|html?)$/i;
const ACTIVITY_NAME_RE = /^(my[-_ ]?activity|aktivitas[-_ ]?saya|mi[-_ ]actividad|minha[-_ ]atividade|meine[-_ ]aktivit[aä]ten|mon[-_ ]activit[ée])\.(json|html?)$/i;
const YOUTUBE_PATH_RE = /youtube/i;
// Big YouTube files that are never watch/search history; skip sniffing them.
const NEVER_HISTORY_RE = /(subscription|langganan|playlist|daftar putar|comment|komentar|chat|video[-_ ]metadata|channel|kanal|music[-_ ](library|uploads)|\.csv$)/i;

interface Candidate {
  file: JSZip.JSZipObject;
  path: string;
  format: HistoryFormat;
  nameRole?: SourceRole;
}

function basename(p: string): string {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(i + 1) : p;
}

function formatOf(name: string): HistoryFormat | null {
  if (/\.json$/i.test(name)) return "json";
  if (/\.html?$/i.test(name)) return "html";
  return null;
}

async function loadZip(input: ZipInput, onPct?: (pct: number) => void): Promise<JSZip> {
  try {
    onPct?.(0);
    // Blob -> ArrayBuffer up front: works the same in window, worker and Node.
    const data = typeof Blob !== "undefined" && input instanceof Blob ? await input.arrayBuffer() : input;
    const zip = await JSZip.loadAsync(data);
    onPct?.(100);
    return zip;
  } catch {
    throw new NotTakeoutZipError();
  }
}

function findCandidates(zip: JSZip): { candidates: Candidate[]; looksLikeTakeout: boolean } {
  const candidates: Candidate[] = [];
  let looksLikeTakeout = false;
  zip.forEach((path, file) => {
    if (file.dir) return;
    const name = basename(path);
    if (/^takeout\//i.test(path) || /archive_browser\.html$/i.test(name)) looksLikeTakeout = true;
    const format = formatOf(name);
    if (!format) return;
    let nameRole: SourceRole | undefined;
    if (WATCH_NAME_RE.test(name)) nameRole = "watch";
    else if (SEARCH_NAME_RE.test(name)) nameRole = "search";
    else if (ACTIVITY_NAME_RE.test(name) && YOUTUBE_PATH_RE.test(path)) nameRole = "activity";
    if (nameRole) {
      candidates.push({ file, path, format, nameRole });
    } else if (YOUTUBE_PATH_RE.test(path) && !NEVER_HISTORY_RE.test(name) && !/archive_browser/i.test(name)) {
      candidates.push({ file, path, format });
    }
  });
  if (candidates.some((c) => c.nameRole === "watch" || c.nameRole === "search")) looksLikeTakeout = true;
  return { candidates, looksLikeTakeout };
}

interface ParsedSource {
  path: string;
  format: HistoryFormat;
  role: SourceRole;
  result: FileParseResult;
}

function roleFromContent(r: FileParseResult): SourceRole | null {
  const w = r.diagnostics.watchEvents;
  const s = r.diagnostics.searchEvents;
  if (w === 0 && s === 0) return null;
  if (w > 0 && s > 0 && Math.min(w, s) / (w + s) > 0.05) return "activity";
  return w >= s ? "watch" : "search";
}

function mergeDiagnostics(into: ParseDiagnostics, from: ParseDiagnostics): void {
  into.totalEntries += from.totalEntries;
  into.watchEvents += from.watchEvents;
  into.searchEvents += from.searchEvents;
  into.adEvents += from.adEvents;
  into.unavailableEvents += from.unavailableEvents;
  into.visitEntries += from.visitEntries;
  into.skippedEntries += from.skippedEntries;
  into.unparsedDates += from.unparsedDates;
  for (const s of from.unparsedDateSamples) if (into.unparsedDateSamples.length < 5) into.unparsedDateSamples.push(s);
  for (const [k, v] of Object.entries(from.unknownTimezones)) into.unknownTimezones[k] = (into.unknownTimezones[k] ?? 0) + v;
}

/**
 * Parse one Takeout zip, or several parts of a split export (takeout-…-001.zip, -002.zip…).
 * Throws NotTakeoutZipError / NoWatchHistoryError.
 */
export async function parseTakeoutZip(input: ZipInput | ZipInput[], options: ParseOptions = {}): Promise<ParseResult> {
  const inputs = Array.isArray(input) ? input : [input];
  const onProgress = options.onProgress;
  const fallbackTimeZone = options.fallbackTimeZone ?? runtimeTimeZone();

  const all: Candidate[] = [];
  let anyTakeout = false;
  for (let i = 0; i < inputs.length; i++) {
    const zip = await loadZip(inputs[i], (pct) =>
      onProgress?.({ phase: "unzipping", processed: Math.round((i * 100 + pct) / inputs.length), total: 100, watchCount: 0 }),
    );
    const { candidates, looksLikeTakeout } = findCandidates(zip);
    anyTakeout ||= looksLikeTakeout;
    all.push(...candidates);
  }
  onProgress?.({ phase: "locating", processed: 0, total: all.length, watchCount: 0 });

  // Named files first; within a role prefer JSON (has ms precision + UTC times).
  all.sort((a, b) => Number(!a.nameRole) - Number(!b.nameRole) || (a.format === "json" ? -1 : 1) - (b.format === "json" ? -1 : 1));

  const parsed: ParsedSource[] = [];
  let watchSoFar = 0;
  for (const c of all) {
    // Inflating a big watch-history.json is a large share of the parse time; report it so the UI isn't stuck at 0.
    const text = await c.file.async("string", (meta) =>
      onProgress?.({ phase: "reading", processed: Math.round(meta.percent), total: 100, watchCount: watchSoFar, file: c.path }),
    );
    let result: FileParseResult | null = null;
    const fileOpts = {
      role: c.nameRole ?? "activity",
      fallbackTimeZone,
      progressEvery: options.progressEvery,
      onProgress: (processed: number, total: number, watchCount: number) =>
        onProgress?.({ phase: "parsing", processed, total, watchCount: watchSoFar + watchCount, file: c.path }),
    };
    try {
      if (c.format === "json") {
        const data: unknown = JSON.parse(text);
        if (looksLikeActivityJson(data)) result = parseJsonHistory(data, fileOpts);
      } else if (looksLikeActivityHtml(text)) {
        result = parseHtmlHistory(text, fileOpts);
      }
    } catch {
      result = null; // unreadable / unrelated file
    }
    if (!result) continue;
    const role = c.nameRole ?? roleFromContent(result);
    if (!role) continue;
    anyTakeout = true;
    parsed.push({ path: c.path, format: c.format, role, result });
    if (role !== "search") watchSoFar += result.diagnostics.watchEvents;
  }

  if (!anyTakeout) throw new NotTakeoutZipError();

  // Pick sources: dedicated watch/search files win over My Activity (which duplicates them).
  // Only one format per role (JSON preferred, already sorted first).
  const pick = (role: SourceRole) => {
    const ofRole = parsed.filter((p) => p.role === role);
    if (ofRole.length === 0) return [];
    const fmt = ofRole[0].format;
    return ofRole.filter((p) => p.format === fmt);
  };
  const watch = pick("watch");
  const search = pick("search");
  const activity = pick("activity");
  const chosen: ParsedSource[] = [];
  if (watch.length) chosen.push(...watch);
  if (search.length) chosen.push(...search);
  if (activity.length && (!watch.length || !search.length)) chosen.push(...activity);

  const diagnostics = emptyDiagnostics();
  let events: TakeoutEvent[] = [];
  for (const src of chosen) {
    let evs = src.result.events;
    // When activity fills a gap, only take the kind that's missing.
    if (src.role === "activity") {
      if (watch.length) evs = evs.filter((e) => e.kind === "search");
      if (search.length) evs = evs.filter((e) => e.kind === "watch");
    }
    // A search file's events are searches; a watch file's are watches.
    if (src.role === "watch") evs = evs.filter((e) => e.kind === "watch");
    if (src.role === "search") evs = evs.filter((e) => e.kind === "search");
    events = events.concat(evs);
    mergeDiagnostics(diagnostics, src.result.diagnostics);
    diagnostics.sources.push({ path: src.path, format: src.format, role: src.role, entries: src.result.entries });
  }

  if (!events.some((e) => e.kind === "watch")) throw new NoWatchHistoryError();

  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  // Recount from the final list so numbers match exactly what callers get.
  diagnostics.watchEvents = diagnostics.searchEvents = diagnostics.adEvents = diagnostics.unavailableEvents = 0;
  for (const e of events) {
    if (e.kind === "watch") diagnostics.watchEvents++;
    else diagnostics.searchEvents++;
    if (e.isAd) diagnostics.adEvents++;
    if (e.unavailable) diagnostics.unavailableEvents++;
  }
  const watchCount = diagnostics.watchEvents;
  onProgress?.({ phase: "done", processed: 1, total: 1, watchCount });
  return { events, diagnostics };
}
