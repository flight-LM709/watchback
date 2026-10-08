/**
 * Format-independent classification of one raw history entry into a TakeoutEvent.
 */
import type { ParseDiagnostics, SourceRole, TakeoutEvent } from "./types";
import {
  type Affix,
  cleanText,
  extractSearchQuery,
  extractVideoId,
  isMusicUrl,
  isRemovedText,
  isSearchUrl,
  isShortsUrl,
  looksLikeUrl,
  matchKnownPrefix,
  stripAffix,
} from "./normalize";

export interface RawEntry {
  header?: string;
  /**
   * JSON: the full "title" ("Watched Foo").
   * HTML: the text before the first link ("Watched"), or the whole line if there's no link.
   */
  text: string;
  /** HTML only: the link text (the real title / query). */
  linkText?: string;
  url?: string;
  channelName?: string;
  channelUrl?: string;
  ms: number;
  isAd: boolean;
}

export interface ClassifyContext {
  role: SourceRole;
  watchAffix: Affix | null;
  searchAffix: Affix | null;
}

export type ClassifyOutcome = TakeoutEvent | "visit" | "skip";

function stripVerb(text: string, affix: Affix | null): string {
  const known = matchKnownPrefix(text);
  if (known) return known.rest;
  const learned = stripAffix(text, affix);
  return learned ?? cleanText(text);
}

export function classifyEntry(e: RawEntry, ctx: ClassifyContext): ClassifyOutcome {
  const url = e.url;
  const timestamp = new Date(e.ms);
  const product = (e.header && /music/i.test(e.header)) || isMusicUrl(url) ? "music" : "youtube";

  // --- Searches -----------------------------------------------------------
  if (url && isSearchUrl(url)) {
    const q = e.linkText !== undefined ? cleanText(e.linkText) : extractSearchQuery(url) ?? stripVerb(e.text, ctx.searchAffix);
    return { kind: "search", product, title: q || extractSearchQuery(url) || "", timestamp, isAd: e.isAd };
  }

  const videoId = extractVideoId(url);
  const known = matchKnownPrefix(e.text);

  // --- Watches with a video link -----------------------------------------
  if (videoId) {
    let title = e.linkText !== undefined ? cleanText(e.linkText) : stripVerb(e.text, ctx.watchAffix);
    let unavailable: boolean | undefined;
    if (!title || looksLikeUrl(title)) {
      // Private/deleted videos show up as "Watched https://www.youtube.com/watch?v=…"
      unavailable = true;
      title = title || url || "";
    } else if (isRemovedText(title)) {
      unavailable = true;
    }
    const ev: TakeoutEvent = { kind: "watch", product, videoId, title, timestamp, isAd: e.isAd };
    if (e.channelName) ev.channelName = cleanText(e.channelName);
    if (e.channelUrl) ev.channelUrl = e.channelUrl;
    if (unavailable) ev.unavailable = true;
    if (isShortsUrl(url)) ev.isShort = true;
    return ev;
  }

  // --- No video link ------------------------------------------------------
  const full = cleanText(e.linkText !== undefined ? `${e.text} ${e.linkText}` : e.text);
  if (known?.kind === "visit") return "visit";
  if (isRemovedText(full) && (known?.kind === "watch" || ctx.role !== "search")) {
    return { kind: "watch", product, title: full, timestamp, isAd: e.isAd, unavailable: true };
  }
  if (known?.kind === "search" || (ctx.role === "search" && !known)) {
    const q = e.linkText !== undefined ? cleanText(e.linkText) : stripVerb(e.text, ctx.searchAffix);
    if (q) return { kind: "search", product, title: q, timestamp, isAd: e.isAd };
  }
  if (known?.kind === "watch" || stripAffix(e.text, ctx.watchAffix) !== null) {
    // A watch without a usable link (e.g. a post, or a video whose URL Takeout dropped).
    const title = e.linkText !== undefined ? cleanText(e.linkText) : stripVerb(e.text, ctx.watchAffix);
    return { kind: "watch", product, title, timestamp, isAd: e.isAd, unavailable: true };
  }
  return "skip";
}

export function tally(diag: ParseDiagnostics, out: ClassifyOutcome): void {
  if (out === "visit") diag.visitEntries++;
  else if (out === "skip") diag.skippedEntries++;
  else {
    if (out.kind === "watch") diag.watchEvents++;
    else diag.searchEvents++;
    if (out.isAd) diag.adEvents++;
    if (out.unavailable) diag.unavailableEvents++;
  }
}
