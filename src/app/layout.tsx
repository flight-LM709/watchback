import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Space_Mono } from "next/font/google";
import { en } from "@/copy/en";
import "./globals.css";

// Paper Mixtape fonts (design/SPEC.md §1). Self-hosted by next/font, so they're same-origin for the share-image export.
const fraunces = Fraunces({ subsets: ["latin"], axes: ["opsz", "SOFT", "WONK"], style: ["normal", "italic"], variable: "--font-fraunces", display: "swap" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: en.appName,
  description: en.landing.sub,
};

export const viewport: Viewport = { themeColor: "#F3EBDD", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${spaceMono.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-serif text-ink">{children}</body>
    </html>
  );
}
