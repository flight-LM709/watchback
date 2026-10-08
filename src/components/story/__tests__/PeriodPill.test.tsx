// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { formatPeriodLabel } from "../format";
import { PeriodPill } from "../PeriodPill";
import { StoryPlayer } from "../StoryPlayer";
import { useStoryStats } from "../hooks";
import type { TakeoutEvent } from "@/lib/takeout/types";

afterEach(cleanup);

const JKT = "Asia/Jakarta";

describe("formatPeriodLabel", () => {
  const resolved = { start: new Date("2023-03-31T17:00:00Z"), end: new Date("2024-03-10T12:00:00.001Z") };
  it("formats the three kinds", () => {
    expect(formatPeriodLabel({ type: "last12Months" }, resolved, JKT)).toBe("Apr 2023 – Mar 2024");
    expect(formatPeriodLabel({ type: "calendarYear", year: 2024 }, resolved, JKT)).toBe("2024");
    expect(formatPeriodLabel({ type: "allTime" }, resolved, JKT)).toBe("All time");
  });
  it("uses the injected timezone for month boundaries", () => {
    // 2023-03-31T17:00Z is April in Jakarta but March in UTC
    expect(formatPeriodLabel({ type: "last12Months" }, resolved, "UTC")).toBe("Mar 2023 – Mar 2024");
  });
});

describe("PeriodPill", () => {
  const resolved = { start: new Date("2023-03-31T17:00:00Z"), end: new Date("2024-03-10T12:00:00Z") };
  it("opens a picker with last-12-months / years / all time and reports the choice", () => {
    const onChange = vi.fn();
    const onOpenChange = vi.fn();
    render(<PeriodPill range={{ type: "last12Months" }} resolved={resolved} years={[2024, 2023]} timeZone={JKT} onChange={onChange} onOpenChange={onOpenChange} />);
    const btn = screen.getByRole("button", { name: /Apr 2023 – Mar 2024/ });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    const opts = screen.getAllByRole("option").map((o) => o.textContent);
    expect(opts).toEqual(["Last 12 months", "2024", "2023", "All time"]);
    expect(screen.getByRole("option", { name: "Last 12 months" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("option", { name: "2023" }));
    expect(onChange).toHaveBeenCalledWith({ type: "calendarYear", year: 2023 });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});

describe("period change re-runs stats without restarting the story", () => {
  const ev = (iso: string, product: "youtube" | "music" = "youtube"): TakeoutEvent => ({
    kind: "watch", product, title: "t", videoId: "VVVVVVVVVVV", channelName: "C", timestamp: new Date(iso), isAd: false,
  });
  const events = [ev("2023-05-01T05:00:00Z"), ev("2024-02-01T05:00:00Z"), ev("2024-03-01T05:00:00Z"), ev("2024-03-02T05:00:00Z", "music")];

  function Harness() {
    const { stats, range, setRange, years, timeZone } = useStoryStats(events, { timeZone: JKT });
    const [open, setOpen] = useState(false);
    const s = [
      { id: "a", content: <p>A: {stats.totalVideos} videos</p> },
      { id: "b", content: <p>B: {stats.totalVideos} videos</p> },
      ...(stats.totalSongs > 0 ? [{ id: "music", content: <p>Music</p> }] : []),
    ];
    return (
      <StoryPlayer
        slides={s}
        paused={open}
        header={<PeriodPill range={range} resolved={stats.range} years={years} timeZone={timeZone} onChange={setRange} onOpenChange={setOpen} />}
      />
    );
  }

  it("keeps the slide position and updates the numbers", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowRight" });
    expect(screen.getByText("B: 3 videos")).toBeTruthy();
    expect(screen.getByText("Slide 2 of 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Apr 2023 – Mar 2024/ }));
    expect(screen.getByRole("region").dataset.paused).toBe("true"); // paused while picking
    fireEvent.click(screen.getByRole("option", { name: "2023" }));
    expect(screen.getByText("B: 1 videos")).toBeTruthy(); // same slide, new stats
    expect(screen.getByText("Slide 2 of 2")).toBeTruthy(); // music slide dropped (no Music in 2023)
    expect(screen.getByRole("button", { name: /2023/ })).toBeTruthy();
  });
});
