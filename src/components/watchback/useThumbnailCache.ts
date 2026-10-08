"use client";

import { useEffect, useRef, useState } from "react";
import { fetchThumbnail, type ThumbLoader } from "@/lib/thumb/client";

export type ThumbState = { status: "loading" } | { status: "ready"; url: string } | { status: "failed" };

/**
 * Story-level thumbnail holder. One request per video ID for the life of the story, so switching
 * periods back and forth doesn't refetch, the favorite-video slide can unmount without losing the
 * image, and the share-card export can still use it. Every blob: URL is revoked only when the story
 * itself unmounts (exports run while the story is mounted and finish before it can go away).
 */
export function useThumbnailCache(videoId: string | undefined, loader: ThumbLoader = fetchThumbnail): ThumbState | null {
  const [cache, setCache] = useState<ReadonlyMap<string, ThumbState>>(() => new Map());
  const requested = useRef(new Set<string>());
  const urls = useRef(new Set<string>());
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const owned = urls.current;
    return () => {
      alive.current = false;
      for (const u of owned) URL.revokeObjectURL(u);
      owned.clear();
    };
  }, []);

  useEffect(() => {
    if (!videoId || requested.current.has(videoId)) return;
    requested.current.add(videoId);
    const settle = (s: ThumbState) => setCache((m) => new Map(m).set(videoId, s));
    loader(videoId).then(
      (url) => {
        if (!alive.current) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        if (url) urls.current.add(url);
        settle(url ? { status: "ready", url } : { status: "failed" });
      },
      () => alive.current && settle({ status: "failed" }),
    );
  }, [videoId, loader]);

  if (!videoId) return null;
  return cache.get(videoId) ?? { status: "loading" };
}
