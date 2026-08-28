"use client";

import { useEffect, useState } from "react";
import type { PathResult } from "@/lib/wiki/pathfinder";

/**
 * The shortest route between two articles, fetched only once the run is over.
 *
 * Deliberately not available during play: the search takes a few seconds, and
 * knowing the answer mid-run would be the whole puzzle handed over. Shared by
 * the win and give-up screens, which both want to show what was possible.
 */
export function useShortestRoute(
  start: string | null,
  target: string | null,
): PathResult | null {
  const [loaded, setLoaded] = useState<{
    key: string;
    result: PathResult;
  } | null>(null);

  const key = start && target ? `${start}|${target}` : null;

  useEffect(() => {
    if (!start || !target || !key) return;

    let active = true;

    fetch(
      `/api/path?from=${encodeURIComponent(start)}&to=${encodeURIComponent(target)}`,
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data: PathResult | null) => {
        if (active && data) setLoaded({ key, result: data });
      })
      .catch(() => {
        // The route is a nice-to-have; both screens stand without it.
      });

    return () => {
      active = false;
    };
  }, [key, start, target]);

  return loaded?.key === key ? loaded.result : null;
}
