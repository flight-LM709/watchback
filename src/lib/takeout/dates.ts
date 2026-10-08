/**
 * Robust parser for the locale-formatted date strings in Takeout *HTML* exports
 * (JSON exports use ISO-8601 UTC and don't need any of this).
 *
 * Examples handled:
 *   "Jan 5, 2024, 10:31:22 PM WIB"          (en-US, incl. U+202F narrow nbsp before PM)
 *   "5 Jan 2024, 22:31:22 WIB"              (en-GB)
 *   "5 Jan 2024, 22.31.22 WIB"              (id: dots as time separators)
 *   "5 Januari 2024 pukul 22.31.22 WIB"     (id, long month)
 *   "5 de ene. de 2024, 22:31:22 CET"       (es / pt style)
 *   "05.01.2024, 22:31:22 MEZ"              (de, numeric day-first)
 *   "05/01/2024 22:31:22 BRT"               (numeric, order auto-detected per file)
 *   "2024-01-05 22:31:22 GMT+07:00"
 *   "2024年1月5日 22:31:22 JST", "2024. 1. 5. 오후 10:31:22 KST"
 *
 * Limitations (documented in README):
 *   - Timezone abbreviations are mapped via a fixed table. Unknown ones fall back to the
 *     wall time in `fallbackTimeZone` (and are reported in diagnostics).
 *   - Ambiguous abbreviations (CST, IST, BST, AST...) are resolved using the fallback zone's region.
 *   - Abbreviations carry no DST info beyond what the abbreviation itself says (PST vs PDT).
 *   - Numeric D/M/Y vs M/D/Y is detected from the whole file; if every date is ambiguous
 *     (day <= 12) we assume day-first.
 *   - HTML has second precision only.
 */

import { runtimeTimeZone, zonedWallTimeToUtc } from "./tz";

export type NumericOrder = "dmy" | "mdy";

export interface DateParseOptions {
  fallbackTimeZone?: string;
  numericOrder?: NumericOrder;
}

export interface ParsedDate {
  ms: number;
  /** Set when the zone abbreviation was unknown and the fallback zone was used. */
  unknownTz?: string;
  /** True when no zone info was present at all. */
  noTz?: boolean;
}

// ---------------------------------------------------------------------------
// Months
// ---------------------------------------------------------------------------

const MONTH_NAMES: string[][] = [
  // en
  ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"],
  // id / ms
  ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"],
  ["januari", "februari", "mac", "april", "mei", "jun", "julai", "ogos", "september", "oktober", "november", "disember"],
  // es
  ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  // pt
  ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
  // fr
  ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"],
  // de
  ["januar", "februar", "marz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"],
  // nl
  ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"],
  // it
  ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"],
  // tr
  ["ocak", "subat", "mart", "nisan", "mayis", "haziran", "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik"],
];

/** Abbreviations that aren't simple prefixes of a full name. */
const MONTH_ALIASES: Record<string, number> = {
  agt: 8, ags: 8, mrt: 3, mac: 3, sept: 9, okt: 10, des: 12, dis: 12, ogo: 8, mei: 5, mag: 5,
};

const monthExact = new Map<string, number>();
for (const list of MONTH_NAMES) list.forEach((n, i) => monthExact.set(n, i + 1));
for (const [k, v] of Object.entries(MONTH_ALIASES)) monthExact.set(k, v);
const allFullNames: Array<[string, number]> = [];
for (const list of MONTH_NAMES) list.forEach((n, i) => allFullNames.push([n, i + 1]));
const monthPrefixCache = new Map<string, number | null>();

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function monthFromToken(raw: string): number | null {
  const t = stripAccents(raw.toLowerCase()).replace(/\.$/, "");
  if (t.length < 3) return null;
  const exact = monthExact.get(t);
  if (exact) return exact;
  const cached = monthPrefixCache.get(t);
  if (cached !== undefined) return cached;
  // Unique-prefix match across all languages ("juil" -> 7, but "jui" is ambiguous).
  let found: number | null = null;
  for (const [name, idx] of allFullNames) {
    if (name.startsWith(t)) {
      if (found !== null && found !== idx) { found = null; break; }
      found = idx;
    }
  }
  monthPrefixCache.set(t, found);
  return found;
}

