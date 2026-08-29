export const DIFFICULTIES = ["easy", "medium", "hard", "chaos"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const RUN_LENGTHS = [1, 3, 5] as const;
export type RunLength = (typeof RUN_LENGTHS)[number];

export interface DifficultyMeta {
  id: Difficulty;
  label: string;
  blurb: string;
}

export const DIFFICULTY_META: Record<Difficulty, DifficultyMeta> = {
  easy: {
    id: "easy",
    label: "Easy",
    blurb: "Familiar articles with shorter routes.",
  },
  medium: {
    id: "medium",
    label: "Normal",
    blurb: "A balanced route. The default challenge.",
  },
  hard: {
    id: "hard",
    label: "Hard",
    blurb: "Less familiar articles with tougher paths.",
  },
  chaos: {
    id: "chaos",
    label: "Chaos",
    blurb: "Anything goes. Some routes may be brutal.",
  },
};

export interface Puzzle {
  start: string;
  /** Ordered checkpoints. Reaching one starts the next stage. */
  targets: string[];
  difficulty: Difficulty;
}

/**
 * `revealing` is the beat between choosing a run and playing it: the pairing is
 * on screen, the article is loading behind it, and the clock has not started.
 */
export type RunStatus =
  | "idle"
  | "revealing"
  | "playing"
  | "won"
  | "abandoned";

export interface RunState {
  id: string;
  puzzle: Puzzle;
  /** Every page visited, in order, starting with the start article. */
  trail: string[];
  status: RunStatus;
  /** Epoch ms when the clock started, or null before the first render. */
  startedAt: number | null;
  finishedAt: number | null;
}

/** A finished run, as handed to the results screen. */
export interface RunRecord {
  id: string;
  start: string;
  /** The last checkpoint, kept for the single-run summary. */
  target: string;
  targets: string[];
  difficulty: Difficulty;
  stages: RunStageRecord[];
  trail: string[];
  clicks: number;
  elapsedMs: number;
  finishedAt: number;
}

export interface RunStageRecord {
  start: string;
  target: string;
  trail: string[];
  clicks: number;
  elapsedMs: number;
}
