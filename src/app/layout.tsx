import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Watchback (dev placeholder)",
  description: "Your year on YouTube, played back. Your Takeout file never leaves your device.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
