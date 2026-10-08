// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoryPlayer, type StorySlide } from "../StoryPlayer";

const slides = (n: number, durationMs?: number): StorySlide[] =>
  Array.from({ length: n }, (_, i) => ({ id: `s${i}`, content: <p>Slide content {i}</p>, durationMs }));

function region() {
  return screen.getByRole("region");
}
function mockWidth(el: HTMLElement, width = 400) {
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width, height: 700, right: width, bottom: 700, x: 0, y: 0, toJSON: () => ({}) });
}
function tap(el: HTMLElement, x: number) {
  fireEvent.pointerDown(el, { clientX: x, button: 0 });
  fireEvent.pointerUp(el, { clientX: x, button: 0 });
}
const setReducedMotion = (v: boolean) => (window as unknown as { __setReducedMotion: (v: boolean) => void }).__setReducedMotion(v);
const setCoarsePointer = (v: boolean) => (window as unknown as { __setCoarsePointer: (v: boolean) => void }).__setCoarsePointer(v);
const GESTURE = "Tap right for next, left to go back. Hold to pause.";
const KEYS = "Use ← and → to move, space to pause.";

beforeEach(() => {
  vi.useFakeTimers();
  setReducedMotion(false);
  setCoarsePointer(false);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("StoryPlayer", () => {
  it("renders one progress bar per slide and the first slide", () => {
    render(<StoryPlayer slides={slides(4)} />);
    expect(screen.getAllByTestId("story-progress")).toHaveLength(4);
    expect(screen.getByText("Slide content 0")).toBeTruthy();
    expect(screen.getByText("Slide 1 of 4")).toBeTruthy();
  });

  it("tap right half = next, left half = prev", () => {
    render(<StoryPlayer slides={slides(3)} />);
    const r = region();
    mockWidth(r);
    tap(r, 300);
    expect(screen.getByText("Slide content 1")).toBeTruthy();
    tap(r, 300);
    expect(screen.getByText("Slide content 2")).toBeTruthy();
    tap(r, 100);
    expect(screen.getByText("Slide content 1")).toBeTruthy();
  });

  it("press-and-hold pauses (no navigation) and resumes on release", () => {
    const onIndexChange = vi.fn();
    render(<StoryPlayer slides={slides(3)} onIndexChange={onIndexChange} />);
    const r = region();
    mockWidth(r);
    fireEvent.pointerDown(r, { clientX: 300, button: 0, pointerType: "touch" });
    act(() => vi.advanceTimersByTime(300));
    expect(r.dataset.paused).toBe("true");
    fireEvent.pointerUp(r, { clientX: 300, button: 0, pointerType: "touch" });
    expect(r.dataset.paused).toBe("false");
    expect(onIndexChange).not.toHaveBeenCalled();
    expect(screen.getByText("Slide content 0")).toBeTruthy();
  });

  it("arrow keys navigate, space toggles pause", () => {
    render(<StoryPlayer slides={slides(3)} />);
    const r = region();
    fireEvent.keyDown(r, { key: "ArrowRight" });
    expect(screen.getByText("Slide content 1")).toBeTruthy();
    fireEvent.keyDown(r, { key: "ArrowLeft" });
    expect(screen.getByText("Slide content 0")).toBeTruthy();
    fireEvent.keyDown(r, { key: " " });
    expect(r.dataset.paused).toBe("true");
    fireEvent.keyDown(r, { key: " " });
    expect(r.dataset.paused).toBe("false");
  });

  it("auto-advances per slide duration, keeps remaining time across a pause, and calls onEnd", () => {
    const onEnd = vi.fn();
    render(<StoryPlayer slides={[{ id: "a", content: "A", durationMs: 1000 }, { id: "b", content: "B", durationMs: 3000 }]} onEnd={onEnd} />);
    const r = region();
    act(() => vi.advanceTimersByTime(999));
    expect(screen.getByText("A")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("B")).toBeTruthy();

    act(() => vi.advanceTimersByTime(2000));
    fireEvent.keyDown(r, { key: " " }); // pause with 1000ms left
    act(() => vi.advanceTimersByTime(10_000));
    expect(onEnd).not.toHaveBeenCalled();
    fireEvent.keyDown(r, { key: " " }); // resume
    act(() => vi.advanceTimersByTime(999));
    expect(onEnd).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("respects prefers-reduced-motion: no auto-advance, no progress animation", () => {
    setReducedMotion(true);
    render(<StoryPlayer slides={slides(3, 1000)} />);
    const r = region();
    expect(r.dataset.reducedMotion).toBe("true");
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByText("Slide content 0")).toBeTruthy();
    const active = r.querySelector('[data-state="active"]') as HTMLElement;
    expect(active.style.animationDuration).toBe("");
    // manual navigation still works
    fireEvent.keyDown(r, { key: "ArrowRight" });
    expect(screen.getByText("Slide content 1")).toBeTruthy();
  });

  it("taps on interactive children (e.g. the period pill) don't navigate", () => {
    render(<StoryPlayer slides={slides(3)} header={<button type="button">Period</button>} />);
    const r = region();
    mockWidth(r);
    const btn = screen.getByRole("button", { name: "Period" });
    fireEvent.pointerDown(btn, { clientX: 300, button: 0 });
    fireEvent.pointerUp(btn, { clientX: 300, button: 0 });
    expect(screen.getByText("Slide content 0")).toBeTruthy();
  });

  it("uses Copywriter's player copy: live region, SR controls, hints, tap-to-continue", () => {
    setReducedMotion(true);
    render(<StoryPlayer slides={slides(3)} />);
    expect(screen.getByText("Slide 1 of 3")).toBeTruthy(); // ariaProgress
    // fine pointer, slide 1: only the keyboard hint (one hint at a time)
    expect(screen.queryByText(GESTURE)).toBeNull();
    expect(screen.getByText(KEYS)).toBeTruthy();
    expect(screen.queryByTestId("tap-to-continue")).toBeNull();
    // SR buttons
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(screen.getByText("Slide content 1")).toBeTruthy();
    expect(screen.queryByText(KEYS)).toBeNull(); // first-run hint goes away after the first interaction
    expect(screen.getByTestId("tap-to-continue").textContent).toBe("Tap to continue"); // the reduced-motion prompt
    fireEvent.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(screen.getByText("Slide content 0")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(region().dataset.paused).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(region().dataset.paused).toBe("false");
    // last slide: no tap-to-continue
    fireEvent.keyDown(region(), { key: "ArrowRight" });
    fireEvent.keyDown(region(), { key: "ArrowRight" });
    expect(screen.queryByTestId("tap-to-continue")).toBeNull();
  });

  describe("slide 1 shows exactly one hint", () => {
    const hints = () => screen.getByTestId("story-hints").children;
    it("fine pointer (mouse/trackpad): keyboard hint only", () => {
      render(<StoryPlayer slides={slides(3)} />);
      expect(hints()).toHaveLength(1);
      expect(screen.getByTestId("keyboard-hint").textContent).toBe(KEYS);
      expect(screen.queryByText(GESTURE)).toBeNull();
      fireEvent.keyDown(region(), { key: "ArrowRight" });
      expect(screen.queryByTestId("story-hints")).toBeNull();
    });
    it("touch (pointer: coarse / hover: none): gesture hint only", () => {
      setCoarsePointer(true);
      render(<StoryPlayer slides={slides(3)} />);
      expect(hints()).toHaveLength(1);
      expect(screen.getByTestId("gesture-hint").textContent).toBe(GESTURE);
      expect(screen.queryByText(KEYS)).toBeNull();
    });
    it("touch + reduced motion: 'Tap to continue' replaces the gesture hint, still one hint", () => {
      setCoarsePointer(true);
      setReducedMotion(true);
      render(<StoryPlayer slides={slides(3)} />);
      expect(hints()).toHaveLength(1);
      expect(screen.getByTestId("tap-to-continue")).toBeTruthy();
      expect(screen.queryByText(GESTURE)).toBeNull();
      expect(screen.queryByText(KEYS)).toBeNull();
    });
  });

  it("left third goes back, right two thirds go forward (SPEC §2)", () => {
    render(<StoryPlayer slides={slides(3)} />);
    const r = region();
    mockWidth(r, 390);
    tap(r, 140); // past the first third -> forward
    expect(screen.getByText("Slide content 1")).toBeTruthy();
    tap(r, 120); // inside the first third -> back
    expect(screen.getByText("Slide content 0")).toBeTruthy();
  });

  it("brand row with a 44px close button; bare slides hide the chrome", () => {
    const onClose = vi.fn();
    const s = [{ id: "a", content: <p>A</p> }, { id: "share", content: <p>Share</p>, bare: true }];
    render(<StoryPlayer slides={s} brand={<span>Brand</span>} onClose={onClose} header={<span>Pill</span>} />);
    expect(screen.getByText("Brand")).toBeTruthy();
    expect(screen.getByText("Pill")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
    fireEvent.keyDown(region(), { key: "ArrowRight" });
    expect(screen.getByText("Share")).toBeTruthy();
    expect(screen.queryByText("Brand")).toBeNull();
    expect(screen.queryByText("Pill")).toBeNull();
  });

  it("accepts a copy override", () => {
    render(<StoryPlayer slides={slides(2)} copy={{ tapToContinue: "x", firstSlideHint: "x", keyboardHint: "x", ariaNext: "Berikutnya", ariaPrev: "Sebelumnya", ariaPause: "Jeda", ariaPlay: "Putar", ariaProgress: "Slide {current} dari {total}", periodPillAria: "x" }} />);
    expect(screen.getByText("Slide 1 dari 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Berikutnya" })).toBeTruthy();
  });

  it("keeps the current slide by id when the slide list changes", () => {
    const { rerender } = render(<StoryPlayer slides={slides(4)} />);
    fireEvent.keyDown(region(), { key: "ArrowRight" });
    fireEvent.keyDown(region(), { key: "ArrowRight" }); // at s2
    // s1 removed: s2 is still current, now at index 1
    rerender(<StoryPlayer slides={slides(4).filter((s) => s.id !== "s1")} />);
    expect(screen.getByText("Slide content 2")).toBeTruthy();
    expect(screen.getByText("Slide 2 of 3")).toBeTruthy();
    // current slide removed: stay at the same position
    rerender(<StoryPlayer slides={slides(4).filter((s) => s.id !== "s1" && s.id !== "s2")} />);
    expect(screen.getByText("Slide content 3")).toBeTruthy();
  });
});
