"use client";

import { useState } from "react";
import type { ThumbState } from "./useThumbnailCache";

const HATCH = "repeating-linear-gradient(45deg, rgb(30 107 102 / 0.32) 0 2px, transparent 2px 11px)";

/**
 * Favorite-video thumbnail (SPEC §7): 16:9, 2px ink border, object-fit cover.
 * The placeholder (paper-dark + 45° teal hatch, no text) shows while loading and stays on any failure:
 * non-2xx / 404, network error, >3 s (the request was aborted, so nothing arrives late), or a decode error.
 * The image fades in over 200ms; no fade with reduced motion.
 */
export function VideoThumb({ thumb, alt, className = "" }: { thumb: ThumbState | null; alt: string; className?: string }) {
  const src = thumb?.status === "ready" ? thumb.url : null;
  const [loaded, setLoaded] = useState<string | null>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const showImg = !!src && broken !== src;
  return (
    <div
      className={`relative aspect-video w-full overflow-hidden border-2 border-ink bg-paper-dark ${className}`}
      style={{ backgroundImage: HATCH }}
      data-testid="video-thumb"
      data-state={showImg ? (loaded === src ? "loaded" : "loading") : thumb?.status === "loading" ? "loading" : "placeholder"}
    >
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element -- same-origin blob: URL from /api/thumb; next/image can't optimize it
        <img
          src={src}
          alt={alt}
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(src)}
          onError={() => setBroken(src)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-200 ease-out motion-reduce:transition-none ${loaded === src ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
