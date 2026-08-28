"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Article } from "@/lib/wiki/article";
import { titlesMatch } from "@/lib/wiki/titles";
import type { Puzzle, RunRecord, RunStatus } from "./types";

/** One page on the route, with the moment it was reached. */
export interface TrailEntry {
  title: string;
  /** Epoch ms the article finished loading — the segment's split time. */
  at: number;
}

interface RunState {
  puzzle: Puzzle | null;
  status: RunStatus;
  /** Pages currently on the route, start first. Backtracking pops from here. */
  trail: TrailEntry[];
  /** Every navigation, including ones later undone — the true effort count. */
  moves: number;
  article: Article | null;
  loading: boolean;
  error: string | null;
  startedAt: number | null;
  finishedAt: number | null;
}

type Action =
  | { type: "begin"; puzzle: Puzzle }
  | { type: "loading" }
  | { type: "loaded"; article: Article; mode: "forward" | "back" | "first" }
  | { type: "failed"; message: string }
  | { type: "won"; at: number }
  | { type: "abandon" }
  | { type: "reset" };

const initialState: RunState = {
  puzzle: null,
  status: "idle",
  trail: [],
  moves: 0,
  article: null,
  loading: false,
  error: null,
  startedAt: null,
  finishedAt: null,
};

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "begin":
      return { ...initialState, puzzle: action.puzzle, status: "playing" };

    case "loading":
      return { ...state, loading: true, error: null };

    case "loaded": {
      const { article, mode } = action;
      const now = Date.now();

      // Backtracking pops the trail; a forward move that lands somewhere
      // already visited truncates back to that point, so the trail always
      // describes the route actually taken rather than every page seen.
      const existing = state.trail.findIndex((entry) =>
        titlesMatch(entry.title, article.title),
      );
      const trail: TrailEntry[] =
        mode === "first"
          ? [{ title: article.title, at: now }]
          : existing !== -1
            ? state.trail.slice(0, existing + 1)
            : [...state.trail, { title: article.title, at: now }];

      return {
        ...state,
        article,
        trail,
        loading: false,
        error: null,
        moves: mode === "first" ? 0 : state.moves + 1,
        // The clock starts when the first article is on screen, not when the
        // request was sent — the player should not be charged for our latency.
        startedAt: mode === "first" ? now : state.startedAt,
      };
    }

    case "failed":
      return { ...state, loading: false, error: action.message };

    case "won":
      return { ...state, status: "won", finishedAt: action.at };

    case "abandon":
      return { ...state, status: "abandoned", finishedAt: Date.now() };

    case "reset":
      return initialState;
  }
}

async function fetchArticle(title: string): Promise<Article> {
  const response = await fetch(`/api/article/${encodeURIComponent(title)}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `Could not load "${title}"`);
  }
  return (await response.json()) as Article;
}

export function useRun() {
  const [state, dispatch] = useReducer(reducer, initialState);

  /**
   * Guards against out-of-order responses. A player who clicks twice quickly
   * would otherwise be able to land on the article whose request happened to
   * finish last rather than the one they chose second.
   */
  const requestId = useRef(0);

  const navigate = useCallback(
    async (title: string, mode: "forward" | "back" | "first") => {
      const id = ++requestId.current;
      dispatch({ type: "loading" });

      try {
        const article = await fetchArticle(title);
        if (id !== requestId.current) return;

        dispatch({ type: "loaded", article, mode });
      } catch (error) {
        if (id !== requestId.current) return;
        dispatch({
          type: "failed",
          message:
            error instanceof Error ? error.message : "Could not load the page",
        });
      }
    },
    [],
  );

  const begin = useCallback(
    (puzzle: Puzzle) => {
      dispatch({ type: "begin", puzzle });
      void navigate(puzzle.start, "first");
    },
    [navigate],
  );

  const go = useCallback(
    (title: string) => {
      if (state.status !== "playing") return;
      void navigate(title, "forward");
    },
    [navigate, state.status],
  );

  const back = useCallback(() => {
    if (state.status !== "playing" || state.trail.length < 2) return;
    void navigate(state.trail[state.trail.length - 2].title, "back");
  }, [navigate, state.status, state.trail]);

  const giveUp = useCallback(() => dispatch({ type: "abandon" }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  /**
   * Win detection lives here rather than in the reducer because it depends on
   * the *resolved* article title. A player who clicks "USA" must win on
   * "United States", and only the server knows the redirect resolved that way.
   */
  useEffect(() => {
    if (state.status !== "playing" || !state.puzzle || !state.article) return;
    if (!titlesMatch(state.article.title, state.puzzle.target)) return;
    dispatch({ type: "won", at: Date.now() });
  }, [state.article, state.puzzle, state.status]);

  return { state, begin, go, back, giveUp, reset };
}

/**
 * Live elapsed time, repainted on every animation frame so the hundredths
 * column actually moves. Using rAF rather than an interval keeps the clock in
 * step with the display and lets the browser pause it in a background tab.
 */
export function useElapsed(
  startedAt: number | null,
  finishedAt: number | null,
): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null || finishedAt !== null) return;

    let frame = 0;
    const tick = () => {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [startedAt, finishedAt]);

  if (startedAt === null) return 0;
  return (finishedAt ?? now) - startedAt;
}

/**
 * Build the record for a finished run.
 *
 * Deliberately pure — it does not save. Persisting from inside a `useMemo`
 * (where the caller needs this value) would write once per render pass rather
 * than once per run, which is exactly how the same run ended up in the history
 * twice. Saving belongs in an effect, and `saveRun` dedupes on top of that.
 *
 * The id is derived from the run rather than random, so the same finished run
 * always produces the same record and can be recognised as a duplicate.
 */
export function buildRunRecord(state: {
  puzzle: Puzzle;
  trail: TrailEntry[];
  startedAt: number;
  finishedAt: number;
}): RunRecord {
  const record: RunRecord = {
    id: `${state.puzzle.start}|${state.puzzle.target}|${state.finishedAt}`,
    start: state.puzzle.start,
    target: state.puzzle.target,
    difficulty: state.puzzle.difficulty,
    daily: state.puzzle.daily,
    trail: state.trail.map((entry) => entry.title),
    clicks: state.trail.length - 1,
    elapsedMs: state.finishedAt - state.startedAt,
    finishedAt: state.finishedAt,
  };

  return record;
}
