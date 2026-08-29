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

export interface StageCompletion {
  target: string;
  at: number;
  trailIndex: number;
  moves: number;
}

interface RunState {
  puzzle: Puzzle | null;
  status: RunStatus;
  /** Pages currently on the route, start first. Backtracking pops from here. */
  trail: TrailEntry[];
  /** Every navigation, including ones later undone — the true effort count. */
  moves: number;
  /** Zero-based checkpoint currently being pursued. */
  stageIndex: number;
  /** Trail index where each stage began. Completed stages cannot be erased. */
  stageStarts: number[];
  completedStages: StageCompletion[];
  article: Article | null;
  /** Cached so Try Again can restart without loading the source page again. */
  startArticle: Article | null;
  /** The source article, held until the short pairing reveal finishes. */
  pending: Article | null;
  revealElapsed: boolean;
  showReveal: boolean;
  loading: boolean;
  error: string | null;
  startedAt: number | null;
  finishedAt: number | null;
}

type Action =
  | { type: "begin"; puzzle: Puzzle; reveal: boolean }
  | { type: "restart" }
  | { type: "loading" }
  | { type: "loaded"; article: Article; mode: "forward" | "back" | "first" }
  | { type: "revealElapsed" }
  | { type: "failed"; message: string }
  | { type: "targetReached"; at: number }
  | { type: "abandon" }
  | { type: "reset" };

const initialState: RunState = {
  puzzle: null,
  status: "idle",
  trail: [],
  moves: 0,
  stageIndex: 0,
  stageStarts: [],
  completedStages: [],
  article: null,
  startArticle: null,
  pending: null,
  revealElapsed: false,
  showReveal: false,
  loading: false,
  error: null,
  startedAt: null,
  finishedAt: null,
};

/**
 * Hand control to the player: the article goes on screen, the trail starts, and
 * the clock begins — never before, so nobody is charged for our latency or for
 * the seconds spent looking at the reveal.
 */
