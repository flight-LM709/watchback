"use client";

import { PrimeTimeTiles } from "@/components/watchback/slides";
import { PEAK_HOUR_WINDOWS } from "@/lib/takeout/stats";

/** All six badges in the prime-time row. Widest peak value ("Wed 12 AM") so the peak tile is checked too. */
export function BadgesDemo() {
  return (
    <>
      {PEAK_HOUR_WINDOWS.map((w, i) => (
        <PrimeTimeTiles key={w.badge} peak={{ day: 3, hour: 0, count: 12 }} badge={{ badge: w.badge, pct: 10 + i * 7, plays: 100 }} />
      ))}
    </>
  );
}