// ---------------------------------------------------------------------------
// Timezones
// ---------------------------------------------------------------------------

/** Abbreviation -> offset in minutes. */
const TZ_ABBR: Record<string, number> = {
  UTC: 0, GMT: 0, UT: 0, Z: 0, WET: 0, WEZ: 0,
  WEST: 60, WESZ: 60, CET: 60, MEZ: 60, MET: 60, WAT: 60,
  CEST: 120, MESZ: 120, EET: 120, OEZ: 120, CAT: 120, SAST: 120,
  EEST: 180, OESZ: 180, MSK: 180, EAT: 180, TRT: 180, AST_ARABIA: 180,
  GST: 240, PKT: 300, NPT: 345, BDT_BD: 360,
  ICT: 420, WIB: 420,
  WITA: 480, SGT: 480, MYT: 480, HKT: 480, AWST: 480, PHT: 480, PHST: 480, CST_CHINA: 480, WST: 480,
  WIT: 540, JST: 540, KST: 540,
  ACST: 570, ACDT: 630, AEST: 600, AEDT: 660, NZST: 720, NZDT: 780,
  HST: -600, AKST: -540, AKDT: -480,
  PST: -480, PDT: -420, MST: -420, MDT: -360,
  CST: -360, CDT: -300, EST: -300, EDT: -240,
  ADT: -180, NST: -210, NDT: -150,
  BRT: -180, BRST: -120, ART: -180, CLT: -240, CLST: -180, COT: -300, PET: -300, VET: -240,
};

/** Resolve abbreviations that mean different things in different regions. */
function ambiguousOffset(abbr: string, fallbackTz: string): number | undefined {
  const tz = fallbackTz;
  switch (abbr) {
    case "CST":
      return /^Asia\/(Shanghai|Chongqing|Harbin|Taipei|Macau|Hong_Kong)|^PRC|^ROC/.test(tz) ? 480 : tz === "America/Havana" ? -300 : -360;
    case "IST":
      return tz === "Europe/Dublin" ? 60 : /Jerusalem|Tel_Aviv|Israel/.test(tz) ? 120 : 330;
    case "BST":
      return /^Asia\/Dhaka/.test(tz) ? 360 : 60;
    case "AST":
      return /^Asia\/(Riyadh|Baghdad|Kuwait|Qatar|Bahrain|Aden)/.test(tz) ? 180 : -240;
    case "PST":
      return tz === "Asia/Manila" ? 480 : -480;
    default:
      return undefined;
  }
}

