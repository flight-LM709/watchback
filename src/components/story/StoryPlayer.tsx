"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { en } from "@/copy/en";
import { fill, type PlayerCopy } from "@/copy/format";
import { usePrefersReducedMotion } from "./hooks";

export interface StorySlide {
  /** Stable id. The player tracks the current slide by id, so the list can change underneath it. */
  id: string;
  content: ReactNode;
  /** Auto-advance time for this slide. Defaults to the player's defaultDurationMs. */
  durationMs?: number;
  /** Accessible name, e.g. "Your top 5 creators". */
  label?: string;
  /** Hide the brand row, ✕ and header on this slide (the share slide uses the full height). */
  bare?: boolean;
}

export interface StoryPlayerProps {
  slides: StorySlide[];
  defaultDurationMs?: number;
  /** Rendered over the slides, below the progress bars (e.g. <PeriodPill/>). */
  header?: ReactNode;
  /** Extra external pause (e.g. while a picker is open). */
  paused?: boolean;
  /** Auto-advance on a timer. With prefers-reduced-motion it's off unless autoAdvanceWithReducedMotion. */
  autoAdvance?: boolean;
  autoAdvanceWithReducedMotion?: boolean;
  /** Press longer than this = hold-to-pause instead of a tap. */
  holdDelayMs?: number;
  onIndexChange?: (index: number, id: string) => void;
  onEnd?: () => void;
  className?: string;
  ariaLabel?: string;
  /** Hints and accessible labels. Defaults to Copywriter's en.player. */
  copy?: PlayerCopy;
  /** Top bar: brand on the left (e.g. cassette icon + app name) and a 44×44 ✕ when onClose is set. */
  brand?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
}

const INTERACTIVE = 'button, a, input, select, textarea, [role="listbox"], [role="option"], [data-story-interactive]';

function isInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest(INTERACTIVE);
}

