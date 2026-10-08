"use client";

import type { CSSProperties, ReactNode } from "react";
import { Arrow } from "@/components/paper";
import type { MonthBucket } from "@/lib/takeout/stats";
import { dayNarrow, dayShort, hourLabel, monthInitial, monthLongYear, monthShortYear, num } from "./fmt";

const heat = (level: number) => `var(--color-heat-${level})`;
const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

/**
 * 7×24 heatmap, Mon–Sun rows (SPEC §2). Peak cell is ink with an outline and the Caveat note.
 * The grid is decorative for screen readers; a visually hidden table carries the numbers.
 */
export function Heatmap({ heatmap, peak, header, note }: { heatmap: number[][]; peak: { day: number; hour: number } | null; header: string; note: string }) {
  const max = Math.max(1, ...heatmap.flat());
  const level = (c: number) => (c <= 0 ? 0 : Math.min(7, 1 + Math.floor((c / max) * 7)));
  const peakLeft = peak ? `calc(30px + (100% - 30px) * ${(peak.hour + 0.5) / 24})` : "0";
  return (
    <div className="relative">
      <div className="mb-2 flex items-end justify-between">
        <p className="font-mono text-label font-bold uppercase tracking-[0.08em]">{header}</p>
      </div>
      <div className="relative" aria-hidden="true">
        {peak && (
          <span
            className="pointer-events-none absolute -top-9 flex items-end gap-0.5 whitespace-nowrap font-hand text-[22px] font-bold leading-none text-tomato"
            style={peak.hour >= 12 ? { right: `calc(100% - ${peakLeft} - 4px)` } : { left: `calc(${peakLeft} - 4px)` }}
          >
            {peak.hour < 12 && <Arrow className="size-5 -scale-x-100" />}
            {note}
            {peak.hour >= 12 && <Arrow className="size-5" />}
          </span>
        )}
        <div className="grid gap-[2px]" style={{ gridTemplateColumns: "30px repeat(24, minmax(0, 1fr))" }}>
          {MON_FIRST.map((dow) => (
            <Row key={dow} label={dayShort(dow)}>
              {heatmap[dow].map((c, h) => {
                const isPeak = !!peak && peak.day === dow && peak.hour === h;
                return (
                  <span
                    key={h}
                    className="heat-col h-[15px] rounded-[2px]"
                    data-peak={isPeak || undefined}
                    style={{
                      background: isPeak ? "var(--color-ink)" : heat(level(c)),
                      outline: isPeak ? "2.5px solid var(--color-ink)" : undefined,
                      outlineOffset: isPeak ? "1.5px" : undefined,
                      animationDelay: `${h * 16}ms`,
                    }}
                  />
                );
              })}
            </Row>
          ))}
        </div>
        <div className="relative mt-1.5 h-4 font-mono text-[10px] font-bold" style={{ marginLeft: 30 }}>
          {[0, 6, 12, 18].map((h) => (
            <span key={h} className="absolute" style={{ left: `${(h / 24) * 100}%` }}>
              {hourLabel(h)}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>{header}</caption>
        <thead>
          <tr>
            <th scope="col" />
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h} scope="col">{hourLabel(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MON_FIRST.map((dow) => (
            <tr key={dow}>
              <th scope="row">{dayShort(dow)}</th>
              {heatmap[dow].map((c, h) => (
                <td key={h}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span className="self-center font-mono text-[10px] font-bold leading-none">{label}</span>
      {children}
    </>
  );
}

/** The 12 months to chart (SPEC §2 BarChart): the period's months, or for All time the busiest month's calendar year. */
export function chartMonths(monthly: MonthBucket[], busiest: MonthBucket | null, allTime: boolean): MonthBucket[] {
  if (allTime && busiest) {
    return Array.from({ length: 12 }, (_, i) => monthly.find((b) => b.year === busiest.year && b.month === i + 1) ?? { key: `${busiest.year}-${String(i + 1).padStart(2, "0")}`, year: busiest.year, month: i + 1, count: 0 });
  }
  return monthly.slice(-12);
}

/** 12-column bar chart, max height 150px, peak bar tomato with its value above in tomato (on grid paper). */
export function BarChart({ months, peakKey }: { months: MonthBucket[]; peakKey?: string }) {
  const max = Math.max(1, ...months.map((m) => m.count));
  const first = months[0];
  const last = months[months.length - 1];
  return (
    <div aria-hidden="true">
      <div className="flex h-[172px] items-end gap-[5px] border-b-2 border-ink">
        {months.map((m, i) => {
          const isPeak = m.key === peakKey;
          return (
            <div key={m.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              {isPeak && <span className="mb-1 font-mono text-[12px] font-bold text-tomato">{num(m.count)}</span>}
              <span
                className="bar-grow block w-full rounded-t-[3px] border-[1.5px] border-b-0 border-ink"
                style={{ height: Math.max(2, Math.round((m.count / max) * 150)), background: isPeak ? "var(--color-tomato)" : "var(--color-heat-2)", animationDelay: `${i * 30}ms` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[5px]">
        {months.map((m) => (
          <span key={m.key} className={`min-w-0 flex-1 text-center font-mono text-[11px] font-bold ${m.key === peakKey ? "text-tomato" : ""}`}>
            {monthInitial(m.month)}
          </span>
        ))}
      </div>
      {first && last && (
        <div className="mt-0.5 flex justify-between font-mono text-[10px] text-ink-2">
          <span>{monthShortYear(first.year, first.month)}</span>
          <span>{monthShortYear(last.year, last.month)}</span>
        </div>
      )}
    </div>
  );
}

/** Months to draw for a streak: start and end month if they're the same or adjacent, otherwise the end month. */
export function streakMonths(startIso: string, endIso: string): Array<{ year: number; month: number }> {
  const [sy, sm] = startIso.split("-").map(Number);
  const [ey, em] = endIso.split("-").map(Number);
  const span = (ey - sy) * 12 + (em - sm);
  if (span === 0) return [{ year: ey, month: em }];
  if (span === 1) return [{ year: sy, month: sm }, { year: ey, month: em }];
  return [{ year: ey, month: em }];
}

/** Month calendar sticker body (Mon-first). Streak days mustard, start/end tomato with paper text. */
export function StreakCalendar({ start, end }: { start: string; end: string }) {
  const months = streakMonths(start, end);
  const cell = months.length > 1 ? 30 : 36;
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {months.map(({ year, month }) => {
        const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
        const iso = (d: number) => `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        return (
          <div key={`${year}-${month}`}>
            <p className="mb-1.5 font-serif text-[17px] font-bold">{monthLongYear(year, month)}</p>
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(7, ${cell}px)` }}>
              {MON_FIRST.map((dow) => (
                <span key={dow} className="text-center font-mono text-[10px] font-bold text-ink-2">{dayNarrow(dow)}</span>
              ))}
              {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: days }, (_, i) => {
                const d = iso(i + 1);
                const edge = d === start || d === end;
                const inStreak = d >= start && d <= end;
                const style: CSSProperties = { height: cell - 4 };
                return (
                  <span
                    key={d}
                    data-streak={inStreak ? (edge ? "edge" : "day") : undefined}
                    className={`grid place-items-center rounded-[3px] font-mono text-[12px] font-bold ${
                      edge ? "border-[1.5px] border-ink bg-tomato text-paper-2" : inStreak ? "border-[1.5px] border-ink bg-mustard text-ink" : "text-ink"
                    }`}
                    style={style}
                  >
                    {i + 1}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** CSS cassette (SPEC §2 CassetteDropZone shell): teal or tomato shell, paper label, window with 2 reels, screws. */
export function Cassette({
  tone = "teal",
  label,
  dashed = false,
  spinning = false,
  mark,
  className = "",
  labelClassName = "",
}: {
  tone?: "teal" | "tomato";
  label: ReactNode;
  dashed?: boolean;
  spinning?: boolean;
  mark?: ReactNode;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div className={`relative rounded-cassette border-2 border-ink p-3.5 pb-4 text-paper-2 shadow-sticker ${tone === "teal" ? "bg-teal" : "bg-tomato"} ${spinning ? "reels-spin" : ""} ${className}`}>
      {["left-1.5 top-1.5", "right-1.5 top-1.5", "left-1.5 bottom-1.5", "right-1.5 bottom-1.5"].map((p) => (
        <span key={p} className={`absolute size-2 rounded-full border border-ink bg-teal-dark ${p}`} aria-hidden="true" />
      ))}
      <div
        className={`relative rounded-label border-2 border-ink bg-paper-2 px-4 py-3 text-center text-ink ${dashed ? "border-dashed" : ""} ${labelClassName}`}
        style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 21px, rgb(30 107 102 / 0.18) 21px 22px)" }}
      >
        {label}
      </div>
      <div className="mx-auto mt-3 flex h-11 w-[74%] items-center justify-between rounded-full border-2 border-ink bg-teal-dark px-2" aria-hidden="true">
        <Reel />
        <span className="mx-2 h-2.5 flex-1 rounded-sm bg-reel" />
        <Reel />
      </div>
      {mark && <span className="absolute bottom-3 right-4 font-mono text-[11px] font-bold text-paper-2">{mark}</span>}
    </div>
  );
}

function Reel() {
  return (
    <svg viewBox="0 0 30 30" className="size-7" aria-hidden="true">
      <g className="reel">
        <circle cx="15" cy="15" r="13" fill="#FBF6EC" stroke="#1F1B16" strokeWidth="2" />
        <circle cx="15" cy="15" r="7" fill="none" stroke="#1F1B16" strokeWidth="2" />
        <path d="M15 8v3M15 19v3M8 15h3M19 15h3" stroke="#1F1B16" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
