/**
 * Static check of Paper Mixtape's "do not use for text" pairs (design/tokens.css) on rendered DOM:
 * for every element that directly holds text, find its nearest text-colour and background classes.
 */
const TEXT = /(?:^|\s)text-(ink-2|ink|tomato|paper-2|paper|teal|mustard|white)(?=\s|$)/;
const BG = /(?:^|\s)bg-(paper-dark|paper-2|paper|grid|mustard|teal-dark|teal|tomato|ink|white)(?=\s|$)/;

function nearest(el: Element | null, re: RegExp): string | undefined {
  for (let n = el; n; n = n.parentElement) {
    const m = (n.getAttribute("class") ?? "").match(re);
    if (m) return m[1];
  }
  return undefined;
}

const BANNED: Array<[text: string, bg: string]> = [
  ["tomato", "mustard"],
  ["ink", "teal"],
  ["ink-2", "teal"],
  ["ink", "teal-dark"],
  ["ink-2", "teal-dark"],
  ["ink", "tomato"],
  ["ink-2", "tomato"],
];

export function contrastViolations(root: Element): string[] {
  const out: string[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, 4 /* SHOW_TEXT */);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.textContent?.trim()) continue;
    const el = t.parentElement;
    if (!el || el.closest(".sr-only")) continue;
    const text = nearest(el, TEXT) ?? "ink";
    const bg = nearest(el, BG) ?? "paper";
    if (text === "mustard") out.push(`mustard text: "${t.textContent.trim()}"`);
    if (BANNED.some(([a, b]) => a === text && b === bg)) out.push(`${text} on ${bg}: "${t.textContent.trim()}"`);
  }
  return out;
}
