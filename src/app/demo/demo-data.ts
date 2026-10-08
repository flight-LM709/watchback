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
  { name: "★ Example Gaming Channel", url: "https://www.youtube.com/channel/UCdemo7" },
  { name: "見本チャンネル", url: "https://www.youtube.com/channel/UCdemo8" },
];
const SEARCHES = ["lofi beats", "nasi goreng recipe", "how to fold a fitted sheet", "typescript generics explained simply for beginners", "kucing lucu", "sejarah majapahit"];
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
      if (rand() < 0.08) {
        const q = SEARCHES[Math.floor(rand() * rand() * SEARCHES.length)];
        events.push({ kind: "search", product: "youtube", title: q, timestamp: new Date(t - 60_000), isAd: false });
      }
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

/**
 * Fake `isShort` sibling map, consistent with fakeDurations() and the agreed rule (≤ 3 min and
 * vertical): null where the duration is null (private/deleted), true for ~3 in 4 of the ≤180s IDs
 * (the rest are short horizontal clips), false otherwise.
 */
export function fakeIsShort(ids: string[]): Record<string, boolean | null> {
  const durations = fakeDurations(ids);
  const out: Record<string, boolean | null> = {};
  for (const id of ids) {
    const d = durations[id];
    let h = 7;
    for (const ch of id) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
    out[id] = d === null ? null : d <= 180 && h % 4 !== 0;
  }
  return out;
}

/**
 * Demo thumbnail: a generated abstract 16:9 image (no YouTube content, no network), returned as a
 * same-origin blob: URL like the real /api/thumb client. Resolves null where OffscreenCanvas is missing.
 */
export async function demoThumbnail(videoId: string): Promise<string | null> {
  if (typeof OffscreenCanvas === "undefined") return null;
  const c = new OffscreenCanvas(640, 360);
  const g = c.getContext("2d");
  if (!g) return null;
  const sky = g.createLinearGradient(0, 0, 0, 360);
  sky.addColorStop(0, "#3b2a4e");
  sky.addColorStop(0.55, "#d9733a");
  sky.addColorStop(1, "#e2a72e");
  g.fillStyle = sky;
  g.fillRect(0, 0, 640, 360);
  const rand = mulberry32([...videoId].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7) >>> 0);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(255, 240, 220, ${0.08 + rand() * 0.18})`;
    g.beginPath();
    g.arc(rand() * 640, rand() * 200, 6 + rand() * 18, 0, Math.PI * 2);
    g.fill();
  }
  for (const [y, col] of [[250, "#4a3550"], [290, "#2e2340"], [325, "#1f1830"]] as const) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, 360);
    for (let x = 0; x <= 640; x += 40) g.lineTo(x, y - 30 * Math.sin(x / 90 + y) - rand() * 12);
    g.lineTo(640, 360);
    g.fill();
  }
  const blob = await c.convertToBlob({ type: "image/png" });
  return URL.createObjectURL(blob);
}
