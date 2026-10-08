import type { Metadata } from "next";
import { DemoStory } from "./demo-story";

export const metadata: Metadata = { title: "Watchback: story demo" };

export default function DemoPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-neutral-900">
      <DemoStory />
    </main>
  );
}
