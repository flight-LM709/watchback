"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { usePrefersReducedMotion } from "./hooks";

export interface StorySlide {
  /** Stable id. The player tracks the current slide by id, so the list can change underneath it. */
  id: string;
  content: ReactNode;
  /** Auto-advance time for this slide. Defaults to the player's defaultDurationMs. */
  durationMs?: number;
  /** Accessible name, e.g. "Your top 5 creators". */
  label?: string;
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
  holdDelayMs = 220,
  onIndexChange,
  onEnd,
  className = "",
  ariaLabel = "Your year in review",
}: StoryPlayerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [pos, setPos] = useState<{ id: string | undefined; index: number }>({ id: slides[0]?.id, index: 0 });
  const [holding, setHolding] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [restart, setRestart] = useState(0);

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
    const p = { held: false, timer: setTimeout(() => { p.held = true; setHolding(true); }, holdDelayMs) };
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
    if (e.clientX - rect.left < rect.width / 2) prev();
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
    else if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); setUserPaused((v) => !v); }
  };

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      ref={rootRef}
      className={`story-frame relative isolate flex select-none flex-col overflow-hidden bg-(--story-bg) text-(--story-fg) outline-none ${className}`}
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
      {/* Progress bars */}
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-2 pt-2" aria-hidden="true">
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

      {header && <div className="relative z-20 flex justify-center px-3 pt-6">{header}</div>}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col" aria-roledescription="slide" aria-label={current?.label}>
        {current?.content}
      </div>

      <p className="sr-only" aria-live="polite">
        {slides.length ? `Slide ${index + 1} of ${slides.length}${paused && !ended ? ", paused" : ""}` : "No slides"}
      </p>
    </div>
  );
}
