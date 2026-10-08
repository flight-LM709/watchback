/**
 * Shared helpers to turn raw Takeout entries (JSON or HTML) into TakeoutEvents.
 */

const ID = "([A-Za-z0-9_-]{11})";
const VIDEO_ID_RES = [
  new RegExp(`[?&]v=${ID}`),
  new RegExp(`/shorts/${ID}`),
  new RegExp(`youtu\\.be/${ID}`),
  new RegExp(`/(?:live|embed|v)/${ID}`),
];
const SHORTS_RE = /\/shorts\//;
const MUSIC_URL_RE = /^https?:\/\/music\.youtube\.com/i;
const SEARCH_URL_RE = /\/results\?(?:[^#]*&)?search_query=([^&#]*)/;
const URLISH_RE = /^https?:\/\/\S+$/i;

export const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractVideoId(url: string | undefined): string | undefined {
  if (!url) return undefined;
  for (const re of VIDEO_ID_RES) {
    const m = re.exec(url);
    if (m) return m[1];
  }
  return undefined;
}

export const isShortsUrl = (url?: string) => !!url && SHORTS_RE.test(url);
export const isMusicUrl = (url?: string) => !!url && MUSIC_URL_RE.test(url);
export const looksLikeUrl = (s: string) => URLISH_RE.test(s.trim());

export function extractSearchQuery(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const m = SEARCH_URL_RE.exec(url);
  if (!m) return undefined;
  try {
    return decodeURIComponent(m[1].replace(/\+/g, " ")).trim();
  } catch {
    return m[1].replace(/\+/g, " ").trim();
  }
}

export const isSearchUrl = (url?: string) => !!url && SEARCH_URL_RE.test(url);

// ---------------------------------------------------------------------------
// Localized prefixes. Order matters: longer/more specific first.
// ---------------------------------------------------------------------------

export const WATCH_PREFIXES = [
  "Watched", // en
  "Telah menonton", "Menonton", "Ditonton", "Tonton", // id
  "Has visto", "Viste", "Visto", // es
  "Assistiu a", "Assistiu", "Assistido", // pt
  "Vous avez regardé", "A regardé", "Regardé", // fr
  "Angesehen:", "Angesehen", // de
  "Hai guardato", "Guardato", // it
  "Bekeken", // nl
  "İzlendi", "izlendi", // tr
  "Đã xem", // vi
  "ดู", // th
];

export const SEARCH_PREFIXES = [
  "Searched for", // en
  "Menelusuri", "Mencari", "Telusuri", // id
  "Buscaste", "Has buscado", "Búsqueda:", // es
  "Pesquisou por", "Pesquisou", // pt
  "Vous avez recherché", "Recherche :", // fr
  "Gesucht nach", "Gesucht:", // de
  "Hai cercato", "Cercato", // it
  "Gezocht naar", // nl
  "Đã tìm kiếm", // vi
];

export const VISIT_PREFIXES = [
  "Visited", "Mengunjungi", "Membuka", "Visitaste", "Has visitado", "Visitou", "Vous avez consulté",
  "Besucht:", "Hai visitato", "Bezocht",
];

const REMOVED_RE =
  /(video (that has been|which has been|that was) (removed|deleted)|video yang (telah|sudah) dihapus|vídeo (que se ha eliminado|eliminado|removido|que foi removido)|vidéo (qui a été supprimée|supprimée)|entferntes video|video (rimosso|eliminato)|verwijderde video)/i;

export const isRemovedText = (s: string) => REMOVED_RE.test(s);

const AD_RE = /google\s*ads|iklan google|google-anzeigen|anuncios de google|anúncios do google|annonces google|annunci google/i;
export const isAdText = (s: string) => AD_RE.test(s);

export type PrefixKind = "watch" | "search" | "visit";

/** Normalize the whitespace Takeout sometimes puts after the verb (nbsp etc.). */
export function cleanText(s: string): string {
  return s.replace(/[\u00a0\u202f\u2009]/g, " ").replace(/\s+/g, " ").trim();
}

function startsWithWord(text: string, prefix: string): boolean {
  if (!text.startsWith(prefix)) return false;
  if (text.length === prefix.length) return true;
  const next = text[prefix.length];
  return next === " " || /[:：]$/.test(prefix);
}

export function matchKnownPrefix(text: string): { kind: PrefixKind; rest: string } | null {
  const t = cleanText(text);
  for (const [kind, list] of [
    ["search", SEARCH_PREFIXES],
    ["watch", WATCH_PREFIXES],
    ["visit", VISIT_PREFIXES],
  ] as const) {
    for (const p of list) {
      if (startsWithWord(t, p)) return { kind, rest: t.slice(p.length).trim() };
    }
  }
  return null;
}

/**
 * For JSON (where "title" is "<verb> <video title>") learn the verb from the file
 * itself when it isn't in our known list. Takes titles of entries that we already
 * know are watches (they have watch URLs) and returns the common leading word(s)
 * or trailing word(s). Requires a decent sample so a binge of one series can't fool it.
 */
export interface Affix { prefix?: string; suffix?: string }

export function learnAffix(titles: string[], minSamples = 20): Affix | null {
  const sample = titles.map(cleanText).filter((t) => t.length > 0);
  if (sample.length < minSamples) return null;
  const knownHits = sample.filter((t) => matchKnownPrefix(t)).length;
  if (knownHits / sample.length >= 0.5) return null; // known list works fine

  let lcp = sample[0];
  for (const t of sample) {
    let i = 0;
    while (i < lcp.length && i < t.length && lcp[i] === t[i]) i++;
    lcp = lcp.slice(0, i);
    if (!lcp) break;
  }
  const sp = lcp.lastIndexOf(" ");
  const prefix = sp > 0 ? lcp.slice(0, sp + 1) : "";
  if (prefix.trim()) return { prefix: prefix.trim() };

  let lcs = sample[0];
  for (const t of sample) {
    let i = 0;
    while (i < lcs.length && i < t.length && lcs[lcs.length - 1 - i] === t[t.length - 1 - i]) i++;
    lcs = lcs.slice(lcs.length - i);
    if (!lcs) break;
  }
  const sp2 = lcs.indexOf(" ");
  const suffix = sp2 >= 0 ? lcs.slice(sp2) : "";
  if (suffix.trim()) return { suffix: suffix.trim() };
  return null;
}

export function stripAffix(text: string, affix: Affix | null): string | null {
  if (!affix) return null;
  const t = cleanText(text);
  if (affix.prefix && t.startsWith(affix.prefix)) return t.slice(affix.prefix.length).trim();
  if (affix.suffix && t.endsWith(affix.suffix)) return t.slice(0, t.length - affix.suffix.length).trim();
  return null;
}

// ---------------------------------------------------------------------------
// Music helpers
// ---------------------------------------------------------------------------

const TOPIC_RE = /\s+[-–]\s+(Topic|Topik|Tema|Thème|Thema|Argomento)$/i;
export function artistFromChannel(name: string | undefined): string | undefined {
  if (!name) return undefined;
  return name.replace(TOPIC_RE, "").trim() || undefined;
}

// ---------------------------------------------------------------------------
// HTML entity decoding (no DOM in workers)
// ---------------------------------------------------------------------------

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", emsp: "\u2003", ensp: "\u2002",
  thinsp: "\u2009", ndash: "–", mdash: "—", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
};

export function decodeEntities(s: string): string {
  if (s.indexOf("&") < 0) return s;
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : all;
    }
    return NAMED[body.toLowerCase()] ?? all;
  });
}

export function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}
