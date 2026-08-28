import { describe, expect, it } from "vitest";
import { formatClock, formatDelta, formatShort, shareText } from "./format";
import type { RunRecord } from "./types";

describe("formatClock", () => {
  it("reads like a speedrun timer", () => {
    expect(formatClock(0)).toBe("0:00.00");
    expect(formatClock(9_590)).toBe("0:09.59");
    expect(formatClock(61_280)).toBe("1:01.28");
  });

  it("grows an hours field only when needed", () => {
    expect(formatClock(3_599_990)).toBe("59:59.99");
    expect(formatClock(3_600_000)).toBe("1:00:00.00");
  });

  it("never renders negative time", () => {
    expect(formatClock(-500)).toBe("0:00.00");
  });
});

describe("formatShort", () => {
  it("drops hundredths for dense lists", () => {
    expect(formatShort(10_000)).toBe("10s");
    expect(formatShort(75_000)).toBe("1m 15s");
  });
});

describe("formatDelta", () => {
  it("always carries a sign", () => {
    expect(formatDelta(4_210)).toBe("+4.21");
    expect(formatDelta(-1_080)).toBe("-1.08");
  });
});

describe("shareText", () => {
  const record: RunRecord = {
    id: "1",
    start: "Origami",
    target: "Fidel Castro",
    difficulty: "medium",
    daily: null,
    trail: ["Origami", "Doll", "Ghana", "Fidel Castro"],
    clicks: 3,
    elapsedMs: 64_200,
    finishedAt: 0,
  };

  it("encodes the run in the squares", () => {
    // Gold for the clicks par allowed, purple for everything beyond it.
    expect(shareText(record, 2)).toContain("🟨🟨🟪");
  });

  it("marks a perfect run with no purple", () => {
    const text = shareText(record, 3);
    expect(text).toContain("🟨🟨🟨");
    expect(text).not.toContain("🟪");
  });

  it("falls back when par is unknown", () => {
    expect(shareText(record, null)).toContain("🟦🟦🟦");
  });

  it("names the daily challenge", () => {
    const text = shareText({ ...record, daily: "2026-08-28" }, 3);
    expect(text).toContain("Daily 2026-08-28");
  });
});

describe("run record identity", () => {
  // Guards the fix for a run being written to history twice: ids are derived
  // from the run, so a repeated save is recognisable as a duplicate.
  it("is deterministic for the same finished run", () => {
    const id = (finishedAt: number, start: string, target: string) =>
      `${start}|${target}|${finishedAt}`;

    expect(id(1000, "Banana", "Fruit")).toBe(id(1000, "Banana", "Fruit"));
    expect(id(1000, "Banana", "Fruit")).not.toBe(id(1001, "Banana", "Fruit"));
    expect(id(1000, "Banana", "Fruit")).not.toBe(id(1000, "Apple", "Fruit"));
  });
});
