// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { TakeoutEvent } from "@/lib/takeout/types";
import { WatchbackStory } from "../WatchbackStory";

afterEach(cleanup);
const at = (i: number) => new Date(Date.UTC(2026, 5, 1 + i, 12));
const yt = (i: number): TakeoutEvent => ({ kind: "watch", product: "youtube", title: `V${i}`, videoId: `vid${i}`.padEnd(11, "_"), channelName: "Chan", channelUrl: "https://www.youtube.com/channel/UCchan", timestamp: at(i), isAd: false });
const music = (i: number): TakeoutEvent => ({ ...yt(i), product: "music", channelName: "Band - Topic" });
const segments = () => screen.getAllByTestId("story-progress").length;
const slide = () => screen.getByRole("region").querySelector('[aria-roledescription="slide"]') as HTMLElement;
const noThumb = async () => null;

describe("WatchbackStory: lookup-failed card", () => {
  it("shows once (no watch time, no 16/17) when the lookup failed and the period has YouTube plays", () => {
    render(<WatchbackStory events={[0, 1, 2, 3].map(yt)} timeZone="UTC" watchTimeFor={() => null} thumbLoader={noThumb} />);
    const without = segments();
    cleanup();
    render(<WatchbackStory events={[0, 1, 2, 3].map(yt)} timeZone="UTC" watchTimeFor={() => null} shortsUnavailable="later" thumbLoader={noThumb} />);
    expect(segments()).toBe(without + 1);
    fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowRight" });
    expect(slide().getAttribute("aria-label")).toMatch(/^Quick scrolls vs\. long watches\. No split this time\. .+Try again later\.$/);
    expect(screen.getByTestId("shorts-unavailable").dataset.when).toBe("later");
  });

  it("no YouTube plays in the period (Music only) → no card, as before", () => {
    render(<WatchbackStory events={[0, 1, 2].map(music)} timeZone="UTC" watchTimeFor={() => null} thumbLoader={noThumb} />);
    const without = segments();
    cleanup();
    render(<WatchbackStory events={[0, 1, 2].map(music)} timeZone="UTC" watchTimeFor={() => null} shortsUnavailable="soon" thumbLoader={noThumb} />);
    expect(segments()).toBe(without);
  });

});
