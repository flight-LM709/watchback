/**
 * Deterministic synthetic history for /demo (no real user data). 2023 has no YouTube
 * Music plays, so switching the period to 2023 shows the music slides dropping out.
 */
import type { TakeoutEvent } from "@/lib/takeout/types";
import { mulberry32 } from "@/lib/takeout/watchTime";

const CREATORS = [
  { name: "Kelas Koding", url: "https://www.youtube.com/channel/UCdemo1" },
  { name: "The Extraordinarily Long Channel Name That Must Clamp To A Single Line Official", url: "https://www.youtube.com/channel/UCdemo2" },
  { name: "Chef Ana", url: "https://www.youtube.com/channel/UCdemo3" },
  { name: "Night Owl TV", url: "https://www.youtube.com/channel/UCdemo4" },
  { name: "Cat Channel", url: "https://www.youtube.com/channel/UCdemo5" },
  { name: "Sejarah Singkat", url: "https://www.youtube.com/channel/UCdemo6" },
];
const TITLES = [
  "Belajar TypeScript dari Nol sampai Mahir dalam Satu Video Panjang Lengkap dengan Studi Kasus Nyata dan Latihan",
  "Nasi goreng 5 menit",
  "Why do cats knock things off tables? A surprisingly deep investigation",
  "Lo-fi beats to study to",
  "Sejarah Majapahit",
];
const ARTISTS = ["NOAH", "Tulus", "Raisa", "Hindia"];

function vid(n: number): string {
  return ("d" + n.toString(36)).padEnd(11, "_").slice(0, 11);
}

export function makeDemoEvents(): TakeoutEvent[] {
  const rand = mulberry32(2024);
  const events: TakeoutEvent[] = [];
  const start = Date.UTC(2023, 0, 1);
  const end = Date.UTC(2024, 10, 30);
  for (let t = start; t < end; t += 3600_000 * (2 + rand() * 20)) {
    const ts = new Date(t);
    const isMusic = ts.getUTCFullYear() === 2024 && rand() < 0.3;
    if (isMusic) {
      const a = Math.floor(rand() * rand() * ARTISTS.length);
      const n = Math.floor(rand() * 12);
      events.push({
        kind: "watch", product: "music", videoId: vid(1000 + a * 20 + n), title: `${ARTISTS[a]} – Lagu ${n + 1}`,
        channelName: `${ARTISTS[a]} - Topic`, timestamp: ts, isAd: false,
      });
    } else {
      const c = Math.floor(rand() * rand() * CREATORS.length);
      const v = Math.floor(rand() * rand() * 400);
      events.push({
        kind: "watch", product: "youtube", videoId: vid(v), title: v === 0 ? TITLES[0] : `${TITLES[v % TITLES.length]} #${v}`,
        channelName: CREATORS[c].name, channelUrl: CREATORS[c].url, timestamp: ts, isAd: rand() < 0.02,
      });
    }
  }
  return events;
}

/** Fake /api/durations response: a stable pseudo-random duration per ID. */
export function fakeDurations(ids: string[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const id of ids) {
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    out[id] = h % 23 === 0 ? null : 60 + (h % 1500);
  }
  return out;
}
