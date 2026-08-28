"use client";

import { Loader2 } from "lucide-react";
import type { PathResult } from "@/lib/wiki/pathfinder";

/**
 * A route rendered as a numbered list rather than a run-on line of arrows.
 *
 * Routes are the thing both end-of-run screens exist to show, and a numbered
 * column makes the length of a route legible at a glance — which is the
 * comparison a player is actually making between theirs and the shortest one.
 */
export function RouteList({
  steps,
  muted = false,
}: {
  steps: string[];
  muted?: boolean;
}) {
  return (
    <ol className="space-y-1">
      {steps.map((step, index) => (
        <li key={`${step}-${index}`} className="flex gap-3 text-[0.8125rem]">
          <span className="tnum w-4 shrink-0 font-mono text-xs text-faint">
            {String(index).padStart(2, "0")}
          </span>
          <span
            className={
              index === steps.length - 1 && !muted
                ? "font-medium"
                : muted
                  ? "text-muted"
                  : undefined
            }
          >
            {step}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The shortest route, or an honest placeholder while it is still searching. */
export function ShortestRoute({ route }: { route: PathResult | null }) {
  if (!route) {
    return (
      <p className="flex items-center gap-2 text-[0.8125rem] text-muted">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Searching for the shortest route…
      </p>
    );
  }

  if (!route.path || route.clicks === null) {
    return (
      <p className="text-[0.8125rem] text-muted">
        No route found within the search budget.
      </p>
    );
  }

  return (
    <>
      <p className="mb-2 text-[0.8125rem] text-muted">
        <span className="tnum font-mono text-text">{route.clicks}</span>{" "}
        {route.clicks === 1 ? "click" : "clicks"}
        {route.optimal ? "" : " — best found, may not be shortest"}
      </p>
      <RouteList steps={route.path} muted />
    </>
  );
}
