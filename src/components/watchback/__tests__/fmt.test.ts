import { describe, expect, it } from "vitest";
import { hourLabel } from "../fmt";

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
