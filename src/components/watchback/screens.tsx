"use client";

import { useEffect, useId, useState, type DragEvent, type ReactNode } from "react";
import { Lock, Sparkle, Star, Sticker, TapeStrip, Underline } from "@/components/paper";
import { usePrefersReducedMotion } from "@/components/story";
import { en } from "@/copy/en";
import { isPreparing } from "@/lib/takeout/progress";
import type { ProgressPhase } from "@/lib/takeout/types";
import { Cassette } from "./charts";
import { num, splitAround } from "./fmt";
import { Brand } from "./WatchbackStory";

/** Pre-story screens share the paper page: 430px column, 24px gutters. */
function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`paper relative flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-8 pt-6 ${className}`}>{children}</div>;
}

function Disclaimer() {
  return <p className="mt-auto pt-8 text-center font-mono text-[11px] text-ink-2">{en.disclaimer}</p>;
}

/** "a, b" -> a, then b in tomato italic with a hand underline (used for "…, played back."). */
function TailAccent({ text }: { text: string }) {
  const i = text.lastIndexOf(", ");
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i + 1)}{" "}
      <span className="relative inline-block italic text-tomato">
        {text.slice(i + 2)}
        <Underline className="absolute -bottom-2 left-0 h-3 w-full" />
      </span>
    </>
  );
}

const Wordmark = () => <span className="font-hand text-[40px] font-bold leading-none text-ink">{en.appName}</span>;

/** 00 Landing: headline, sub, the full privacy note, Get started. */
export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <Page>
      <Brand />
      <div className="relative mx-auto mt-5 w-[86%] rotate-[-4deg]" aria-hidden="true">
        <Cassette label={<Wordmark />} className="slap" />
        <Star className="absolute -right-6 top-6 size-10 text-mustard" />
      </div>
      <Sparkle className="mt-6 size-5 text-tomato" />
      <h1 className="mt-2 font-serif text-[44px] font-extrabold leading-[1.02] tracking-[-0.03em] [text-wrap:balance]">
        <TailAccent text={en.landing.headline.last12} />
      </h1>
      <p className="mt-5 font-serif text-sub italic">{en.landing.sub}</p>
      <Sticker rotate={0.6} className="mt-7 px-4 py-3.5">
        <TapeStrip variant="clear" className="-left-3 -top-3" angle={-12} />
        <p className="font-serif text-[15px] leading-relaxed" data-testid="privacy-body">{en.privacy.body}</p>
      </Sticker>
      <button type="button" onClick={onStart} className="mt-7 h-14 rounded-pill bg-ink font-serif text-[20px] font-bold text-paper-2">
        {en.landing.cta} <span aria-hidden="true">→</span>
      </button>
      <p className="mt-4 flex items-center justify-center gap-2 font-serif text-[16px] font-semibold text-teal">
        <Lock className="size-4" />
        {en.landing.privacyLine}
      </p>
      <Disclaimer />
    </Page>
  );
}

function StepText({ text }: { text: string }) {
  const host = en.upload.takeoutUrl.replace(/^https?:\/\//, "");
  const i = text.indexOf(host);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <a href={en.upload.takeoutUrl} target="_blank" rel="noreferrer" className="font-semibold underline decoration-tomato decoration-2 underline-offset-2">
        {host}
      </a>
      {text.slice(i + host.length)}
    </>
  );
}

