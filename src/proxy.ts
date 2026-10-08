import { NextResponse, type NextRequest } from "next/server";

/**
 * Request-time guard for dev-only pages: /demo/badges and /debug are a real 404 on Vercel production.
 * Those pages also call notFound() for production builds; this covers a build whose build-time
 * VERCEL_ENV differs from where it runs. A page-level request-time notFound() would be a soft 404
 * (200) under cacheComponents because the layout shell streams first; Proxy runs before rendering.
 */
export function proxy(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    // Unmatched path -> Next's not-found page with a 404 status.
    return NextResponse.rewrite(new URL("/__not-found", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/demo/badges", "/debug"] };
