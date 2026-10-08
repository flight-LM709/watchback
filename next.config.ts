import type { NextConfig } from "next";

/** Sent on every route (pages, assets, /api/*). No HSTS here: the host handles TLS policy. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Only frame-ancestors for now; a full CSP needs its own pass (next/font, inline styles, blob: thumbnails).
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** /demo is public but shouldn't be indexed (the segment's metadata also sets robots noindex/nofollow). */
const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/demo", headers: noindex },
      { source: "/demo/:path*", headers: noindex },
    ];
  },
};

export default nextConfig;
