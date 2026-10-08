import { TakeoutDebug } from "./takeout-debug";

// Bare placeholder: no design yet. Drop a Takeout .zip to sanity-check the parser.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6 font-mono text-sm">
      <h1 className="mb-4 text-lg font-bold">Watchback: parser placeholder</h1>
      <TakeoutDebug />
    </main>
  );
}
