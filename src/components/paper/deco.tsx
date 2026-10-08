/**
 * Paper Mixtape decorative pieces (design/assets/*.svg inlined so they take currentColor).
 * All purely decorative: aria-hidden.
 */
import type { CSSProperties } from "react";

type Deco = { className?: string; style?: CSSProperties };

export function Sparkle({ className = "", style }: Deco) {
  return (
    <svg viewBox="0 0 30 30" className={className} style={style} aria-hidden="true">
      <path d="M15 2 C16 11 19 14 28 15 C19 16 16 19 15 28 C14 19 11 16 2 15 C11 14 14 11 15 2Z" fill="currentColor" />
    </svg>
  );
}

export function Star({ className = "", style }: Deco) {
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden="true">
      <path d="M20 2 L24 15 L38 16 L27 24 L31 38 L20 30 L9 38 L13 24 L2 16 L16 15 Z" fill="currentColor" stroke="#1F1B16" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function Arrow({ className = "", style }: Deco) {
  return (
    <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M2 4 C 12 4, 18 10, 19 22" />
      <path d="M14 18 L19 23 L23 17" />
    </svg>
  );
}

export function CheckScribble({ className = "", style }: Deco) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M3 13 C 6 15, 8 18, 9 20 C 12 13, 16 7, 22 3" />
    </svg>
  );
}

export function XScribble({ className = "", style }: Deco) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" className={className} style={style} aria-hidden="true">
      <path d="M4 5 C 9 10, 14 15, 20 20" />
      <path d="M19 4 C 14 10, 9 14, 5 20" />
    </svg>
  );
}

export function CassetteIcon({ className = "", style }: Deco) {
  return (
    <svg viewBox="0 0 22 15" width="24" height="16" className={className} style={style} aria-hidden="true">
      <rect x="1" y="1" width="20" height="13" rx="2" fill="#1F1B16" />
      <rect x="4" y="3.5" width="14" height="5" rx="2.5" fill="#F3EBDD" />
      <circle cx="7.5" cy="6" r="1.5" fill="#1F1B16" />
      <circle cx="14.5" cy="6" r="1.5" fill="#1F1B16" />
      <path d="M6 14l1.5-3h7L16 14" fill="#B33A24" />
    </svg>
  );
}

export function Lock({ className = "", style }: Deco) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} style={style} aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

export function InfoIcon({ className = "", style }: Deco) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} style={style} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 7v4.5M8 4.6v.1" strokeLinecap="round" />
    </svg>
  );
}

/** Hand-drawn circle around its parent (position the parent relative; pass -inset-* classes). Tomato, draws on. */
export function HandCircle({ className = "", style }: Deco) {
  // The wrapper (not the <svg>) carries the insets: an absolutely positioned <svg> would keep its 2:1 intrinsic ratio.
  return (
    <span className={`pointer-events-none absolute block text-tomato ${className}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 200 100" preserveAspectRatio="none" fill="none" className="draw-on block size-full overflow-visible">
        <path pathLength={1} d="M150 10 C 104 0, 36 4, 12 32 C -6 56, 22 92, 96 94 C 166 96, 198 72, 193 44 C 188 18, 146 6, 96 8 C 70 9, 52 13, 40 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

/** Hand-drawn underline that stretches to its box. Tomato, draws on. */
export function Underline({ className = "", style }: Deco) {
  return (
    <svg viewBox="0 0 200 14" preserveAspectRatio="none" fill="none" className={`draw-on pointer-events-none block text-tomato ${className}`} style={style} aria-hidden="true">
      <path pathLength={1} d="M3 9 C 40 3, 80 13, 120 6 S 178 4, 197 9" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** 74×22 masking tape (assets/tape.svg), rotated, overlapping a sticker corner. */
export function TapeStrip({ className = "", angle = -24, variant = "mustard", width = 74, style }: Deco & { angle?: number; variant?: "mustard" | "clear"; width?: number }) {
  return (
    <span
      className={`tape pointer-events-none absolute block ${className}`}
      style={{ width, height: 22, ["--tape-transform" as string]: `rotate(${angle}deg)`, ...style }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 74 22" preserveAspectRatio="none" width="100%" height="100%">
        <path
          d="M2 1 L72 0 L73 4 L71 8 L73 12 L71 17 L72 21 L1 22 L3 17 L1 12 L3 7 L1 3 Z"
          fill={variant === "mustard" ? "rgb(226 167 46 / 0.55)" : "rgb(255 253 245 / 0.7)"}
        />
      </svg>
    </span>
  );
}

/** The 4-colour VHS stripe (tomato, mustard, teal, ink). */
export function VHSStripe({ className = "" }: { className?: string }) {
  return (
    <span className={`flex h-4 border-b-2 border-ink ${className}`} aria-hidden="true">
      <span className="flex-1 bg-tomato" />
      <span className="flex-1 bg-mustard" />
      <span className="flex-1 bg-teal" />
      <span className="flex-1 bg-ink" />
    </span>
  );
}
