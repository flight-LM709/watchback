import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TakeoutDebug } from "./takeout-debug";

export const metadata: Metadata = { title: "Watchback: parser debug" };

// Developer page: drop a Takeout .zip to see the raw stats + diagnostics JSON.
// Dev-only: a production build bakes in a real 404 here. src/proxy.ts repeats the check per request.
export default function DebugPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <main className="mx-auto w-full max-w-3xl p-6 font-mono text-sm">
      <TakeoutDebug />
    </main>
  );
}
