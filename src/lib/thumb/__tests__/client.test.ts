import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THUMB_TIMEOUT_MS, fetchThumbnail } from "../client";

const ID = "dQw4w9WgXcQ";
const img = () => new Response(new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), { status: 200, headers: { "content-type": "image/jpeg" } });
const create = vi.fn(() => "blob:http://localhost/abc");

beforeEach(() => create.mockClear());
afterEach(() => vi.useRealTimers());

describe("fetchThumbnail (POST /api/thumb)", () => {
  it("POSTs JSON { id } to /api/thumb and returns a same-origin blob: URL", async () => {
    const fetchImpl = vi.fn(async () => img());
    await expect(fetchThumbnail(ID, { fetchImpl, createObjectURL: create })).resolves.toBe("blob:http://localhost/abc");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/thumb");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({ id: ID });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(url).not.toMatch(/ytimg|youtube/);
  });

  it("never requests invalid IDs", async () => {
    const fetchImpl = vi.fn(async () => img());
    for (const bad of ["", "short", "dQw4w9WgXcQ!", "dQw4w9WgXcQx", "../../etc/pa"]) {
      await expect(fetchThumbnail(bad, { fetchImpl, createObjectURL: create })).resolves.toBeNull();
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([404, 400, 429, 500, 504])("non-2xx (%i) -> null (placeholder)", async (status) => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: "x" }), { status, headers: { "content-type": "application/json" } }));
    await expect(fetchThumbnail(ID, { fetchImpl, createObjectURL: create })).resolves.toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("network errors and non-image bodies -> null", async () => {
    await expect(fetchThumbnail(ID, { fetchImpl: async () => Promise.reject(new TypeError("offline")), createObjectURL: create })).resolves.toBeNull();
    const html = async () => new Response("<html>", { status: 200, headers: { "content-type": "text/html" } });
    await expect(fetchThumbnail(ID, { fetchImpl: html, createObjectURL: create })).resolves.toBeNull();
  });

  it("> 3 s: aborts the request, resolves null, and ignores a late response", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    let respond!: (r: Response) => void;
    const fetchImpl = vi.fn((_u: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>((res) => (respond = res)); // a server that ignores the abort
    });
    const p = fetchThumbnail(ID, { fetchImpl, createObjectURL: create });
    await vi.advanceTimersByTimeAsync(THUMB_TIMEOUT_MS);
    await expect(p).resolves.toBeNull();
    expect(signal?.aborted).toBe(true);
    respond(img());
    await vi.runAllTimersAsync();
    expect(create).not.toHaveBeenCalled(); // no blob URL for the late image, so nothing can swap in
  });
});
