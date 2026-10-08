import type { Metadata } from "next";
import type { ReactNode } from "react";

/** /demo and everything under it stays reachable but out of search results (next.config also sends X-Robots-Tag). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: ReactNode }) {
  return children;
}
