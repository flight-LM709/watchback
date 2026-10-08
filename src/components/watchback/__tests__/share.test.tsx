// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "@/copy/en";
import { fill } from "@/copy/format";
import { computeStats } from "@/lib/takeout/stats";
import { makeDemoEvents } from "@/app/demo/demo-data";
import { contrastViolations } from "@/test-utils/contrast";
import { CARD_PAPER, EXPORT_PIXEL_RATIO, GRAIN_TILE_URL, SHARE_SIZES, ShareSlide, exportFilter, renderCardPng } from "../share";
import { readFileSync } from "node:fs";

afterEach(cleanup);
const stats = computeStats(makeDemoEvents(), { timeZone: "Asia/Jakarta" });
const wt = { seconds: 1920 * 3600, isEstimate: true as const, coverage: 1, exactSeconds: 0 };

describe("share images", () => {
  it("layouts are 360×640 and 360×360 CSS px, exported at pixelRatio 3 (1080×1920 / 1080×1080)", async () => {
    expect(SHARE_SIZES).toEqual({ story: { width: 360, height: 640 }, square: { width: 360, height: 360 } });
    expect(EXPORT_PIXEL_RATIO).toBe(3);
    const toPng = vi.fn(async () => "data:image/png;base64,x");
    const node = document.createElement("div");
    await renderCardPng(node, "story", toPng);
    expect(toPng).toHaveBeenCalledWith(node, expect.objectContaining({ width: 360, height: 640, pixelRatio: 3, filter: exportFilter }));
    await renderCardPng(node, "square", toPng);
    expect(toPng).toHaveBeenLastCalledWith(node, expect.objectContaining({ width: 360, height: 360, pixelRatio: 3 }));
  });

  it("uses en.ts shareCard labels and the appName stamp", () => {
    render(<ShareSlide stats={stats} watchTime={wt} period="last12" periodLabel="Dec 2023 – Nov 2024" host="watchback.test" />);
    const card = document.querySelector('[data-share-card="story"]')!;
    for (const label of [en.shareCard.videos, en.shareCard.watchTime, en.shareCard.topCreators, en.shareCard.topSong, en.shareCard.hours]) {
      expect(card.textContent).toContain(label);
    }
    expect(card.textContent).toContain(en.disclaimer);
    expect(card.querySelector('[data-testid="share-stamp"]')!.textContent).toBe(en.appName);
    const square = document.querySelector('[data-share-card="square"]')!;
    expect(square.textContent).toContain(en.shareCard.topCreator);
    expect(contrastViolations(card)).toEqual([]);
    expect(contrastViolations(square)).toEqual([]);
  });

  it("exports the right node per button; the watch-time-unavailable tooltip never ends up in the image", async () => {
    const renderPng = vi.fn(async () => "data:image/png;base64,x");
    const download = vi.fn();
    const busy = vi.fn();
    render(<ShareSlide stats={stats} watchTime={null} period="last12" periodLabel="p" host="" render={renderPng} download={download} onExportingChange={busy} />);
    // fallback tile: peak hour + ⓘ (app UI only) that opens the tooltip
    const info = screen.getByRole("button", { name: en.slides.watchTime.unavailableTooltip });
    fireEvent.click(info);
    const tooltip = screen.getByTestId("unavailable-tooltip");
    expect(tooltip.textContent).toContain(en.slides.watchTime.unavailableTooltip);

    fireEvent.click(screen.getByRole("button", { name: en.slides.share.saveStory }));
    await waitFor(() => expect(download).toHaveBeenCalledWith("data:image/png;base64,x", "watchback-story.png"));
    const [node, variant] = renderPng.mock.calls[0] as unknown as [HTMLElement, string];
    expect(variant).toBe("story");
    expect(node.dataset.shareCard).toBe("story");
    expect(node.contains(tooltip)).toBe(false); // tooltip is outside the exported node
    expect(node.contains(info)).toBe(true);
    expect(exportFilter(info)).toBe(false); // ...and the ⓘ button is filtered out of the clone
    expect(node.textContent).toContain(en.slides.primeTime.peakLabel);
    expect(busy.mock.calls).toEqual([[true], [false]]);

    fireEvent.click(screen.getByRole("button", { name: en.slides.share.saveSquare }));
    await waitFor(() => expect(download).toHaveBeenLastCalledWith("data:image/png;base64,x", "watchback-square.png"));
    const square = (renderPng.mock.calls[1] as unknown as [HTMLElement])[0];
    expect(square.dataset.shareCard).toBe("square");
    expect(square.querySelector("[data-export-exclude]")).toBeNull();
  });

  it("grain: raster tile on the card root at 128px over paper (no SVG filter, no flat-paper override in the export)", async () => {
    render(<ShareSlide stats={stats} watchTime={wt} period="last12" periodLabel="p" host="www.watchback.test" />);
    for (const variant of ["story", "square"]) {
      const card = document.querySelector<HTMLElement>(`[data-share-card="${variant}"]`)!;
      expect(card.style.backgroundImage).toBe(`url("${GRAIN_TILE_URL}")`);
      expect(card.style.backgroundSize).toBe("128px");
      expect(card.style.backgroundColor).toBe("rgb(243, 235, 221)"); // paper #F3EBDD
      expect(card.outerHTML).not.toContain("feTurbulence");
    }
    expect(CARD_PAPER).toBe("#F3EBDD");
    const toPng = vi.fn(async () => "data:,");
    await renderCardPng(document.createElement("div"), "story", toPng);
    const opts = (toPng.mock.calls[0] as unknown as [HTMLElement, { style: Record<string, string>; backgroundColor: string }])[1];
    expect(opts.style.backgroundImage).toBeUndefined();
    expect(opts.backgroundColor).toBe(CARD_PAPER);
    // public copy is byte-identical to Designer's asset
    expect(readFileSync("public/grain-tile.png").equals(readFileSync("design/assets/grain-tile.png"))).toBe(true);
  });

  it("footer: shareCard.site from the host without www., plus shareCard.sources; peak tile = label / 'Sun 5 AM' / count", () => {
    const patched = { ...stats, peak: { day: 0, hour: 5, count: 12 } };
    render(<ShareSlide stats={patched} watchTime={null} period="last12" periodLabel="p" host="www.watchback.test" />);
    const card = document.querySelector<HTMLElement>('[data-share-card="story"]')!;
    expect(card.querySelector('[data-testid="share-site"]')!.textContent).toBe("watchback.test");
    expect(card.querySelector('[data-testid="share-sources"]')!.textContent).toBe(en.shareCard.sources);
    expect(card.textContent).toContain(en.slides.primeTime.peakLabel);
    expect(card.textContent).toContain("Sun 5 AM");
    expect(card.textContent).toContain(fill(en.slides.topCreators.item, { n: 12 }));
    expect(card.textContent).not.toMatch(/Sundays/);
  });
});