export function StoryPlayer({
  slides,
  defaultDurationMs = 6000,
  header,
  paused: externalPaused = false,
  autoAdvance = true,
  autoAdvanceWithReducedMotion = false,
  holdDelayMs = 250,
  onIndexChange,
  onEnd,
  className = "",
  ariaLabel = en.appName,
  copy = en.player,
  brand,
  onClose,
  closeLabel = en.periodSheet.close,
}: StoryPlayerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [pos, setPos] = useState<{ id: string | undefined; index: number }>({ id: slides[0]?.id, index: 0 });
  const [holding, setHolding] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [restart, setRestart] = useState(0);
  const [interacted, setInteracted] = useState(false);

  // Resolve the current slide by id; if it disappeared (e.g. a period change dropped it), stay at the same position.
  const found = slides.findIndex((s) => s.id === pos.id);
  const index = slides.length === 0 ? 0 : found >= 0 ? found : Math.min(pos.index, slides.length - 1);
  const current = slides[index];
  const duration = current?.durationMs ?? defaultDurationMs;
  const timed = autoAdvance && (!reducedMotion || autoAdvanceWithReducedMotion);
  const paused = holding || userPaused || externalPaused || ended;

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= slides.length) return;
      setEnded(false);
      setInteracted(true);
      setPos({ id: slides[i].id, index: i });
      setRestart((r) => r + 1);
      onIndexChange?.(i, slides[i].id);
    },
    [slides, onIndexChange],
  );

  const next = useCallback(() => {
    if (index < slides.length - 1) goTo(index + 1);
    else if (!ended) {
      setEnded(true);
      onEnd?.();
    }
  }, [index, slides.length, goTo, ended, onEnd]);

  const prev = useCallback(() => {
    if (index > 0) goTo(index - 1);
    else goTo(0); // restart the first slide
  }, [index, goTo]);

  // Auto-advance timer that survives pauses (remaining time is preserved).
  const timing = useRef({ key: "", elapsed: 0 });
  const slideKey = `${current?.id ?? ""}#${restart}`;
  useEffect(() => {
    if (!timed || paused || !current) return;
    if (timing.current.key !== slideKey) timing.current = { key: slideKey, elapsed: 0 };
    const startedAt = Date.now();
    const t = setTimeout(next, Math.max(0, duration - timing.current.elapsed));
    return () => {
      clearTimeout(t);
      if (timing.current.key === slideKey) timing.current.elapsed += Date.now() - startedAt;
    };
  }, [timed, paused, current, slideKey, duration, next]);

  // Tap vs hold, for touch + mouse + pen.
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; held: boolean } | null>(null);
  const clearPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };
  useEffect(() => clearPress, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button > 0 || isInteractive(e.target)) return;
    clearPress();
    const p = { held: false, timer: setTimeout(() => { p.held = true; setHolding(true); setInteracted(true); }, holdDelayMs) };
    press.current = p;
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p) return;
    clearPress();
    if (p.held) {
      setHolding(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    // SPEC: left third goes back, right two thirds go forward.
    if (e.clientX - rect.left < rect.width / 3) prev();
    else next();
  };
  const onPointerCancel = () => {
    const held = press.current?.held;
    clearPress();
    if (held) setHolding(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isInteractive(e.target)) return;
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); setInteracted(true); setUserPaused((v) => !v); }
  };

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      ref={rootRef}
      className={`story-frame paper relative isolate flex select-none flex-col overflow-hidden bg-(--story-bg) text-(--story-fg) outline-none ${className}`}
      style={{ fontFamily: "var(--story-font)" }}
      role="region"
      aria-roledescription="story"
      aria-label={ariaLabel}
      tabIndex={0}
      data-paused={paused ? "true" : "false"}
      data-index={index}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={onKeyDown}
    >
      {/* Progress bars: one 3px segment per planned slide, 3px gaps, 16px inset (SPEC §2). */}
      <div className="absolute inset-x-0 top-0 z-20 flex gap-[3px] px-4 pt-[14px]" aria-hidden="true">
        {slides.map((s, i) => (
          <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-(--story-track)" data-testid="story-progress">
            <div
              key={i === index ? slideKey : s.id}
              className="story-progress-fill h-full w-full origin-left bg-(--story-fill)"
              data-state={i < index ? "done" : i > index ? "todo" : "active"}
              style={
                i < index || (i === index && (ended || !timed))
                  ? { transform: "scaleX(1)" }
                  : i > index
                    ? { transform: "scaleX(0)" }
                    : { animationDuration: `${duration}ms`, animationPlayState: paused ? "paused" : "running" }
              }
            />
          </div>
        ))}
      </div>

      {!current?.bare && (brand || onClose) && (
        <div className="absolute inset-x-0 top-6 z-20 flex h-11 items-center justify-between pl-6 pr-3">
          <div className="pointer-events-none">{brand}</div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label={closeLabel} className="grid size-11 place-items-center text-ink">
              <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </div>
      )}

      {header && !current?.bare && <div className="absolute left-6 top-[66px] z-20">{header}</div>}

      <div
        key={current?.id}
        className={`relative z-10 flex min-h-0 flex-1 flex-col ${current?.bare ? "pt-4" : "pt-[104px]"}`}
        aria-roledescription="slide"
        aria-label={current?.label}
      >
        {current?.content}
      </div>

      {/* Bottom hint (mono 11px ink-2): gesture + keyboard hints on the first run; "Tap to continue" replaces
          the gesture hint whenever reduced motion stops auto-advance. */}
      {(() => {
        const tapPrompt = autoAdvance && !timed && !ended && index < slides.length - 1;
        const firstRun = index === 0 && !interacted;
        if (!tapPrompt && !firstRun) return null;
        return (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-8 z-20 mx-auto flex max-w-[280px] flex-col items-center gap-1 px-6 text-center font-mono text-[11px] leading-snug text-(--story-muted) [text-wrap:balance]"
            data-testid="story-hints"
          >
            {tapPrompt ? (
              <p className="font-bold text-ink" data-testid="tap-to-continue">{copy.tapToContinue}</p>
            ) : (
              <p>{copy.firstSlideHint}</p>
            )}
            {firstRun && <p className="pointer-coarse:hidden">{copy.keyboardHint}</p>}
          </div>
        );
      })()}

      {/* Screen-reader / keyboard controls (visually hidden until focused) */}
      <div className="absolute bottom-2 left-1/2 z-30 flex -translate-x-1/2 gap-2">
        <button type="button" className="sr-only rounded-pill border-2 border-ink bg-paper-2 px-3 py-2 font-mono text-xs font-bold focus:not-sr-only" aria-label={copy.ariaPrev} onClick={prev}>
          ‹
        </button>
        <button
          type="button"
          className="sr-only rounded-pill border-2 border-ink bg-paper-2 px-3 py-2 font-mono text-xs font-bold focus:not-sr-only"
          aria-label={paused && !ended ? copy.ariaPlay : copy.ariaPause}
          onClick={() => { setInteracted(true); setUserPaused((v) => !v); }}
        >
          {paused && !ended ? "▶" : "❚❚"}
        </button>
        <button type="button" className="sr-only rounded-pill border-2 border-ink bg-paper-2 px-3 py-2 font-mono text-xs font-bold focus:not-sr-only" aria-label={copy.ariaNext} onClick={next}>
          ›
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {fill(copy.ariaProgress, { current: slides.length ? index + 1 : 0, total: slides.length })}
      </p>
    </div>
  );
}
