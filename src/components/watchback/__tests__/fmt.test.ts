import { describe, expect, it } from "vitest";
import { hourLabel, songDisplayTitle } from "../fmt";

describe("hourLabel", () => {
  it("uses U+00A0 before AM/PM (never U+202F or a breakable space)", () => {
    expect(hourLabel(18)).toBe("6\u00a0PM");
    expect(hourLabel(0)).toBe("12\u00a0AM");
    expect(hourLabel(12)).toBe("12\u00a0PM");
    expect(hourLabel(22)).toBe("10\u00a0PM");
    for (let h = 0; h < 24; h++) {
      const label = hourLabel(h);
      expect(label).toMatch(/^\d{1,2}\u00a0[AP]M$/);
      expect(label).not.toMatch(/[\u202f\u2009 ]/);
    }
  });
});

describe("songDisplayTitle (strip a leading '{artist} - ')", () => {
  it("matches the artist after normalize.ts strips ' - Topic'", () => {
    expect(songDisplayTitle("NOAH - Lagu 8", "NOAH - Topic")).toBe("Lagu 8");
    expect(songDisplayTitle("NOAH - Lagu 8", "NOAH – Topic")).toBe("Lagu 8");
    expect(songDisplayTitle("NOAH - Lagu 8", "NOAH")).toBe("Lagu 8");
  });
  it("is case-insensitive", () => {
    expect(songDisplayTitle("noah - Lagu 8", "NOAH - Topic")).toBe("Lagu 8");
    expect(songDisplayTitle("NOAH - Lagu 8", "Noah")).toBe("Lagu 8");
  });
  it("accepts -, – and — with spaces around", () => {
    expect(songDisplayTitle("NOAH - Lagu 8", "NOAH")).toBe("Lagu 8");
    expect(songDisplayTitle("NOAH – Lagu 8", "NOAH")).toBe("Lagu 8");
    expect(songDisplayTitle("NOAH — Lagu 8", "NOAH")).toBe("Lagu 8");
    expect(songDisplayTitle("  NOAH  —  Lagu 8  ", "NOAH")).toBe("Lagu 8");
  });
  it("needs the spaces and the exact artist", () => {
    expect(songDisplayTitle("NOAH-Lagu 8", "NOAH")).toBe("NOAH-Lagu 8");
    expect(songDisplayTitle("NOAH –Lagu 8", "NOAH")).toBe("NOAH –Lagu 8");
    expect(songDisplayTitle("NOAHX - Lagu 8", "NOAH")).toBe("NOAHX - Lagu 8");
    expect(songDisplayTitle("Lagu 8 - NOAH", "NOAH")).toBe("Lagu 8 - NOAH");
    expect(songDisplayTitle("NOAH: Lagu 8", "NOAH")).toBe("NOAH: Lagu 8");
  });
  it("keeps the original title when nothing would remain", () => {
    expect(songDisplayTitle("NOAH", "NOAH - Topic")).toBe("NOAH");
    expect(songDisplayTitle("NOAH - ", "NOAH")).toBe("NOAH - ");
    expect(songDisplayTitle("NOAH —  ", "NOAH")).toBe("NOAH —  ");
  });
  it("no artist, or regex characters in the artist", () => {
    expect(songDisplayTitle("NOAH - Lagu 8", undefined)).toBe("NOAH - Lagu 8");
    expect(songDisplayTitle("NOAH - Lagu 8", "")).toBe("NOAH - Lagu 8");
    expect(songDisplayTitle("AC/DC (Live) - Thunderstruck", "AC/DC (Live) - Topic")).toBe("Thunderstruck");
    expect(songDisplayTitle("A.B - Song", "AxB")).toBe("A.B - Song");
  });
});
