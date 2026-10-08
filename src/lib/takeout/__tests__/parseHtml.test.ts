import { describe, expect, it } from "vitest";
import { parseHtmlHistory } from "../parseHtml";
import { fixture } from "./helpers";

const opts = { fallbackTimeZone: "Asia/Jakarta" };

describe("parseHtmlHistory (English)", () => {
  const { events, diagnostics } = parseHtmlHistory(fixture("watch-history.en.html"), { role: "watch", ...opts });

  it("parses title (entities decoded), channel and date", () => {
    const e = events.find((x) => x.videoId === "AAAAAAAAAA1")!;
    expect(e).toMatchObject({ kind: "watch", product: "youtube", title: "Cat compilation & friends", channelName: "Cat Channel" });
    expect(e.timestamp.toISOString()).toBe("2024-03-10T12:00:00.000Z");
  });
  it("music, ads, removed, shorts, no channel", () => {
    expect(events.find((x) => x.videoId === "MUSIC000001")!.product).toBe("music");
    expect(events.find((x) => x.videoId === "ADADADADAD1")!.isAd).toBe(true);
    expect(events.find((x) => x.kind === "watch" && !x.videoId)!.unavailable).toBe(true);
    expect(events.find((x) => x.videoId === "SHORTS00001")!.isShort).toBe(true);
    expect(events.find((x) => x.videoId === "CCCCCCCCCC3")!.channelName).toBeUndefined();
  });
  it("handles PST and GMT+07:00 dates", () => {
    expect(events.find((x) => x.videoId === "SHORTS00001")!.timestamp.toISOString()).toBe("2024-03-04T08:00:00.000Z");
    expect(events.find((x) => x.videoId === "CCCCCCCCCC3")!.timestamp.toISOString()).toBe("2024-03-01T03:00:00.000Z");
    expect(events.find((x) => x.videoId === "DDDDDDDDDD4")!.timestamp.toISOString()).toBe("2024-01-05T15:30:00.000Z");
  });
  it("counts", () => {
    expect(diagnostics.totalEntries).toBe(8);
    expect(diagnostics.visitEntries).toBe(1);
    expect(diagnostics.watchEvents).toBe(7);
    expect(diagnostics.unparsedDates).toBe(0);
  });
});

describe("parseHtmlHistory (search)", () => {
  it("uses the link text as the query", () => {
    const { events } = parseHtmlHistory(fixture("search-history.en.html"), { role: "search", ...opts });
    expect(events.map((e) => [e.kind, e.title])).toEqual([["search", "lofi beats"], ["search", "lofi beats"]]);
  });
});

describe("search query comes from the URL, not the link text", () => {
  it("handles exports where the verb is split differently ('Searched <a>for lofi beats</a>')", () => {
    const html = fixture("search-history.en.html").replaceAll("Searched for&nbsp;<a href=\"https://www.youtube.com/results?search_query=lofi+beats\">lofi beats</a>", "Searched&nbsp;<a href=\"https://www.youtube.com/results?search_query=lofi+beats\">for lofi beats</a>");
    expect(html).toContain(">for lofi beats<");
    const { events } = parseHtmlHistory(html, { role: "search", ...opts });
    expect(events.map((e) => e.title)).toEqual(["lofi beats", "lofi beats"]);
  });
});

describe("parseHtmlHistory (Indonesian)", () => {
  const { events, diagnostics } = parseHtmlHistory(fixture("histori-tontonan.id.html"), { role: "watch", ...opts });
  it("parses Indonesian dates (Agu, Agustus+pukul, Mei/WITA, Okt, Des)", () => {
    const ts = events.map((e) => e.timestamp.toISOString());
    expect(ts).toEqual([
      "2024-08-12T14:00:00.000Z",
      "2024-08-11T14:00:00.000Z",
      "2024-05-03T00:15:00.000Z",
      "2024-10-09T07:00:00.000Z",
      "2024-12-08T16:59:59.000Z",
    ]);
    expect(diagnostics.unparsedDates).toBe(0);
  });
  it("classifies Indonesian entries", () => {
    expect(events[0]).toMatchObject({ title: "Belajar TypeScript", channelName: "Kelas Koding" });
    expect(events[2].product).toBe("music");
    expect(events[3].isAd).toBe(true);
    expect(events[4].unavailable).toBe(true);
    expect(diagnostics.visitEntries).toBe(1);
  });
  it("reports unparseable dates instead of crashing", () => {
    const html = fixture("histori-tontonan.id.html").replace("12 Agu 2024, 21.00.00 WIB", "kemarin");
    const r = parseHtmlHistory(html, { role: "watch", ...opts });
    expect(r.diagnostics.unparsedDates).toBe(1);
    expect(r.diagnostics.unparsedDateSamples).toEqual(["kemarin"]);
  });
});
