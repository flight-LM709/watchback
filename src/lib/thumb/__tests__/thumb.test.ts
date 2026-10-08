import { describe, expect, it, vi } from "vitest";
import { createThumbHandler } from "../handler";
import { RateLimiter } from "../../durations/guards";

const ID = "dQw4w9WgXcQ";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://x/api/thumb", {
    method: "POST",
    headers: { "x-forwarded-for": "9.9.9.9", cookie: "secret=1", "user-agent": "Victim/1.0", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const img = (bytes = JPEG, type = "image/jpeg") =>
  new Response(bytes, { status: 200, headers: { "content-type": type } });
const notFound = () => new Response(new Uint8Array([1]), { status: 404, headers: { "content-type": "image/jpeg" } });

describe("POST /api/thumb", () => {
  it("prefers maxres and returns the image bytes", async () => {
    const f = vi.fn(async (url: string) => (url.includes("maxres") ? img(new Uint8Array([0xff, 0xd8, 9])) : img()));
    const res = await createThumbHandler({ fetchImpl: f })(post({ id: ID }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xd8, 9]));
  });

  it("falls back to hq when maxres is missing", async () => {
    const f = vi.fn(async (url: string) => (url.includes("maxres") ? notFound() : img()));
    const res = await createThumbHandler({ fetchImpl: f })(post({ id: ID }));
    expect(res.status).toBe(200);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(JPEG);
  });

  it("returns 404 (not an empty 200) for removed videos", async () => {
    const res = await createThumbHandler({ fetchImpl: vi.fn(async () => notFound()) })(post({ id: ID }));
    expect(res.status).toBe(404);
  });

  it("rejects non-image upstream responses", async () => {
    const f = vi.fn(async () => img(new Uint8Array([60, 104]), "text/html"));
    expect((await createThumbHandler({ fetchImpl: f })(post({ id: ID }))).status).toBe(404);
  });

  it("times out fast with 504", async () => {
    const f = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("abort")))),
    );
    const t0 = Date.now();
    const res = await createThumbHandler({ fetchImpl: f, timeoutMs: 50 })(post({ id: ID }));
    expect(res.status).toBe(504);
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it.each([["nope", "invalid_json"], [{}, "invalid_id"], [{ id: "../../etc" }, "invalid_id"], [{ id: "short" }, "invalid_id"]])(
    "rejects %j with 400",
    async (body, error) => {
      const f = vi.fn();
      const res = await createThumbHandler({ fetchImpl: f })(post(body));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(error);
      expect(f).not.toHaveBeenCalled();
    },
  );

  it("forwards none of the user's headers to Google and only calls i.ytimg.com", async () => {
    const f = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => img());
    await createThumbHandler({ fetchImpl: f })(post({ id: ID }));
    for (const [url, init] of f.mock.calls) {
      expect(new URL(url).host).toBe("i.ytimg.com");
      const h = new Headers(init?.headers);
      expect([...h.keys()]).toEqual(["accept"]);
      expect(init?.referrerPolicy).toBe("no-referrer");
    }
  });

  it("rate limits", async () => {
    const POST = createThumbHandler({ fetchImpl: vi.fn(async () => img()), limiter: new RateLimiter(1, 60_000) });
    expect((await POST(post({ id: ID }))).status).toBe(200);
    expect((await POST(post({ id: ID }))).status).toBe(429);
  });

  it("never logs", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m));
    await createThumbHandler({ fetchImpl: vi.fn(async () => notFound()) })(post({ id: ID }));
    await createThumbHandler({ fetchImpl: vi.fn(async () => img()) })(post({ id: ID }));
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });
});