/** 01 Upload: cassette drop zone (whole cassette is the <label> for a hidden file input), steps. */
export function Upload({ onFiles, error }: { onFiles: (files: File[]) => void; error: string | null }) {
  const inputId = useId();
  const errId = useId();
  const [over, setOver] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [lastError, setLastError] = useState(error);
  if (error !== lastError) {
    setLastError(error);
    if (error) setShakeKey((k) => k + 1);
  }
  const [introA, introB] = (() => {
    const i = en.upload.intro.indexOf(". ");
    return i < 0 ? [en.upload.intro, ""] : [en.upload.intro.slice(0, i + 1), en.upload.intro.slice(i + 2)];
  })();
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = [...e.dataTransfer.files];
    if (files.length) onFiles(files);
  };

  return (
    <Page>
      <Brand />
      <h1 className="mt-5 font-serif text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em]">
        {introA} {introB && <span className="italic text-tomato">{introB}</span>}
      </h1>

      <div className="relative mt-5">
        <input
          id={inputId}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          multiple
          className="peer sr-only"
          aria-describedby={error ? errId : undefined}
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            if (files.length) onFiles(files);
          }}
        />
        <label
          htmlFor={inputId}
          key={shakeKey}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          className={`block cursor-pointer rounded-cassette transition-transform duration-200 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-tomato motion-reduce:transition-none ${over ? "scale-[1.02] motion-reduce:scale-100" : ""} ${shakeKey ? "shake" : ""}`}
          data-testid="dropzone"
          data-dragover={over || undefined}
        >
          <Cassette
            dashed={!over}
            spinning={over}
            labelClassName={over ? "!border-solid !border-tomato" : ""}
            mark={<span>{en.upload.cassetteLabel} ▲</span>}
            label={
              <span className="block py-1">
                <span className="block font-serif text-[26px] font-extrabold leading-tight [text-wrap:balance]">{en.upload.dropzone}</span>
                <span className="mt-1 inline-block font-serif text-[16px] italic underline decoration-tomato decoration-2 underline-offset-4">{en.upload.dropzoneAlt}</span>
              </span>
            }
          />
        </label>
        <Sticker tone="tomato" rotate={-2.5} className="absolute -bottom-6 left-2 flex items-center gap-2 rounded-pill px-4 py-2 font-serif text-[16px] font-bold">
          <Lock className="size-4" />
          {en.upload.badge}
        </Sticker>
      </div>
      {error && (
        <p id={errId} role="alert" className="mt-10 border-l-2 border-tomato pl-3 font-serif text-[16px] font-semibold text-tomato">
          {error}
        </p>
      )}

      <Sticker rotate={0.5} className={`${error ? "mt-6" : "mt-12"} px-4 pb-3 pt-5`}>
        <span className="absolute -top-3.5 right-6 rotate-[3deg] bg-[rgb(226_167_46/0.55)] px-3 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink">
          {en.deco.takeoutTape}
        </span>
        <h2 className="font-serif text-[19px] font-bold">{en.upload.stepsTitle}</h2>
        <ol className="mt-2">
          {en.upload.steps.map((step, i) => (
            <li key={i} className="flex gap-3 border-b border-dashed border-rule py-2 last:border-b-0">
              <span className="w-6 shrink-0 font-mono text-[13px] font-bold text-tomato">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-serif text-[15px] leading-snug">
                <StepText text={step} />
              </span>
            </li>
          ))}
        </ol>
      </Sticker>
      <Disclaimer />
    </Page>
  );
}

/** 02b Crunching: spinning cassette, live crunching.counter, tape bar, rotating lines. */
export function Crunching({ count, fraction, phase = "parsing" }: { count: number; fraction: number; phase?: ProgressPhase }) {
  const rm = usePrefersReducedMotion();
  const lines = en.crunching.rotating;
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), 2200);
    return () => clearInterval(t);
  }, [lines.length]);
  const [before, after] = splitAround(en.crunching.counter, "n");
  // Nothing is counted while the zip is opened/inflated, so say that instead of a frozen crunching.counter.
  const preparing = isPreparing(phase, count);
  return (
    <Page className="items-center text-center">
      <div className="self-start">
        <Brand />
      </div>
      <div className="mt-14 w-[78%] rotate-[-3deg]" aria-hidden="true">
        <Cassette label={<Wordmark />} spinning />
      </div>
      {/* Fixed height = the three-line counter, so switching from the phase label doesn't shift the page. */}
      <p className="mt-12 flex min-h-[166px] flex-col justify-center" role="status" aria-live="polite">
        {preparing ? (
          <span className="block font-serif text-headline font-semibold">{en.crunching.unzipping}</span>
        ) : (
          <>
            <span className="sr-only">{`${before}${num(count)}${after}`}</span>
            <span aria-hidden="true" className="block font-serif text-headline font-semibold">{before.trim()}</span>
            <span aria-hidden="true" className="hero-num block text-[96px] tracking-[-0.075em]">{num(count)}</span>
            <span aria-hidden="true" className="block font-serif text-[24px] italic">{after.trim()}</span>
          </>
        )}
      </p>
      <div className="mt-6 h-3 w-[80%] overflow-hidden rounded-full border-2 border-ink bg-paper-2" aria-hidden="true">
        <div className="h-full bg-reel transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%` }} />
      </div>
      <p key={i} className={`mt-4 font-serif text-sub italic ${rm ? "" : "animate-[fade-in_200ms_linear_both]"}`}>{lines[i]}</p>
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {lines.map((_, n) => (
          <span key={n} className={`size-1.5 rounded-full ${n === i ? "bg-ink" : "bg-ink/25"}`} />
        ))}
      </div>
    </Page>
  );
}
