// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { en } from "@/copy/en";
import { fill } from "@/copy/format";
import { HERO_MAX_WIDTH, HERO_MIN_PX, HeroNumber, compactNumber, fitCounter, fitHero, heroWidth } from "..";

afterEach(cleanup);

describe("hero number fit (≥ 96px, abbreviate when it won't fit at 360px)", () => {
  it("compact format", () => {
    expect(compactNumber(12412)).toBe("12.4K");
    expect(compactNumber(123456)).toBe("123K");
    expect(compactNumber(1234567)).toBe("1.23M");
  });

  it("keeps exact figures that fit, at the requested size", () => {
    expect(fitHero(206, { size: 120 })).toEqual({ px: 120, text: "206", exact: "206", abbreviated: false });
    expect(fitHero(1234, { size: 100, maxWidth: 308 })).toMatchObject({ px: 100, text: "1,234", abbreviated: false });
  });

  it("steps down to the 96px floor before abbreviating, never below it", () => {
    // "1,234" at 120px ≈ 322px > 312, but ≈ 258px at 96px
    expect(fitHero(1234, { size: 120 })).toMatchObject({ px: HERO_MIN_PX, text: "1,234", abbreviated: false });
    expect(fitHero(5, { size: 40 }).px).toBe(HERO_MIN_PX);
  });

  it("abbreviates when even 96px doesn't fit", () => {
    const f = fitHero(12412, { size: 100, maxWidth: 308 });
    expect(f).toEqual({ px: 100, text: "12.4K", exact: "12,412", abbreviated: true });
    expect(heroWidth(f.text, f.px)).toBeLessThanOrEqual(308);
    expect(fitHero(1234567).text).toBe("1.23M");
    for (const n of [9, 99, 999, 9999, 99999, 999999, 12345678]) {
      const r = fitHero(n, { size: 120 });
      expect(r.px).toBeGreaterThanOrEqual(HERO_MIN_PX);
      expect(heroWidth(r.text, r.px)).toBeLessThanOrEqual(HERO_MAX_WIDTH);
    }
  });

  it("watch-time counter: at most 4 digit boxes, then 12.4K", () => {
    expect(fitCounter(1920)).toEqual({ text: "1,920", exact: "1,920", abbreviated: false });
    expect(fitCounter(9999).abbreviated).toBe(false);
    expect(fitCounter(12412)).toEqual({ text: "12.4K", exact: "12,412", abbreviated: true });
  });

  it("HeroNumber shows the 'Exactly {n}' caption only when abbreviated; screen readers get the exact value", () => {
    const { container, rerender } = render(<HeroNumber value={12412} size={100} maxWidth={308} animate={false} />);
    const hero = container.querySelector<HTMLElement>("[data-hero-px]")!;
    expect(hero.dataset.heroPx).toBe("100");
    expect(hero.dataset.abbreviated).toBe("true");
    expect(hero.querySelector(".sr-only")!.textContent).toBe("12,412");
    expect(hero.textContent).toContain("12.4K");
    expect(container.querySelector('[data-testid="exact-caption"]')!.textContent).toBe(fill(en.numbers.exactCaption, { n: "12,412" }));

    rerender(<HeroNumber value={412} size={100} maxWidth={308} animate={false} />);
    expect(container.querySelector('[data-testid="exact-caption"]')).toBeNull();
    expect(container.querySelector<HTMLElement>("[data-hero-px]")!.dataset.abbreviated).toBeUndefined();
  });
});
