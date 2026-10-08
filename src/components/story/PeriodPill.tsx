"use client";

import { useRef, useState } from "react";
import { BottomSheet, CheckScribble } from "@/components/paper";
import { en } from "@/copy/en";
import { fill, type PlayerCopy } from "@/copy/format";
import type { DateRange } from "@/lib/takeout/stats";
import { rangeKey } from "./format";

export interface PeriodOption {
  range: DateRange;
  label: string;
}

export type PeriodSheetCopy = { [K in keyof typeof en.periodSheet]: string };

export interface PeriodPillProps {
  range: DateRange;
  /** Current label (formatPeriodLabel / useStoryStats().periodLabel). */
  label: string;
  /** Options (useStoryStats().periodOptions): last 12 months, years with data, all time. */
  options: PeriodOption[];
  onChange: (range: DateRange) => void;
  onOpenChange?: (open: boolean) => void;
  copy?: Pick<PlayerCopy, "periodPillAria">;
  sheetCopy?: PeriodSheetCopy;
}

/**
 * Period pill (SPEC §2): mono 12px/700 on paper-2, 1.5px ink border, pill shadow, 30px tall with a
 * 44px hit area. Opens a bottom sheet: Last 12 months (+ range), Calendar years (newest first), All time.
 */
export function PeriodPill({ range, label, options, onChange, onOpenChange, copy = en.player, sheetCopy = en.periodSheet }: PeriodPillProps) {
  const [open, setOpenState] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };
  const selected = rangeKey(range);
  const choose = (r: DateRange) => {
    onChange(r);
    setOpen(false);
  };

  const last12 = options.find((o) => o.range.type === "last12Months");
  const years = options.filter((o) => o.range.type === "calendarYear").sort((a, b) => (b.range as { year: number }).year - (a.range as { year: number }).year);
  const allTime = options.find((o) => o.range.type === "allTime");

  const row = (o: PeriodOption, title: string, sub?: string) => {
    const isSel = rangeKey(o.range) === selected;
    return (
      <li key={rangeKey(o.range)}>
        <button
          type="button"
          aria-current={isSel ? "true" : undefined}
          data-selected={isSel || undefined}
          onClick={() => choose(o.range)}
          className={`flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-2 text-left ${
            isSel ? "my-1 rounded-card border-2 border-ink bg-mustard text-ink shadow-chip" : "border-b border-dashed border-rule"
          }`}
        >
          <span className="min-w-0">
            <span className="block font-serif text-[21px] font-semibold leading-tight">{title}</span>
            {sub && <span className="block font-mono text-[12px] font-bold text-ink">{sub}</span>}
          </span>
          {/* Hand check is ink: tomato on mustard is on the do-not-use list. */}
          {isSel && <CheckScribble className="size-7 shrink-0 text-ink" />}
        </button>
      </li>
    );
  };

  return (
    <div data-story-interactive onKeyDown={(e) => e.stopPropagation()}>
      <button
        ref={btn}
        type="button"
        className="relative inline-flex h-[30px] items-center gap-2 rounded-pill border-[1.5px] border-ink bg-paper-2 px-3.5 font-mono text-[12px] font-bold text-ink shadow-pill after:absolute after:-inset-x-1 after:-inset-y-[7px] after:content-['']"
        aria-label={fill(copy.periodPillAria, { period: label })}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden="true">{label}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" className={open ? "rotate-180" : ""}>
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={sheetCopy.title} closeLabel={sheetCopy.close} initialFocus="[data-selected]">
        <ul className="flex flex-col">
          {last12 && row(last12, sheetCopy.last12, last12.label)}
        </ul>
        {years.length > 0 && (
          <>
            <h3 className="mb-1 mt-4 font-mono text-label font-bold uppercase tracking-[0.08em] text-ink-2">{sheetCopy.calendarYears}</h3>
            <ul className="flex flex-col">
              {years.map((o) => row(o, o.label))}
            </ul>
          </>
        )}
        <ul className="mt-2 flex flex-col">{allTime && row(allTime, sheetCopy.allTime)}</ul>
      </BottomSheet>
    </div>
  );
}
