"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/components/story/hooks";
import { monogram } from "@/lib/monogram";
import { InfoIcon, TapeStrip, VHSStripe, XScribble } from "./deco";

export * from "./deco";

/** Paper sticker: paper-2, 2px ink border, hard shadow, small rotation. Slaps in. */
export function Sticker({
  rotate = 0,
  className = "",
  style,
  children,
  slap = true,
  tone = "paper",
}: {
  rotate?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  slap?: boolean;
  tone?: "paper" | "mustard" | "tomato" | "teal" | "grid" | "ink";
}) {
  // Text colour follows tokens.css: ink on paper/mustard/grid, paper-2 on tomato/teal/ink.
  const tones = {
    paper: "bg-paper-2 text-ink grain-card",
    grid: "bg-grid text-ink",
    mustard: "bg-mustard text-ink",
    tomato: "bg-tomato text-paper-2",
    teal: "bg-teal text-paper-2",
    ink: "bg-ink text-paper-2",
  } as const;
  return (
    <div
      className={`${/\b(absolute|fixed)\b/.test(className) ? "" : "relative"} rounded-card border-2 border-ink shadow-sticker ${tones[tone]} ${slap ? "slap" : ""} ${className}`}
      style={{ transform: `rotate(${rotate}deg)`, ["--slap-to" as string]: `${rotate}deg`, ...style }}
    >
      {children}
    </div>
  );
}

/** VHS label sticker: stripe header, "T-120" left, "● REC" right, content centered. */
export function VHSLabel({ left, right, children, rotate = -1.5, className = "" }: { left?: ReactNode; right?: ReactNode; children: ReactNode; rotate?: number; className?: string }) {
  return (
    <Sticker rotate={rotate} className={`overflow-visible rounded-label ${className}`}>
      <VHSStripe className="rounded-t-[6px]" />
      {(left || right) && (
        <div className="flex items-center justify-between px-3 pt-2 font-mono text-label font-bold uppercase tracking-[0.08em]" aria-hidden="true">
          <span className="text-ink-2">{left}</span>
          <span className="text-tomato">{right}</span>
        </div>
      )}
      <div className="flex justify-center px-2 pb-3 pt-1">{children}</div>
    </Sticker>
  );
}

/** Count up from 0 over 600ms (ease-out); final value immediately with reduced motion. */
export function useCountUp(target: number, ms = 600): number {
  const rm = usePrefersReducedMotion();
  const [state, setState] = useState({ target, value: 0 });
  useEffect(() => {
    if (rm || typeof requestAnimationFrame === "undefined") return;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setState({ target, value: Math.round(target * (1 - (1 - p) ** 3)) });
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, rm]);
  if (rm || typeof requestAnimationFrame === "undefined") return target;
  return state.target === target ? state.value : 0;
}

/**
 * The one hero number per slide. Space Mono 700, ≥ 96px (never smaller, per vedrico), nowrap,
 * tabular figures; width is reserved for the final value so the roll-up doesn't jitter.
 * Screen readers get the final value only.
 */
export function HeroNumber({
  value,
  size = 96,
  className = "",
  format = (n: number) => n.toLocaleString("en-US"),
  animate = true,
}: {
  value: number;
  size?: number;
  className?: string;
  format?: (n: number) => string;
  animate?: boolean;
}) {
  const px = Math.max(96, size);
  const shown = useCountUp(animate ? value : 0, 600);
  const final = format(value);
  const tracking = final.length >= 7 ? "-0.1em" : "-0.075em";
  return (
    <span className={`hero-num inline-grid ${className}`} style={{ fontSize: px, letterSpacing: tracking }} data-hero-px={px}>
      <span className="sr-only">{final}</span>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">{final}</span>
      <span aria-hidden="true" className="col-start-1 row-start-1 text-right">{animate ? format(shown) : final}</span>
    </span>
  );
}

