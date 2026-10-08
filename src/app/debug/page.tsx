import type { Metadata } from "next";
import { TakeoutDebug } from "./takeout-debug";

export const metadata: Metadata = { title: "Watchback: parser debug" };

// Developer page: drop a Takeout .zip to see the raw stats + diagnostics JSON.
export default function DebugPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6 font-mono text-sm">
      <TakeoutDebug />
    </main>
  );
}
