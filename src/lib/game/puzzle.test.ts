import { describe, expect, it } from "vitest";
import { generatePuzzle } from "./puzzle";
import { hashSeed, mulberry32 } from "./random";

describe("generatePuzzle", () => {
  it("never pairs an article with itself", () => {
    for (let i = 0; i < 200; i += 1) {
      const puzzle = generatePuzzle("hard");
      expect(puzzle.start).not.toBe(puzzle.targets[0]);
    }
  });

  it("avoids pairings where one title contains the other", () => {
    // "France" -> "History of France" is technically a run, but a boring one.
    for (let i = 0; i < 200; i += 1) {
      const { start, targets } = generatePuzzle("medium");
      const target = targets[0];
      expect(start.includes(target)).toBe(false);
      expect(target.includes(start)).toBe(false);
    }
  });

  it("builds distinct checkpoint chains", () => {
    const puzzle = generatePuzzle("hard", "chain-seed", 5);
    const chain = [puzzle.start, ...puzzle.targets];

    expect(puzzle.targets).toHaveLength(5);
    expect(new Set(chain).size).toBe(chain.length);
  });

  it("is deterministic when seeded", () => {
    const a = generatePuzzle("medium", "seed-one");
    const b = generatePuzzle("medium", "seed-one");
    const c = generatePuzzle("medium", "seed-two");

    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe("mulberry32", () => {
  it("produces a repeatable sequence for a seed", () => {
    const a = mulberry32(hashSeed("x"));
    const b = mulberry32(hashSeed("x"));
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("stays within [0, 1)", () => {
    const random = mulberry32(12345);
    for (let i = 0; i < 1000; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("chaos endpoint filtering", () => {
  // Mirrors the pattern in puzzle.ts; kept as a behavioural spec of which
  // titles must never be handed out as a start or target.
  const LOW_QUALITY_ENDPOINT =
    /^(list|lists|index|outline|glossary|timeline|bibliography) of\b|^\d{1,4}(s| BC)?$|\(disambiguation\)$/i;

  it("rejects navigational pages", () => {
    for (const title of [
      "Index of Windows games (E)",
      "List of Japanese films of 1999",
      "Outline of chemistry",
      "Timeline of the far future",
      "Mercury (disambiguation)",
      "1994",
      "1990s",
      "480 BC",
    ]) {
      expect(LOW_QUALITY_ENDPOINT.test(title)).toBe(true);
    }
  });

  it("keeps real articles", () => {
    for (const title of [
      "Banana",
      "Fidel Castro",
      "Listeria",
      "Indexing",
      "Outlander",
      "Glossolalia",
    ]) {
      expect(LOW_QUALITY_ENDPOINT.test(title)).toBe(false);
    }
  });
});
