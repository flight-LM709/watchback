import { describe, expect, it } from "vitest";
import { parseJsonHistory } from "../parseJson";
import { learnAffix } from "../normalize";
import { fixture } from "./helpers";

describe("parseJsonHistory (English)", () => {
  const { events, diagnostics } = parseJsonHistory(fixture("watch-history.en.json"), { role: "watch" });
  const byTitle = (t: string) => events.filter((e) => e.title === t);

  it("normalizes a regular watch", () => {
    const [e] = byTitle("Cooking pasta");
    expect(e).toMatchObject({
      kind: "watch", product: "youtube", videoId: "BBBBBBBBBB2", channelName: "Chef Ana",
      channelUrl: "https://www.youtube.com/channel/UCchef", isAd: false,
    });
    expect(e.timestamp.toISOString()).toBe("2024-03-02T10:00:00.000Z");
  });

  it("YouTube Music entries -> product music, keeps Topic channel", () => {
    const songs = byTitle("Bohemian Rhapsody");
    expect(songs).toHaveLength(2);
    expect(songs[0]).toMatchObject({ product: "music", videoId: "MUSIC000001", channelName: "Queen - Topic" });
  });

  it("flags ads but keeps them", () => {
    const [ad] = byTitle("Buy our stuff!");
    expect(ad.isAd).toBe(true);
    expect(diagnostics.adEvents).toBe(1);
  });

  it("removed + private videos are unavailable watches", () => {
    const removed = events.find((e) => !e.videoId && e.kind === "watch")!;
    expect(removed.unavailable).toBe(true);
    const priv = events.find((e) => e.videoId === "PRIVATE0001")!;
    expect(priv.unavailable).toBe(true);
    expect(diagnostics.unavailableEvents).toBe(2);
  });

  it("Shorts URLs give a video id + isShort", () => {
    const s = events.find((e) => e.videoId === "SHORTS00001")!;
    expect(s.isShort).toBe(true);
    expect(s.title).toBe("Funny short #shorts");
  });

  it("missing channel is fine", () => {
    const [e] = byTitle("No channel video");
    expect(e.channelName).toBeUndefined();
    expect(e.videoId).toBe("CCCCCCCCCC3");
  });

  it("drops 'Visited YouTube Music' and counts it", () => {
    expect(events.some((e) => /visited/i.test(e.title))).toBe(false);
    expect(diagnostics.visitEntries).toBe(1);
    expect(diagnostics.totalEntries).toBe(13);
    expect(diagnostics.watchEvents).toBe(12);
  });
});

describe("parseJsonHistory (search)", () => {
  it("extracts queries from the URL (handles + and %xx)", () => {
    const { events } = parseJsonHistory(fixture("search-history.en.json"), { role: "search" });
    expect(events.map((e) => e.title)).toEqual(["lofi beats", "Lofi Beats", "resep nasi goreng", "c++ & rust"]);
    expect(events.every((e) => e.kind === "search")).toBe(true);
  });
});

describe("parseJsonHistory (Indonesian)", () => {
  const { events, diagnostics } = parseJsonHistory(fixture("watch-history.id.json"), { role: "watch" });

  it("strips 'Menonton'", () => {
    expect(events.filter((e) => e.title === "Belajar TypeScript")).toHaveLength(2);
    expect(events.find((e) => e.videoId === "IDMUSIC0001")).toMatchObject({ product: "music", title: "Separuh Aku" });
  });
  it("'Dari Google Ads' is an ad", () => {
    expect(events.find((e) => e.videoId === "IDADVERT001")!.isAd).toBe(true);
  });
  it("'video yang telah dihapus' is a removed watch", () => {
    expect(events.find((e) => e.kind === "watch" && !e.videoId)!.unavailable).toBe(true);
  });
  it("'Mengunjungi' is a visit; 'Menelusuri' is a search", () => {
    expect(diagnostics.visitEntries).toBe(1);
    expect(events.find((e) => e.kind === "search")!.title).toBe("kucing lucu");
  });
});

const WORDS = ["cats", "Lo-fi mix", "How to", "Review:", "Minecraft", "Resep", "Top 10", "Podcast"];

describe("unknown locales", () => {
  it("learns an unknown verb prefix from the file", () => {
    const entries = Array.from({ length: 30 }, (_, i) => ({
      header: "YouTube",
      title: `Katsottu ${WORDS[i % WORDS.length]} video ${i}`,
      titleUrl: `https://www.youtube.com/watch?v=${String(i).padStart(11, "x")}`,
      time: `2024-01-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    const { events } = parseJsonHistory(entries, { role: "watch" });
    expect(events[0].title).toBe("cats video 0");
  });
  it("learns suffix-style verbs", () => {
    const titles = Array.from({ length: 30 }, (_, i) => `${WORDS[i % WORDS.length]} ${i} を視聴しました`);
    expect(learnAffix(titles)).toEqual({ suffix: "を視聴しました" });
  });
  it("doesn't learn from too few samples", () => {
    expect(learnAffix(["Foo Bar", "Foo Baz"])).toBeNull();
  });
});
