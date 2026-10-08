import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("next.config headers", () => {
  it("security headers on every route, X-Robots-Tag on /demo and below, no HSTS", async () => {
    const rules = await nextConfig.headers!();
    const all = rules.find((r) => r.source === "/:path*")!;
    expect(Object.fromEntries(all.headers.map((h) => [h.key, h.value]))).toEqual({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "frame-ancestors 'none'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    for (const source of ["/demo", "/demo/:path*"]) {
      expect(rules.find((r) => r.source === source)!.headers).toEqual([{ key: "X-Robots-Tag", value: "noindex, nofollow" }]);
    }
    expect(JSON.stringify(rules)).not.toMatch(/Strict-Transport-Security/i);
  });
});
