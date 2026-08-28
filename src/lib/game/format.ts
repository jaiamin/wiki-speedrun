import type { RunRecord } from "./types";

/**
 * Format a duration the way a speedrun timer does: minutes, seconds, and two
 * decimal places, growing an hours field only when it is actually needed.
 * Hundredths are the convention because they are the finest unit a human can
 * still read off a moving clock.
 */
export function formatClock(ms: number): string {
  const safe = Math.max(0, ms);
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1000);
  const hundredths = Math.floor((safe % 1000) / 10);

  const pad = (value: number) => String(value).padStart(2, "0");
  const tail = `${pad(seconds)}.${pad(hundredths)}`;

  return hours > 0
    ? `${hours}:${pad(minutes)}:${tail}`
    : `${minutes}:${tail}`;
}

/** Compact duration for dense lists, where hundredths would be noise. */
export function formatShort(ms: number): string {
  const seconds = Math.round(Math.max(0, ms) / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes > 0
    ? `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`
    : `${seconds}s`;
}

/** Signed split delta, e.g. "+4.21" or "-1.08". */
export function formatDelta(ms: number): string {
  const sign = ms >= 0 ? "+" : "-";
  return `${sign}${(Math.abs(ms) / 1000).toFixed(2)}`;
}

/**
 * A result compact enough to paste into a chat without spoiling the route.
 *
 * The squares encode the run rather than decorating it: one per click, gold
 * for the clicks par allows and purple for every click beyond it, so the shape
 * alone says how close to optimal the run was.
 */
export function shareText(record: RunRecord, par: number | null): string {
  const header = record.daily
    ? `Wiki Speedrun — Daily ${record.daily}`
    : "Wiki Speedrun";

  const squares =
    par === null
      ? "🟦".repeat(Math.min(record.clicks, 20))
      : "🟨".repeat(Math.min(par, 20)) +
        "🟪".repeat(Math.max(0, Math.min(record.clicks - par, 20)));

  const parLine = par === null ? "" : ` · par ${par}`;

  return [
    header,
    `${record.start} → ${record.target}`,
    `${formatClock(record.elapsedMs)} · ${record.clicks} clicks${parLine}`,
    squares,
  ].join("\n");
}