function tzAbbrOffset(abbr: string, fallbackTz: string): number | undefined {
  const amb = ambiguousOffset(abbr, fallbackTz);
  if (amb !== undefined) return amb;
  return TZ_ABBR[abbr];
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

const TZ_OFFSET_RE = /(?:^|\s)(?:GMT|UTC)\s*([+\-\u2212])\s*(\d{1,2})(?::?(\d{2}))?$/i;
const TZ_ABBR_RE = /(?:^|\s)([A-Z]{1,5})$/;
const TIME_RE =
  /(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?(?:[.,]\d+)?\s*(am|pm|a\.?\s?m\.?|p\.?\s?m\.?)?$/i;

function normalizeSpaces(s: string): string {
  return s.replace(/[\u00a0\u202f\u2009\u2007\s]+/g, " ").trim();
}

export function parseTakeoutDate(input: string, opts: DateParseOptions = {}): ParsedDate | null {
  const fallbackTz = opts.fallbackTimeZone ?? runtimeTimeZone();
  let s = normalizeSpaces(input);
  if (!s) return null;

  // 1. Timezone (at the end).
  let offsetMin: number | undefined;
  let unknownTz: string | undefined;
  let noTz = false;
  let m = TZ_OFFSET_RE.exec(s);
  if (m) {
    const sign = m[1] === "+" ? 1 : -1;
    offsetMin = sign * (parseInt(m[2], 10) * 60 + (m[3] ? parseInt(m[3], 10) : 0));
    s = s.slice(0, m.index).trim();
  } else if ((m = TZ_ABBR_RE.exec(s)) && !/^(AM|PM)$/.test(m[1])) {
    const abbr = m[1];
    offsetMin = tzAbbrOffset(abbr, fallbackTz);
    if (offsetMin === undefined) unknownTz = abbr;
    s = s.slice(0, m.index).trim();
  } else {
    noTz = true;
  }

  // 2. Time (now at the end).
  let meridiem: "am" | "pm" | null = null;
  if (/오후|下午|午後/.test(s)) meridiem = "pm";
  else if (/오전|上午|午前/.test(s)) meridiem = "am";
  s = s.replace(/오후|下午|午後|오전|上午|午前/g, " ").trim();
  const tm = TIME_RE.exec(s);
  if (!tm) return null;
  let hour = parseInt(tm[1], 10);
  const minute = parseInt(tm[2], 10);
  const second = tm[3] ? parseInt(tm[3], 10) : 0;
  if (tm[4]) meridiem = /^p/i.test(tm[4]) ? "pm" : "am";
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59 || second > 60) return null;
  const datePart = s.slice(0, tm.index).replace(/[,\s]+$/, "");

  // 3. Date.
  const ymd = parseDatePart(datePart, opts.numericOrder ?? "dmy");
  if (!ymd) return null;
  const [year, month, day] = ymd;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  let ms: number;
  if (offsetMin !== undefined) {
    ms = Date.UTC(year, month - 1, day, hour, minute, second) - offsetMin * 60000;
  } else {
    ms = zonedWallTimeToUtc(fallbackTz, year, month, day, hour, minute, Math.min(second, 59));
  }
  if (!Number.isFinite(ms)) return null;
  const out: ParsedDate = { ms };
  if (unknownTz) out.unknownTz = unknownTz;
  if (noTz) out.noTz = true;
  return out;
}

function parseDatePart(d: string, order: NumericOrder): [number, number, number] | null {
  // CJK: 2024年1月5日
  let m = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/.exec(d);
  if (m) return [+m[1], +m[2], +m[3]];
  // Year-first numeric: 2024-01-05, 2024/1/5, 2024. 1. 5.
  m = /(\d{4})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})/.exec(d);
  if (m) return [+m[1], +m[2], +m[3]];

  // Month name somewhere.
  const tokens = d.split(/[\s,]+/).filter(Boolean);
  let month: number | null = null;
  const nums: string[] = [];
  for (const tok of tokens) {
    if (/^\d+\.?$/.test(tok)) {
      nums.push(tok.replace(/\.$/, ""));
    } else if (month === null) {
      const mm = monthFromToken(tok);
      if (mm) month = mm;
    }
  }
  if (month !== null) {
    const yi = nums.findIndex((n) => n.length === 4);
    if (yi < 0) return null;
    const year = +nums[yi];
    const rest = nums.filter((_, i) => i !== yi);
    if (rest.length < 1) return null;
    return [year, month, +rest[0]];
  }

  // Numeric with year last: 05.01.2024, 05/01/2024, 5-1-2024
  m = /(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4})/.exec(d);
  if (m) {
    const a = +m[1], b = +m[2], y = +m[3];
    // Dots are day-first in essentially every locale that uses them.
    const dotted = d.includes(".");
    if (a > 12) return [y, b, a];
    if (b > 12) return [y, a, b];
    return dotted || order === "dmy" ? [y, b, a] : [y, a, b];
  }
  return null;
}

/**
 * Look at a sample of date strings and decide whether slash-style numeric dates are
 * day-first or month-first. Returns null if nothing decisive was seen.
 */
export function detectNumericOrder(samples: Iterable<string>): NumericOrder | null {
  let dmy = 0, mdy = 0;
  for (const raw of samples) {
    const m = /(?:^|\D)(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(raw);
    if (!m) continue;
    const a = +m[1], b = +m[2];
    if (a > 12 && b <= 12) dmy++;
    else if (b > 12 && a <= 12) mdy++;
  }
  if (dmy === 0 && mdy === 0) return null;
  return dmy >= mdy ? "dmy" : "mdy";
}
