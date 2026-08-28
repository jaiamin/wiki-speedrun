/**
 * @vitest-environment jsdom
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  clearRuns,
  loadRuns,
  personalBest,
  saveRun,
  summarizePairings,
} from "./storage";
import type { RunRecord } from "./types";

/**
 * This jsdom build does not provide `window.localStorage`, so the test
 * installs a minimal one. That is the right level to stub at: these tests are
 * about the dedupe and personal-best logic, not about anyone's Storage
 * implementation.
 */
beforeAll(() => {
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    },
  });
});

function run(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: "Banana|Fruit|1000",
    start: "Banana",
    target: "Fruit",
    difficulty: "medium",
    daily: null,
    trail: ["Banana", "Fruit"],
    clicks: 1,
    elapsedMs: 7130,
    finishedAt: 1000,
    completed: true,
    ...overrides,
  };
}

describe("saveRun", () => {
  beforeEach(() => clearRuns());

  it("stores a finished run", () => {
    saveRun(run());
    expect(loadRuns()).toHaveLength(1);
  });

  it("ignores a run it has already stored", () => {
    // React can invoke the saving effect more than once for one finished run;
    // the history must not grow a duplicate row when it does.
    saveRun(run());
    saveRun(run());
    saveRun(run());
    expect(loadRuns()).toHaveLength(1);
  });

  it("keeps genuinely different runs", () => {
    saveRun(run());
    saveRun(run({ id: "Banana|Fruit|2000", finishedAt: 2000, elapsedMs: 9000 }));
    expect(loadRuns()).toHaveLength(2);
  });
});

describe("personalBest", () => {
  beforeEach(() => clearRuns());

  it("returns the fastest run for a pairing", () => {
    saveRun(run({ id: "a", finishedAt: 1, elapsedMs: 9000 }));
    saveRun(run({ id: "b", finishedAt: 2, elapsedMs: 4000 }));
    saveRun(run({ id: "c", finishedAt: 3, elapsedMs: 6000 }));

    expect(personalBest("Banana", "Fruit")?.elapsedMs).toBe(4000);
  });

  it("ignores other pairings", () => {
    saveRun(run({ id: "a", start: "Apple", elapsedMs: 100 }));
    expect(personalBest("Banana", "Fruit")).toBeNull();
  });

  it("ignores abandoned runs", () => {
    // An abandoned run has a duration but was never finished, so it can never
    // be anyone's best time.
    saveRun(run({ id: "a", elapsedMs: 100, completed: false }));
    saveRun(run({ id: "b", finishedAt: 2, elapsedMs: 8000 }));

    expect(personalBest("Banana", "Fruit")?.elapsedMs).toBe(8000);
  });
});

describe("summarizePairings", () => {
  it("collapses repeated attempts into one row per pairing", () => {
    const summaries = summarizePairings([
      run({ id: "a", finishedAt: 3, elapsedMs: 5000 }),
      run({ id: "b", finishedAt: 2, elapsedMs: 9000 }),
      run({ id: "c", finishedAt: 1, elapsedMs: 7000 }),
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0].attempts).toBe(3);
    expect(summaries[0].best?.elapsedMs).toBe(5000);
  });

  it("marks a pairing unbeaten when every attempt was abandoned", () => {
    const summaries = summarizePairings([
      run({ id: "a", completed: false }),
      run({ id: "b", finishedAt: 2, completed: false }),
    ]);

    expect(summaries[0].best).toBeNull();
    expect(summaries[0].attempts).toBe(2);
  });

  it("takes the best from wins only, ignoring faster abandoned runs", () => {
    const summaries = summarizePairings([
      run({ id: "a", elapsedMs: 500, completed: false }),
      run({ id: "b", finishedAt: 2, elapsedMs: 6000 }),
    ]);

    expect(summaries[0].best?.elapsedMs).toBe(6000);
  });

  it("orders pairings by most recent attempt", () => {
    const summaries = summarizePairings([
      run({ id: "a", start: "Old", finishedAt: 10 }),
      run({ id: "b", start: "New", finishedAt: 99 }),
    ]);

    expect(summaries.map((s) => s.start)).toEqual(["New", "Old"]);
  });
});
