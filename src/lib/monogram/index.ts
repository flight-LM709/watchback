/**
 * Monogram sticker avatar maths, exactly as design/SPEC.md §8.
 * Takeout has no channel avatars, so every creator avatar is a monogram.
 */

/** 1–2 character initials (SPEC §8 "Initials"). */
export function initials(name: string): string {
  const words = name
    .normalize("NFKC")
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+/u, ""))
    .filter(Boolean);
  if (!words.length) return "?";
  const first = [...words[0]][0];
  if (!/[\p{Script=Latin}\p{N}]/u.test(first)) return first;
  const raw = words.length > 1 ? first + [...words[1]][0] : [...words[0]].filter((c) => /[\p{L}\p{N}]/u.test(c)).slice(0, 2).join("");
  return raw.toLocaleUpperCase("en");
}

/** FNV-1a 32-bit over the code points of the normalized, lowercased name. */
export function monogramHash(name: string): number {
  const key = name.normalize("NFKC").trim().toLowerCase();
  let h = 0x811c9dc5;
  for (const ch of key) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Palette from SPEC §8: background + initials colour, all ≥4.5:1 and none on the do-not-use list. */
export const MONOGRAM_PALETTE = [
  { name: "teal", bg: "#1E6B66", fg: "#FBF6EC" },
  { name: "tomato", bg: "#B33A24", fg: "#FBF6EC" },
  { name: "mustard", bg: "#E2A72E", fg: "#1F1B16" },
  { name: "teal-dark", bg: "#123F3C", fg: "#FBF6EC" },
  { name: "paper-dark", bg: "#EDE3CF", fg: "#1F1B16" },
] as const;

export interface Monogram {
  initials: string;
  paletteIndex: number;
  bg: string;
  fg: string;
  /** −5…+5 degrees. */
  tilt: number;
}

export function monogram(name: string): Monogram {
  const h = monogramHash(name);
  const paletteIndex = h % MONOGRAM_PALETTE.length;
  const { bg, fg } = MONOGRAM_PALETTE[paletteIndex];
  return { initials: initials(name), paletteIndex, bg, fg, tilt: ((h >>> 8) % 11) - 5 };
}
