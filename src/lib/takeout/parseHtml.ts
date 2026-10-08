/**
 * Parser for Takeout HTML history files (MyActivity "outer-cell" markup).
 * String-based on purpose: DOMParser doesn't exist inside Web Workers, and regex
 * scanning is much faster than building a DOM for 100MB+ files.
 */
import { detectNumericOrder, parseTakeoutDate } from "./dates";
import { classifyEntry, tally, type RawEntry } from "./entries";
import { cleanText, decodeEntities, isAdText, stripTags } from "./normalize";
import type { FileParseOptions, FileParseResult } from "./parseJson";
import { emptyDiagnostics, type TakeoutEvent } from "./types";
import { runtimeTimeZone } from "./tz";

const CELL_MARK = "outer-cell";
const HEADER_RE = /<p class="mdl-typography--title"[^>]*>([\s\S]*?)<\/p>/;
const CONTENT_RE = /<div class="content-cell[^"]*mdl-typography--body-1[^"]*"[^>]*>([\s\S]*?)<\/div>/;
const CAPTION_RE = /<div class="content-cell[^"]*mdl-typography--caption[^"]*"[^>]*>([\s\S]*?)<\/div>/;
const BR_RE = /<br\s*\/?>/i;
const ANCHOR_RE = /<a\s[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i;

export function looksLikeActivityHtml(html: string): boolean {
  return html.includes(CELL_MARK) && html.includes("content-cell");
}

interface Cell {
  header?: string;
  text: string;
  linkText?: string;
  url?: string;
  channelName?: string;
  channelUrl?: string;
  dateStr?: string;
  isAd: boolean;
}

const txt = (s: string) => cleanText(decodeEntities(stripTags(s)));

export function parseCell(cellHtml: string): Cell | null {
  const content = CONTENT_RE.exec(cellHtml);
  if (!content) return null;
  const headerM = HEADER_RE.exec(cellHtml);
  const captionM = CAPTION_RE.exec(cellHtml);
  const segments = content[1].split(BR_RE);

  const cell: Cell = { text: "", isAd: false };
  if (headerM) cell.header = txt(headerM[1]);
  if (captionM) cell.isAd = isAdText(decodeEntities(stripTags(captionM[1])));

  // First line: "<verb>&nbsp;<a href=url>title</a>" or plain text (removed video / visited).
  const first = segments[0] ?? "";
  const a = ANCHOR_RE.exec(first);
  if (a) {
    cell.text = txt(first.slice(0, a.index));
    cell.url = decodeEntities(a[1]);
    cell.linkText = cleanText(decodeEntities(stripTags(a[2])));
    const after = txt(first.slice(a.index + a[0].length));
    if (after) cell.text = cleanText(`${cell.text} ${after}`); // suffix-style verbs
  } else {
    cell.text = txt(first);
  }

  // Remaining lines: optional channel link, then the date (last non-empty plain-text line).
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const ca = ANCHOR_RE.exec(seg);
    if (ca) {
      if (cell.channelUrl === undefined && cell.channelName === undefined) {
        cell.channelUrl = decodeEntities(ca[1]);
        cell.channelName = cleanText(decodeEntities(stripTags(ca[2])));
      }
      continue;
    }
    const t = txt(seg);
    if (t) cell.dateStr = t;
  }
  return cell;
}

/** Iterate cells without materialising a giant split() array. */
function* iterateCells(html: string): Generator<{ cell: string; pos: number }> {
  let idx = html.indexOf(CELL_MARK);
  while (idx >= 0) {
    const next = html.indexOf(CELL_MARK, idx + CELL_MARK.length);
    yield { cell: html.slice(idx, next < 0 ? html.length : next), pos: idx };
    idx = next;
  }
}

export function parseHtmlHistory(html: string, opts: FileParseOptions): FileParseResult {
  const diag = emptyDiagnostics();
  const fallbackTimeZone = opts.fallbackTimeZone ?? runtimeTimeZone();
  const total = html.length;
  const every = opts.progressEvery ?? 2000;

  // Pass 1: extract cells (cheap) so we can detect numeric date order across the file.
  const cells: Cell[] = [];
  let n = 0;
  for (const { cell, pos } of iterateCells(html)) {
    const c = parseCell(cell);
    if (c) cells.push(c);
    if (opts.onProgress && ++n % every === 0) opts.onProgress(Math.round(pos / 2), total, 0);
  }
  diag.totalEntries = cells.length;
  const numericOrder = detectNumericOrder(cells.slice(0, 5000).map((c) => c.dateStr ?? "")) ?? "dmy";

  // Learn verbs: HTML gives us the verb separately (text before the link).
  // For known-list misses, treat the most common verb on video/search links as the verb.
  const ctx = { role: opts.role, watchAffix: null, searchAffix: null } as Parameters<typeof classifyEntry>[1];
  const verbCounts = new Map<string, number>();
  for (let i = 0; i < Math.min(cells.length, 2000); i++) {
    const c = cells[i];
    if (c.url && c.text) verbCounts.set(c.text, (verbCounts.get(c.text) ?? 0) + 1);
  }
  const topVerb = [...verbCounts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
  if (topVerb && opts.role !== "search") ctx.watchAffix = { prefix: topVerb };
  if (topVerb && opts.role === "search") ctx.searchAffix = { prefix: topVerb };

  // Pass 2: dates + classification.
  const events: TakeoutEvent[] = [];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (opts.onProgress && i % every === 0) {
      opts.onProgress(Math.round(total / 2 + (i / cells.length) * (total / 2)), total, diag.watchEvents);
    }
    if (!c.dateStr) {
      diag.unparsedDates++;
      continue;
    }
    const d = parseTakeoutDate(c.dateStr, { fallbackTimeZone, numericOrder });
    if (!d) {
      diag.unparsedDates++;
      if (diag.unparsedDateSamples.length < 5) diag.unparsedDateSamples.push(c.dateStr);
      continue;
    }
    if (d.unknownTz) diag.unknownTimezones[d.unknownTz] = (diag.unknownTimezones[d.unknownTz] ?? 0) + 1;
    const raw: RawEntry = {
      header: c.header,
      text: c.text,
      linkText: c.linkText,
      url: c.url,
      channelName: c.channelName,
      channelUrl: c.channelUrl,
      ms: d.ms,
      isAd: c.isAd,
    };
    const out = classifyEntry(raw, ctx);
    tally(diag, out);
    if (typeof out === "object") events.push(out);
  }
  opts.onProgress?.(total, total, diag.watchEvents);
  return { events, diagnostics: diag, entries: cells.length };
}
