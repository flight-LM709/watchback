import type { Metadata } from "next";
import { BadgesDemo } from "./badges-demo";

export const metadata: Metadata = { title: "Watchback: badge stickers" };

/**
 * All six peak-hour badge stickers in the prime-time row, inside a 360px-wide frame with the
 * slide's 24px padding (the narrowest supported screen). Used for the two-line fit check
 * (/workspace/shot-tools/badges.mjs).
 */
export default function BadgesPage() {
  return (
    <main className="paper min-h-dvh bg-paper-dark py-4">
      <div className="mx-auto flex w-[360px] flex-col gap-6 bg-paper px-6 py-6" data-testid="badge-frame">
        <BadgesDemo />
      </div>
    </main>
  );
}
