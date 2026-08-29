"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { ArticleSummary } from "@/lib/wiki/article";

/** Where a preview should appear, in viewport coordinates. */
interface Anchor {
  title: string;
  left: number;
  top: number;
  bottom: number;
}

const PREVIEW_WIDTH = 300;
const MARGIN = 8;

/**
 * Summaries are cached for the whole session, outside React.
 *
 * A player sweeps the cursor across dozens of links while reading, and returns
 * to the same ones repeatedly. Caching at module scope means each article is
 * fetched at most once no matter how many times it is hovered, and survives
 * navigating between pages.
 */
const cache = new Map<string, ArticleSummary | null>();

/** Long enough that skimming the page does not fire a request per link. */
const HOVER_DELAY = 320;

export function useLinkPreview(enabled: boolean) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [, refresh] = useReducer((count: number) => count + 1, 0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setAnchor(null);
  }, []);

  const onPointerOver = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      // Touch has no hover state; a preview there would fight the tap.
      if (!enabled || event.pointerType === "touch") return;

      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
        "a[data-wiki-title]",
      );

      if (!link) return;
      const title = link.dataset.wikiTitle;
      if (!title) return;

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const rect = link.getBoundingClientRect();
        setAnchor({
          title,
          left: rect.left,
          top: rect.top,
          bottom: rect.bottom,
        });
      }, HOVER_DELAY);
    },
    [enabled],
  );

  const onPointerOut = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const link = (event.target as HTMLElement).closest("a[data-wiki-title]");
      if (!link) return;
      clear();
    },
    [clear],
  );

  // Any scroll invalidates the measured position, so the preview is dismissed
  // rather than left floating beside the wrong link.
  useEffect(() => {
    if (!anchor) return;

    window.addEventListener("scroll", clear, true);
    return () => window.removeEventListener("scroll", clear, true);
  }, [anchor, clear]);

  useEffect(() => {
    if (!anchor || cache.has(anchor.title)) return;

    let active = true;

    fetch(`/api/summary/${encodeURIComponent(anchor.title)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ArticleSummary | null) => {
        cache.set(anchor.title, data);
        if (active) refresh();
      })
      .catch(() => {
        cache.set(anchor.title, null);
        if (active) refresh();
      });

    return () => {
      active = false;
    };
  }, [anchor]);

  const summary = anchor ? cache.get(anchor.title) : undefined;

  return {
    handlers: { onPointerOver, onPointerOut },
    preview: anchor ? { anchor, summary, loading: !cache.has(anchor.title) } : null,
    clear,
  };
}

interface LinkPreviewProps {
  anchor: Anchor;
  summary: ArticleSummary | null | undefined;
  loading: boolean;
}

/**
 * A short definition of the article a link points at.
 *
 * Wikiracing is largely a guessing game about what a title actually means —
 * "Cádiz" or "Breccia" tell you nothing about whether they are worth a click.
 * Showing the one-line description on hover turns that guess into a decision
 * without giving anything away about the route.
 */
export function LinkPreview({ anchor, summary, loading }: LinkPreviewProps) {
  // Flip above the link when there is no room beneath it, and keep the card
  // inside the viewport horizontally.
  const spaceBelow = window.innerHeight - anchor.bottom;
  const above = spaceBelow < 140;
  const left = Math.min(
    Math.max(MARGIN, anchor.left),
    window.innerWidth - PREVIEW_WIDTH - MARGIN,
  );

  return (
    <div
      role="tooltip"
      style={{
        position: "fixed",
        left,
        top: above ? undefined : anchor.bottom + 8,
        bottom: above ? window.innerHeight - anchor.top + 8 : undefined,
        width: PREVIEW_WIDTH,
      }}
      className="pointer-events-none z-40 rounded-2xl border-2 border-black bg-canvas p-3.5 shadow-[-3px_5px_0_rgba(11,26,74,0.08),0_12px_32px_rgba(10,24,80,0.18)]"
    >
      <div className="flex gap-3">
        {summary?.thumbnail && (
          <img
            src={summary.thumbnail.source}
            alt=""
            className="size-11 shrink-0 rounded-xl border border-black/10 object-cover"
          />
        )}
        <div className="min-w-0">
          <div className="font-display truncate text-sm font-bold tracking-[-0.011em] text-[var(--color-backdrop-ink)]">
            {anchor.title}
          </div>
          <p className="font-display mt-0.5 line-clamp-3 text-xs leading-relaxed text-muted">
            {loading
              ? "…"
              : (summary?.description ??
                summary?.extract ??
                "No description available.")}
          </p>
        </div>
      </div>
    </div>
  );
}
