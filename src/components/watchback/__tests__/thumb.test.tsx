// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { VideoThumb } from "../VideoThumb";
import { useThumbnailCache } from "../useThumbnailCache";

const revoke = vi.fn();
beforeEach(() => {
  revoke.mockClear();
  URL.revokeObjectURL = revoke;
});
afterEach(cleanup);

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function Harness({ loader, title = "A very long video title" }: { loader: (id: string) => Promise<string | null>; title?: string }) {
  const [id, setId] = useState<string | undefined>("AAAAAAAAAAA");
  const [showSlide, setShowSlide] = useState(true);
  const thumb = useThumbnailCache(id, loader);
  return (
    <div>
      {showSlide && <VideoThumb thumb={thumb} alt={title} />}
      <button onClick={() => setShowSlide((v) => !v)}>toggle slide</button>
      <button onClick={() => setId("BBBBBBBBBBB")}>other</button>
      <button onClick={() => setId("AAAAAAAAAAA")}>back</button>
    </div>
  );
}

describe("VideoThumb + story-level thumbnail cache", () => {
  it("shows the placeholder while loading, then the image (alt = title) with a 200ms fade, none under reduced motion", async () => {
    const d = deferred<string | null>();
    render(<Harness loader={() => d.promise} />);
    expect(screen.getByTestId("video-thumb").dataset.state).toBe("loading");
    expect(screen.queryByRole("img")).toBeNull();
    await act(async () => d.resolve("blob:x/1"));
    const img = screen.getByRole("img", { name: "A very long video title" }) as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("blob:x/1");
    expect(img.className).toMatch(/object-cover/);
    expect(img.className).toMatch(/duration-200/);
    expect(img.className).toMatch(/motion-reduce:transition-none/);
    expect(img.className).toMatch(/opacity-0/);
    fireEvent.load(img);
    expect(img.className).toMatch(/opacity-100/);
    expect(screen.getByTestId("video-thumb").dataset.state).toBe("loaded");
  });

  it("failure (404/timeout -> null) keeps the placeholder; decode errors fall back too", async () => {
    render(<Harness loader={async () => null} />);
    await act(async () => {});
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByTestId("video-thumb").dataset.state).toBe("placeholder");
    cleanup();
    render(<Harness loader={async () => "blob:x/broken"} />);
    await act(async () => {});
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByTestId("video-thumb").dataset.state).toBe("placeholder");
  });

  it("keeps the blob URL when the slide unmounts or the period changes; one request per ID; revokes only when the story unmounts", async () => {
    const loader = vi.fn(async (id: string) => `blob:x/${id}`);
    const { unmount } = render(<Harness loader={loader} />);
    await act(async () => {});
    fireEvent.click(screen.getByText("toggle slide")); // slide unmounts
    fireEvent.click(screen.getByText("toggle slide")); // and comes back
    expect(screen.getByRole("img").getAttribute("src")).toBe("blob:x/AAAAAAAAAAA");
    fireEvent.click(screen.getByText("other")); // period change -> different favorite
    await act(async () => {});
    fireEvent.click(screen.getByText("back"));
    expect(screen.getByRole("img").getAttribute("src")).toBe("blob:x/AAAAAAAAAAA");
    expect(loader).toHaveBeenCalledTimes(2);
    expect(revoke).not.toHaveBeenCalled();
    unmount();
    expect(revoke.mock.calls.map((c) => c[0]).sort()).toEqual(["blob:x/AAAAAAAAAAA", "blob:x/BBBBBBBBBBB"]);
  });

  it("a load that finishes after the story unmounted is revoked immediately", async () => {
    const d = deferred<string | null>();
    const { unmount } = render(<Harness loader={() => d.promise} />);
    unmount();
    await act(async () => d.resolve("blob:x/late"));
    expect(revoke).toHaveBeenCalledWith("blob:x/late");
  });
});
