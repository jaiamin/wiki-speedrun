"use client";

import { Loader2 } from "lucide-react";
import type { PathResult } from "@/lib/wiki/pathfinder";
import { cn } from "@/lib/utils";

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
    <ol className="space-y-1.5 font-display">
      {steps.map((step, index) => {
        const isFirst = index === 0;
        const isLast = index === steps.length - 1;

        return (
          <li
            key={`${step}-${index}`}
            className="flex items-center gap-2.5 text-[0.875rem]"
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full bg-black/5 text-[0.6875rem]",
                muted
                  ? "font-normal text-muted"
                  : "font-bold text-[var(--color-backdrop-ink)]",
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                muted
                  ? "font-normal text-muted"
                  : isLast
                    ? "font-bold text-[var(--color-backdrop-ink)]"
                    : isFirst
                      ? "font-medium text-text"
                      : "font-normal text-text",
              )}
              title={step}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The shortest route, or an honest placeholder while it is still searching. */
export function ShortestRoute({ route }: { route: PathResult | null }) {
  if (!route) {
    return (
      <p className="font-display flex items-center gap-2 text-sm text-muted">
        <Loader2
          className="size-4 animate-spin text-[var(--color-play)]"
          aria-hidden
        />
        Searching for the shortest route…
      </p>
    );
  }

  if (!route.path || route.clicks === null) {
    return (
      <p className="font-display text-sm text-muted">
        No route found within the search budget.
      </p>
    );
  }

  return (
    <div className="font-display">
      {!route.optimal && (
        <p className="mb-2 text-xs font-normal text-muted">
          Best found, may not be shortest
        </p>
      )}
      <RouteList steps={route.path} muted />
    </div>
  );
}
