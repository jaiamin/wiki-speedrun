"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Article } from "@/lib/wiki/article";
import { toArticle } from "@/lib/wiki/article-payload";
import { titlesMatch } from "@/lib/wiki/titles";
import type { Puzzle, RunRecord, RunStatus } from "./types";

/** One page on the route, with the moment it was reached. */
export interface TrailEntry {
  title: string;
  /** Epoch ms the article finished loading — the segment's split time. */
  at: number;
}

/**
 * One page in the path graph.
 *
 * The graph is append-only: backtracking moves a cursor rather than deleting
 * anything, so a branch you abandoned stays on the map and can be returned to.
 * That is the whole difference between a trail and a path — a trail is where
 * you are, a path is everywhere you have been and how those places connect.
 */
export interface PathNode {
  id: number;
  title: string;
  /** Null only for the page the run started on. */
  parentId: number | null;
  at: number;
  /** The stage being pursued when this page was reached. */
  stage: number;
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
  /**
   * The current route: the chain of pages from the start to where you are.
   * Derived from `path` on every move, so the two can never disagree.
   */
  trail: TrailEntry[];
  /** Every page visited, including abandoned branches. Never shrinks. */
  path: PathNode[];
  currentNodeId: number;
  nextNodeId: number;
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
  | {
      type: "loaded";
      article: Article;
      mode: "forward" | "back" | "first";
      /** Set when returning to a specific node, including on another branch. */
      nodeId?: number;
    }
  | { type: "revealElapsed" }
  | { type: "failed"; message: string }
  | { type: "targetReached"; at: number }
  | { type: "abandon" }
  | { type: "reset" };

const initialState: RunState = {
  puzzle: null,
  status: "idle",
  trail: [],
  path: [],
  currentNodeId: 0,
  nextNodeId: 1,
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

/** Walk from a node up to the root, oldest first. */
function chainTo(path: PathNode[], id: number): PathNode[] {
  const byId = new Map(path.map((node) => [node.id, node]));
  const chain: PathNode[] = [];

  let cursor = byId.get(id);
  while (cursor) {
    chain.unshift(cursor);
    cursor = cursor.parentId === null ? undefined : byId.get(cursor.parentId);
  }

  return chain;
}

const asTrail = (nodes: PathNode[]): TrailEntry[] =>
  nodes.map((node) => ({ title: node.title, at: node.at }));

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
    path: [
      {
        id: 0,
        title: article.title,
        parentId: null,
        at: now,
        stage: 0,
      },
    ],
    currentNodeId: 0,
    nextNodeId: 1,
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
      const { article, mode, nodeId } = action;
      const now = Date.now();

      if (mode === "first" && state.status === "revealing") {
        return state.revealElapsed
          ? beginPlaying(state, article, now)
          : { ...state, pending: article, loading: false, error: null };
      }

      /*
       * Work out which node this landing corresponds to. In order:
       *
       *   1. An explicit node — the player clicked a page on the graph, which
       *      may sit on a branch they walked away from.
       *   2. A page already behind them on this stage's route, which is a
       *      backtrack: move the cursor up rather than adding a duplicate.
       *   3. A branch off the current page they have taken before, which is
       *      re-entering it — reuse that node so the graph does not sprout a
       *      second identical child every time.
       *   4. Anything else is new ground.
       */
      let path = state.path;
      let nextNodeId = state.nextNodeId;
      let currentNodeId: number;

      const explicit =
        nodeId === undefined
          ? undefined
          : path.find((node) => node.id === nodeId);

      const ancestor = chainTo(path, state.currentNodeId).find(
        (node) =>
          node.stage === state.stageIndex &&
          titlesMatch(node.title, article.title),
      );

      const revisitedChild = path.find(
        (node) =>
          node.parentId === state.currentNodeId &&
          titlesMatch(node.title, article.title),
      );

      if (explicit) {
        currentNodeId = explicit.id;
      } else if (ancestor) {
        currentNodeId = ancestor.id;
      } else if (revisitedChild) {
        currentNodeId = revisitedChild.id;
      } else {
        currentNodeId = nextNodeId;
        path = [
          ...path,
          {
            id: nextNodeId,
            title: article.title,
            parentId: state.currentNodeId,
            at: now,
            stage: state.stageIndex,
          },
        ];
        nextNodeId += 1;
      }

      return {
        ...state,
        article,
        path,
        currentNodeId,
        nextNodeId,
        trail: asTrail(chainTo(path, currentNodeId)),
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
  // The payload crosses a cache, so its shape is not guaranteed to match this
  // build's expectations — normalise before anything downstream reads it.
  return toArticle(await response.json(), title);
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
    async (
      title: string,
      mode: "forward" | "back" | "first",
      nodeId?: number,
    ) => {
      const id = ++requestId.current;
      dispatch({ type: "loading" });

      try {
        const article = await fetchArticle(title);
        if (id !== requestId.current) return;

        dispatch({ type: "loaded", article, mode, nodeId });
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
   * Return to any page on the graph, including one on a branch that was walked
   * away from.
   *
   * Jumping never erases anything — it moves the cursor, and the route is
   * re-derived from wherever it lands. Confined to the current stage: pages
   * from a checkpoint you already cleared are history, not somewhere to go
   * back to.
   */
  const jumpToNode = useCallback(
    (nodeId: number) => {
      if (state.status !== "playing") return;

      const node = state.path.find((entry) => entry.id === nodeId);
      if (!node || node.id === state.currentNodeId) return;
      if (node.stage !== state.stageIndex) return;

      void navigate(node.title, "back", node.id);
    },
    [
      navigate,
      state.currentNodeId,
      state.path,
      state.stageIndex,
      state.status,
    ],
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
    jumpToNode,
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
