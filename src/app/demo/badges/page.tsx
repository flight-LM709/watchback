import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgesDemo } from "./badges-demo";

export const metadata: Metadata = { title: "Watchback: badge stickers" };

/**
 * All six peak-hour badge stickers in the prime-time row, inside a 360px-wide frame with the
 * slide's 24px padding (the narrowest supported screen). Used for the two-line fit check
 * (/workspace/shot-tools/badges.mjs).
 *
 * Dev/QA only: a real 404 on Vercel production (local and preview deployments keep it).
 * - Here: evaluated while prerendering, so a production build (Vercel sets VERCEL_ENV at build time)
 *   bakes in a static 404 with a real 404 status.
 * - src/proxy.ts repeats the check per request, so a build made with another VERCEL_ENV still 404s
 *   when it runs as production.
 * A request-time notFound() in this page (connection()) is not used on purpose: with cacheComponents
 * the static layout shell is already streamed with 200, so it would only be a soft 404.
 */
export default function BadgesPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <main className="paper min-h-dvh bg-paper-dark py-4">
      <div className="mx-auto flex w-[360px] flex-col gap-6 bg-paper px-6 py-6" data-testid="badge-frame">
        <BadgesDemo />
      </div>
    </main>
  );
}
