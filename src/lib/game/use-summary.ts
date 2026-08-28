"use client";

import { useEffect, useState } from "react";
import type { ArticleSummary } from "@/lib/wiki/article";

/**
 * Fetches the one-line blurb and thumbnail for an article.
 *
 * The result is stored *with* the title it belongs to and matched on read,
 * rather than being cleared whenever the title changes. Clearing would mean
 * calling `setState` synchronously inside the effect, which costs a second
 * render pass on every change; matching on read gives the same "never show a
 * stale blurb" guarantee for free.
 */
export function useSummary(title: string | null): ArticleSummary | null {
  const [loaded, setLoaded] = useState<{
    title: string;
    summary: ArticleSummary | null;
  } | null>(null);

  useEffect(() => {
    if (!title) return;

    let active = true;

    fetch(`/api/summary/${encodeURIComponent(title)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ArticleSummary | null) => {
        if (active) setLoaded({ title, summary: data });
      })
      .catch(() => {
        // A missing blurb is cosmetic; the run continues without it.
      });

    return () => {
      active = false;
    };
  }, [title]);

  return loaded?.title === title ? loaded.summary : null;
}
