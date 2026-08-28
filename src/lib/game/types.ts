export const DIFFICULTIES = ["easy", "medium", "hard", "chaos"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface DifficultyMeta {
  id: Difficulty;
  label: string;
  blurb: string;
}

export const DIFFICULTY_META: Record<Difficulty, DifficultyMeta> = {
  easy: {
    id: "easy",
    label: "Warm-up",
    blurb: "Two household-name articles. Short routes, forgiving.",
  },
  medium: {
    id: "medium",
    label: "Standard",
    blurb: "One famous endpoint, one deeper cut. The default run.",
  },
  hard: {
    id: "hard",
    label: "Deep cut",
    blurb: "Both endpoints off the beaten path. Expect to think.",
  },
  chaos: {
    id: "chaos",
    label: "Chaos",
    blurb: "Anything on Wikipedia. May be brutal. May be unwinnable.",
  },
};

export interface Puzzle {
  start: string;
  target: string;
  difficulty: Difficulty;
  /** Set for daily challenges: the ISO date the puzzle belongs to. */
  daily: string | null;
}

export type RunStatus = "idle" | "playing" | "won" | "abandoned";

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

/** A finished run, as persisted for the local history / leaderboard. */
export interface RunRecord {
  id: string;
  start: string;
  target: string;
  difficulty: Difficulty;
  daily: string | null;
  trail: string[];
  clicks: number;
  elapsedMs: number;
  finishedAt: number;
}
