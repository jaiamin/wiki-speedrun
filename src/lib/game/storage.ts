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
    if (!Array.isArray(parsed)) return [];

    // Records written before abandoned runs were tracked were only ever saved
    // on a win, so a missing flag means completed.
    return (parsed as RunRecord[]).map((run) => ({
      ...run,
      completed: run.completed ?? true,
    }));
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

/** Fastest previous win for the same pairing, for a personal-best callout. */
export function personalBest(
  start: string,
  target: string,
  runs = loadRuns(),
): RunRecord | null {
  const matching = runs.filter(
    (run) => run.start === start && run.target === target && run.completed,
  );
  if (matching.length === 0) return null;

  return matching.reduce((best, run) =>
    run.elapsedMs < best.elapsedMs ? run : best,
  );
}

export interface PairingSummary {
  key: string;
  start: string;
  target: string;
  /** Fastest winning attempt, or null if this pairing has never been beaten. */
  best: RunRecord | null;
  attempts: number;
  /** Most recent attempt, used to order the list. */
  latestAt: number;
}

/**
 * Collapse the run history into one row per pairing.
 *
 * A pairing can be replayed as often as you like, so a flat list of every
 * attempt is mostly repetition. Grouping means each row can answer the only
 * questions worth asking of it — did I ever beat this, and how fast — and
 * gives the retry button somewhere obvious to live.
 */
export function summarizePairings(runs: RunRecord[]): PairingSummary[] {
  const groups = new Map<string, PairingSummary>();

  for (const run of runs) {
    const key = `${run.start}|${run.target}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        start: run.start,
        target: run.target,
        best: run.completed ? run : null,
        attempts: 1,
        latestAt: run.finishedAt,
      });
      continue;
    }

    existing.attempts += 1;
    existing.latestAt = Math.max(existing.latestAt, run.finishedAt);
    if (run.completed && (!existing.best || run.elapsedMs < existing.best.elapsedMs)) {
      existing.best = run;
    }
  }

  return [...groups.values()].sort((a, b) => b.latestAt - a.latestAt);
}
