/**
 * Parse a YouTube ISO 8601 duration ("PT1H2M3S", "P1DT2H", "P0D") into seconds.
 * Returns null for anything unparseable or zero-length (live / upcoming streams report P0D).
 */
const ISO_DURATION =
  /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

export function parseIsoDuration(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = ISO_DURATION.exec(value);
  if (!m || value === "P" || value.endsWith("T")) return null;
  const [, w, d, h, min, s] = m;
  const seconds =
    Number(w ?? 0) * 604800 +
    Number(d ?? 0) * 86400 +
    Number(h ?? 0) * 3600 +
    Number(min ?? 0) * 60 +
    Math.round(Number(s ?? 0));
  return seconds > 0 ? seconds : null;
}