function beginPlaying(
  state: RunState,
  article: Article,
  now: number,
): RunState {
  return {
    ...state,
    status: "playing",
    article,
    startArticle: article,
    pending: null,
    revealElapsed: true,
    showReveal: false,
    trail: [{ title: article.title, at: now }],
    moves: 0,
    stageIndex: 0,
    stageStarts: [0],
    completedStages: [],
    startedAt: now,
    finishedAt: null,
    loading: false,
    error: null,
  };
}

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "begin":
      return {
        ...initialState,
        puzzle: action.puzzle,
        status: "revealing",
        revealElapsed: !action.reveal,
        showReveal: action.reveal,
      };

    case "restart":
      return state.puzzle && state.startArticle
        ? beginPlaying(state, state.startArticle, Date.now())
        : state;

    case "loading":
      return { ...state, loading: true, error: null };

    case "loaded": {
      const { article, mode } = action;
      const now = Date.now();

      if (mode === "first" && state.status === "revealing") {
        return state.revealElapsed
          ? beginPlaying(state, article, now)
          : { ...state, pending: article, loading: false, error: null };
      }

      // Every remaining load is a move within a running game.
      //
      // Backtracking pops the trail, and a forward move landing somewhere
      // already visited truncates back to that point, so the trail always
      // describes the route actually taken rather than every page seen.
      const stageStart = state.stageStarts[state.stageStarts.length - 1] ?? 0;
      const localExisting = state.trail
        .slice(stageStart)
        .findIndex((entry) => titlesMatch(entry.title, article.title));
      const existing =
        localExisting === -1 ? -1 : stageStart + localExisting;
      const trail: TrailEntry[] =
        existing !== -1
          ? state.trail.slice(0, existing + 1)
          : [...state.trail, { title: article.title, at: now }];

      return {
        ...state,
        article,
        trail,
        loading: false,
        error: null,
        moves: state.moves + 1,
      };
    }

    case "revealElapsed":
      return state.pending
        ? beginPlaying(state, state.pending, Date.now())
        : { ...state, revealElapsed: true };

    case "failed":
      return { ...state, loading: false, error: action.message };

    case "targetReached": {
      if (!state.puzzle) return state;
      const target = state.puzzle.targets[state.stageIndex];
      if (!target) return state;

      const completion: StageCompletion = {
        target,
        at: action.at,
        trailIndex: state.trail.length - 1,
        moves: state.moves,
      };
      const completedStages = [...state.completedStages, completion];
      const finalStage = state.stageIndex === state.puzzle.targets.length - 1;

      return finalStage
        ? {
            ...state,
            completedStages,
            status: "won",
            finishedAt: action.at,
          }
        : {
            ...state,
            completedStages,
            stageIndex: state.stageIndex + 1,
            stageStarts: [...state.stageStarts, state.trail.length - 1],
          };
    }

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
    (puzzle: Puzzle, reveal: boolean) => {
      dispatch({ type: "begin", puzzle, reveal });
      void navigate(puzzle.start, "first");
    },
    [navigate],
  );

  const restart = useCallback(() => dispatch({ type: "restart" }), []);

  const revealElapsed = useCallback(
    () => dispatch({ type: "revealElapsed" }),
    [],
  );

  const go = useCallback(
    (title: string) => {
      if (state.status !== "playing") return;
      void navigate(title, "forward");
    },
    [navigate, state.status],
  );

  /**
   * Return to a page already on the trail.
   *
   * The reducer truncates the trail back to whatever page it lands on, so
   * jumping to index 2 of a five-page trail drops the last two entries and the
   * route stays an accurate record of how the run actually went. This replaces
   * a back button: stepping back one page is just jumping to the previous
   * index, and the trail was already on screen.
   */
  const jumpTo = useCallback(
    (index: number) => {
      if (state.status !== "playing") return;
      const entry = state.trail[index];
      const stageStart = state.stageStarts[state.stageStarts.length - 1] ?? 0;
      if (!entry || index < stageStart || index === state.trail.length - 1) {
        return;
      }
      void navigate(entry.title, "back");
    },
    [navigate, state.stageStarts, state.status, state.trail],
  );

  const back = useCallback(() => {
    if (state.status !== "playing" || state.trail.length < 2) return;
    const stageStart = state.stageStarts[state.stageStarts.length - 1] ?? 0;
    if (state.trail.length - 1 <= stageStart) return;
    void navigate(state.trail[state.trail.length - 2].title, "back");
  }, [navigate, state.stageStarts, state.status, state.trail]);

  const giveUp = useCallback(() => dispatch({ type: "abandon" }), []);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  /**
   * Win detection lives here rather than in the reducer because it depends on
   * the *resolved* article title. A player who clicks "USA" must win on
   * "United States", and only the server knows the redirect resolved that way.
   */
  useEffect(() => {
    if (state.status !== "playing" || !state.puzzle || !state.article) return;
    const target = state.puzzle.targets[state.stageIndex];
    if (!target || !titlesMatch(state.article.title, target)) return;
    dispatch({ type: "targetReached", at: Date.now() });
  }, [state.article, state.puzzle, state.stageIndex, state.status]);

  return {
    state,
    begin,
    restart,
    go,
    back,
    jumpTo,
    revealElapsed,
    giveUp,
    reset,
  };
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

/** Gather a finished run into the shape the results screen reads. */
export function buildRunRecord(state: {
  puzzle: Puzzle;
  trail: TrailEntry[];
  moves: number;
  completedStages: StageCompletion[];
  startedAt: number;
  finishedAt: number;
}): RunRecord {
  let previousTrailIndex = 0;
  let previousAt = state.startedAt;
  let previousMoves = 0;
  const stages = state.completedStages.map((completion, index) => {
    const stage = {
      start:
        state.trail[previousTrailIndex]?.title ??
        (index === 0
          ? state.puzzle.start
          : state.completedStages[index - 1].target),
      target: completion.target,
      trail: state.trail
        .slice(previousTrailIndex, completion.trailIndex + 1)
        .map((entry) => entry.title),
      clicks: completion.moves - previousMoves,
      elapsedMs: completion.at - previousAt,
    };

    previousTrailIndex = completion.trailIndex;
    previousAt = completion.at;
    previousMoves = completion.moves;
    return stage;
  });
  const finalTarget = state.puzzle.targets[state.puzzle.targets.length - 1];

  const record: RunRecord = {
    id: `${state.puzzle.start}|${state.puzzle.targets.join("|")}|${state.finishedAt}`,
    start: state.puzzle.start,
    target: finalTarget,
    targets: state.puzzle.targets,
    difficulty: state.puzzle.difficulty,
    stages,
    trail: state.trail.map((entry) => entry.title),
    clicks: state.moves,
    elapsedMs: state.finishedAt - state.startedAt,
    finishedAt: state.finishedAt,
  };

  return record;
}
