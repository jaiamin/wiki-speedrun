"use client";

import { formatClock } from "@/lib/game/format";
import type { TrailEntry } from "@/lib/game/use-run";
import { cn } from "@/lib/utils";

interface SplitsProps {
  trail: TrailEntry[];
  startedAt: number;
  /** Optimal click count, once known — the line the run is measured against. */
  par: number | null;
}

/**
 * The run as a split table.
 *
 * Every article you landed on is a segment, carrying the clock at the moment
 * you arrived and the time that segment alone took. Once par is known, rows
 * past it are marked, so the table stops being a list of pages and becomes a
 * record of exactly where the run went long.
 *
 * This lives on the results screen rather than in the run: mid-race it would
 * be a distraction, and afterwards it is the most interesting thing on screen.
 */
export function Splits({ trail, startedAt, par }: SplitsProps) {
  const slowest = trail.reduce((worst, entry, index) => {
    if (index === 0) return worst;
    return Math.max(worst, entry.at - trail[index - 1].at);
  }, 0);

  return (
    <table className="w-full text-[0.8125rem]">
      <thead>
        <tr className="border-b border-line text-left">
          <th className="label pb-1.5 font-normal">#</th>
          <th className="label pb-1.5 font-normal">Page</th>
          <th className="label pb-1.5 text-right font-normal">Split</th>
          <th className="label pb-1.5 text-right font-normal">Total</th>
        </tr>
      </thead>
      <tbody>
        {trail.map((entry, index) => {
          const segment = index === 0 ? 0 : entry.at - trail[index - 1].at;
          const overPar = par !== null && index > par;
          // The single slowest segment is where the run was actually decided.
          const isSlowest = index > 0 && segment === slowest && trail.length > 2;

          return (
            <tr
              key={`${entry.title}-${entry.at}`}
              className="border-b border-line last:border-0"
            >
              <td
                className={cn(
                  "tnum py-2 font-mono text-xs",
                  overPar ? "text-bad" : "text-faint",
                )}
              >
                {String(index).padStart(2, "0")}
              </td>
              <td className="py-2 pr-3">
                <span className="line-clamp-1">{entry.title}</span>
              </td>
              <td
                className={cn(
                  "tnum py-2 text-right font-mono",
                  isSlowest ? "text-bad" : "text-muted",
                )}
              >
                {index === 0 ? "—" : `${(segment / 1000).toFixed(1)}s`}
              </td>
              <td className="tnum py-2 text-right font-mono">
                {index === 0 ? "—" : formatClock(entry.at - startedAt)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