/** Creator avatar (SPEC §8). Round paper sticker with up to two initials; colour + tilt hashed from the name. */
export function MonogramSticker({ name, size, tape = false, className = "" }: { name: string; size: number; tape?: boolean; className?: string }) {
  const m = monogram(name);
  const hero = size >= 100;
  const shadow = hero ? 4 : 2;
  const chars = [...m.initials].length;
  return (
    <span
      role="img"
      aria-label={name}
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size, transform: `rotate(${m.tilt}deg)`, filter: `drop-shadow(${shadow}px ${shadow}px 0 #1F1B16)` }}
      data-palette={m.paletteIndex}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle cx="50" cy="50" r="48" fill="#FBF6EC" stroke="#1F1B16" strokeWidth={hero ? 2 : 1.6} vectorEffect="non-scaling-stroke" />
        <circle cx="50" cy="50" r="41" fill={m.bg} />
        <circle cx="50" cy="50" r="44.5" fill="none" stroke="#1F1B16" strokeOpacity=".3" strokeWidth=".8" strokeDasharray="2 2.5" />
        <text
          x="50"
          y="51"
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight="800"
          fontSize={chars === 1 ? 46 : 38}
          letterSpacing="-1.5"
          fill={m.fg}
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {m.initials}
        </text>
      </svg>
      {tape && <TapeStrip width={Math.round(size * 0.42)} angle={-m.tilt * 2 - 4} className="left-[29%] -top-2" />}
    </span>
  );
}

/** Estimate chip: mono uppercase tomato, 2px border, −2°, ⓘ; 30px visual inside a 44px hit area. */
export function EstimateChip({ label, onClick, expanded, controls, staticVariant = false }: { label: string; onClick?: () => void; expanded?: boolean; controls?: string; staticVariant?: boolean }) {
  if (staticVariant) {
    return (
      <span className="inline-flex h-[22px] -rotate-2 items-center rounded-tag border-[1.5px] border-ink bg-paper-2 px-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-ink">
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-haspopup="dialog"
      className="relative inline-flex h-11 items-center"
      data-story-interactive
    >
      <span className="inline-flex h-[30px] -rotate-2 items-center gap-1.5 rounded-tag border-2 border-tomato px-2 font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-tomato">
        {label}
        <InfoIcon className="size-3.5" />
      </span>
    </button>
  );
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet (SPEC §2): paper-2 + grain, 2px ink top border, 24px radius, handle, round ✕ (44px).
 * role=dialog + aria-modal, focus trapped inside, Esc / scrim tap / ✕ close, focus returns to the opener.
 * Rendered in a portal over the story; data-story-interactive keeps story taps/keys out.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  closeLabel,
  children,
  initialFocus,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  closeLabel: string;
  children: ReactNode;
  /** CSS selector inside the sheet to focus first (defaults to the first focusable). */
  initialFocus?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = (initialFocus && el?.querySelector<HTMLElement>(initialFocus)) || el?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    return () => opener?.focus?.();
  }, [open, initialFocus]);

  if (!open || typeof document === "undefined") return null;

  const onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      onCloseRef.current();
      return;
    }
    if (e.key !== "Tab" || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-center" data-story-interactive onKeyDown={onKeyDown} onPointerDown={(e) => e.stopPropagation()}>
      <div className="scrim-in absolute inset-0 bg-scrim" onClick={onClose} aria-hidden="true" data-testid="sheet-scrim" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sheet-up paper absolute bottom-0 max-h-[85dvh] w-full max-w-[430px] overflow-y-auto rounded-t-sheet border-t-2 border-ink bg-paper-2 px-6 pb-8 pt-3 text-ink shadow-[0_-8px_0_rgb(31_27_22/0.08)]"
      >
        <div className="mx-auto mb-3 h-[5px] w-11 rounded-full bg-ink/25" aria-hidden="true" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={titleId} className="font-serif text-[26px] font-bold leading-tight tracking-[-0.02em]">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label={closeLabel} className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-paper-2">
            <XScribble className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
