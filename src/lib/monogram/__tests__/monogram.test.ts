import { describe, expect, it } from "vitest";
import { MONOGRAM_PALETTE, initials, monogram, monogramHash } from "..";

// WCAG 2.x contrast, to double-check the palette against SPEC §8.
function lum(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe("initials (SPEC §8 examples)", () => {
  it.each([
    ["Creator Name A", "CN"],
    ["★ Example Gaming Channel", "EG"],
    ["Exampletube", "EX"],
    ["見本チャンネル", "見"],
    ["Tom & Jerry", "TJ"],
    ["3Blue1Brown", "3B"],
    ["Пример Канал", "П"],
  ])("%s → %s", (name, want) => expect(initials(name)).toBe(want));

  it("edge cases", () => {
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
    expect(initials("🎮🎮")).toBe("?");
    expect(initials("Emoji Corner 🎮")).toBe("EC");
    expect(initials("🎮 gaming")).toBe("GA");
    expect(initials("  kelas   koding ")).toBe("KK");
    expect(initials("x")).toBe("X");
    expect(initials("Ｗｉｄｅ Ｔｅｘｔ")).toBe("WT"); // NFKC folds full-width Latin
    expect(initials("Élodie Ünal")).toBe("ÉÜ");
    expect(initials("ภาษาไทย ช่อง")).toBe("ภ");
    expect(initials("#hashtag channel")).toBe("HC");
  });
});

describe("monogram hash → palette + tilt", () => {
  it("is FNV-1a 32-bit over the normalized, lowercased name", () => {
    expect(monogramHash("")).toBe(0x811c9dc5);
    expect(monogramHash("a")).toBe(0xe40c292c); // published FNV-1a test vector
    expect(monogramHash("foobar")).toBe(0xbf9cf968);
    expect(monogramHash("  FooBar ")).toBe(monogramHash("foobar"));
  });

  it("is deterministic, in range, and spreads over all five colours", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const m = monogram(`Creator ${i}`);
      expect(m).toEqual(monogram(`Creator ${i}`));
      expect(m.paletteIndex).toBe(monogramHash(`Creator ${i}`) % 5);
      expect(m.tilt).toBeGreaterThanOrEqual(-5);
      expect(m.tilt).toBeLessThanOrEqual(5);
      expect(m.tilt).toBe(((monogramHash(`Creator ${i}`) >>> 8) % 11) - 5);
      seen.add(m.paletteIndex);
    }
    expect(seen.size).toBe(5);
  });

  it("palette matches SPEC (paper on teal/tomato/teal-dark, ink on mustard/paper-dark), all ≥ 4.5:1", () => {
    expect(MONOGRAM_PALETTE.map((p) => [p.bg, p.fg])).toEqual([
      ["#1E6B66", "#FBF6EC"],
      ["#B33A24", "#FBF6EC"],
      ["#E2A72E", "#1F1B16"],
      ["#123F3C", "#FBF6EC"],
      ["#EDE3CF", "#1F1B16"],
    ]);
    for (const p of MONOGRAM_PALETTE) expect(contrast(p.bg, p.fg)).toBeGreaterThanOrEqual(4.5);
  });
});
