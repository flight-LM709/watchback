"use client";

import { useEffect, useId, useRef, useState } from "react";
import { en } from "@/copy/en";
import { fill, type PlayerCopy } from "@/copy/format";
import type { DateRange } from "@/lib/takeout/stats";
import { rangeKey } from "./format";

export interface PeriodOption {
  range: DateRange;
  label: string;
}

export interface PeriodPillProps {
  range: DateRange;
  /** Current label (formatPeriodLabel / useStoryStats().periodLabel). */
  label: string;
  /** Picker options (useStoryStats().periodOptions): last 12 months, years with data, all time. */
  options: PeriodOption[];
  onChange: (range: DateRange) => void;
  onOpenChange?: (open: boolean) => void;
  copy?: Pick<PlayerCopy, "periodPillAria">;
}

export function PeriodPill({ range, label, options, onChange, onOpenChange, copy = en.player }: PeriodPillProps) {
  const [open, setOpenState] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenState(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open, onOpenChange]);

  const selected = rangeKey(range);
  const choose = (r: DateRange) => {
    onChange(r);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative" data-story-interactive onKeyDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full bg-(--story-pill-bg) px-3 py-1 text-sm text-(--story-fg)"
        aria-label={fill(copy.periodPillAria, { period: label })}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        <span aria-hidden="true">{label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className={open ? "rotate-180" : ""}>
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={fill(copy.periodPillAria, { period: label })}
          className="absolute left-1/2 top-full z-30 mt-2 min-w-40 -translate-x-1/2 rounded-xl bg-(--story-menu-bg) p-1 text-sm text-(--story-menu-fg) shadow-lg"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          {options.map((o) => {
            const isSel = rangeKey(o.range) === selected;
            return (
              <li
                key={rangeKey(o.range)}
                role="option"
                aria-selected={isSel}
                tabIndex={0}
                className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 ${isSel ? "font-semibold" : ""} hover:bg-(--story-pill-bg) focus:bg-(--story-pill-bg) focus:outline-none`}
                onClick={() => choose(o.range)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    choose(o.range);
                  }
                }}
              >
                {o.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
