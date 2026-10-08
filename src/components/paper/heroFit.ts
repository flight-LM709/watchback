/**
 * Hero numbers are never drawn under 96px (vedrico). When the exact figure won't fit the
 * narrowest supported screen (360px wide → 312px of slide content), it's abbreviated ("12.4K")
 * and the slide shows en.numbers.exactCaption ("Exactly 12,412") under it.
 *
 * Widths are estimated from Space Mono's fixed advance (612/1000 em) and the hero tracking, so the
 * decision is deterministic (same on server, in tests and on every device) instead of measured.
 */
export const HERO_MIN_PX = 96;
/** 360px viewport minus the 24px slide padding on each side. */
export const HERO_MAX_WIDTH = 312;
/** Space Mono advance width in em. */
export const MONO_ADVANCE_EM = 0.612;

export const exactNumber = (n: number) => Math.round(n).toLocaleString("en-US");
const COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumSignificantDigits: 3 });
/** 12412 → "12.4K", 123456 → "123K", 1234567 → "1.23M". */
export const compactNumber = (n: number) => COMPACT.format(Math.round(n));

/** Letter-spacing (em) the hero uses for a string of this length. */
export const heroTrackingEm = (text: string) => (text.length >= 7 ? -0.1 : -0.075);

/** Estimated rendered width in px of `text` as a hero at `px`. */
export function heroWidth(text: string, px: number): number {
  return [...text].length * px * (MONO_ADVANCE_EM + heroTrackingEm(text));
}

export interface HeroFit {
  px: number;
  /** What's drawn. */
  text: string;
  /** Exact figure (for the caption and screen readers). */
  exact: string;
  abbreviated: boolean;
}

export function fitHero(value: number, { size = HERO_MIN_PX, maxWidth = HERO_MAX_WIDTH }: { size?: number; maxWidth?: number } = {}): HeroFit {
  const px = Math.max(HERO_MIN_PX, size);
  const exact = exactNumber(value);
  if (heroWidth(exact, px) <= maxWidth) return { px, text: exact, exact, abbreviated: false };
  // Too wide at the requested size: first try the 96px floor, then abbreviate.
  if (px > HERO_MIN_PX && heroWidth(exact, HERO_MIN_PX) <= maxWidth) return { px: HERO_MIN_PX, text: exact, exact, abbreviated: false };
  const text = compactNumber(value); // ≤ 5 chars ("12.4K", "1.23M"), which always fits at 96px
  return { px: heroWidth(text, px) <= maxWidth ? px : HERO_MIN_PX, text, exact, abbreviated: true };
}

/**
 * Watch-time tape counter: one 96px digit per box, at most `maxBoxes` boxes fit at 360px.
 * Separators ("," ".") don't take a box.
 */
export const WATCH_COUNTER_MAX_BOXES = 4;
export function fitCounter(value: number, maxBoxes = WATCH_COUNTER_MAX_BOXES): { text: string; exact: string; abbreviated: boolean } {
  const exact = exactNumber(value);
  const boxes = (s: string) => s.replace(/[.,]/g, "").length;
  if (boxes(exact) <= maxBoxes) return { text: exact, exact, abbreviated: false };
  return { text: compactNumber(value), exact, abbreviated: true };
}
