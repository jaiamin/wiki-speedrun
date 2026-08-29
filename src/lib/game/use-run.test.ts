import { describe, expect, it } from "vitest";
import { buildRunRecord } from "./use-run";

describe("buildRunRecord", () => {
  it("builds continuous stage splits for a checkpoint chain", () => {
    const record = buildRunRecord({
      puzzle: {
        start: "Alpha",
        targets: ["Bravo", "Charlie", "Delta"],
        difficulty: "medium",
      },
      trail: [
        { title: "Alpha", at: 1_000 },
        { title: "Bridge one", at: 2_000 },
        { title: "Bravo", at: 3_000 },
        { title: "Bridge two", at: 4_000 },
        { title: "Charlie", at: 5_000 },
        { title: "Bridge three", at: 6_000 },
        { title: "Delta", at: 8_000 },
      ],
      moves: 6,
      completedStages: [
        { target: "Bravo", at: 3_000, trailIndex: 2, moves: 2 },
        { target: "Charlie", at: 5_000, trailIndex: 4, moves: 4 },
        { target: "Delta", at: 8_000, trailIndex: 6, moves: 6 },
      ],
      startedAt: 1_000,
      finishedAt: 8_000,
    });

    expect(record.targets).toEqual(["Bravo", "Charlie", "Delta"]);
    expect(record.clicks).toBe(6);
    expect(record.elapsedMs).toBe(7_000);
    expect(record.stages).toEqual([
      {
        start: "Alpha",
        target: "Bravo",
        trail: ["Alpha", "Bridge one", "Bravo"],
        clicks: 2,
        elapsedMs: 2_000,
      },
      {
        start: "Bravo",
        target: "Charlie",
        trail: ["Bravo", "Bridge two", "Charlie"],
        clicks: 2,
        elapsedMs: 2_000,
      },
      {
        start: "Charlie",
        target: "Delta",
        trail: ["Charlie", "Bridge three", "Delta"],
        clicks: 2,
        elapsedMs: 3_000,
      },
    ]);
  });
});
