"use client";

import type { RunRecord } from "./types";

const KEY = "wiki-speedrun:runs";
const LIMIT = 250;

/**
 * Local run history — the single-player leaderboard.
 *
 * Everything lives in `localStorage` on purpose: the game is fully playable
 * with no account, no database and no network beyond Wikipedia itself. The
 * `RunRecord` shape is deliberately the shape a rows-in-a-table leaderboard
 * would want, so adding a hosted backend later is an addition rather than a
 * migration.
 *
 * Every access is guarded — Safari private mode throws on `localStorage`, and
 * a corrupt entry should cost a history list, not the game.
 */
export function loadRuns(): RunRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RunRecord[]) : [];
  } catch {
    return [];
  }
}

/**
 * Store a finished run, ignoring one that is already stored.
 *
 * Record ids are derived from the run itself, so a repeated save — from a
 * re-run effect, a double-invoked render in development, or a remount — is
 * recognised and dropped rather than producing a duplicate row in the history.
 */
export function saveRun(record: RunRecord): RunRecord[] {
  const existing = loadRuns();
  if (existing.some((run) => run.id === record.id)) return existing;

  const runs = [record, ...existing].slice(0, LIMIT);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(runs));
  } catch {
    // Out of quota or storage disabled: the run still counts for this session.
  }
  invalidate();
  return runs;
}

export function clearRuns(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to do — the caller re-reads and gets whatever survived.
  }
  invalidate();
}

/**
 * `localStorage` is an external store, so components read it through
 * `useSyncExternalStore` rather than copying it into state inside an effect.
 *
 * That requires a snapshot that is referentially stable between changes — a
 * fresh `JSON.parse` on every render would loop forever — hence the cache,
 * cleared whenever we write.
 */
const EMPTY: RunRecord[] = [];
const listeners = new Set<() => void>();
let snapshot: RunRecord[] | null = null;

function invalidate(): void {
  snapshot = null;
  for (const listener of listeners) listener();
}

export function subscribeToRuns(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function runsSnapshot(): RunRecord[] {
  snapshot ??= loadRuns();
  return snapshot;
}

/** The server has no storage, so it renders the empty state. */
export function serverRunsSnapshot(): RunRecord[] {
  return EMPTY;
}

/** Fastest previous finish for the same pairing, for a personal-best callout. */
export function personalBest(
  start: string,
  target: string,
  runs = loadRuns(),
): RunRecord | null {
  const matching = runs.filter(
    (run) => run.start === start && run.target === target,
  );
  if (matching.length === 0) return null;

  return matching.reduce((best, run) =>
    run.elapsedMs < best.elapsedMs ? run : best,
  );
}
