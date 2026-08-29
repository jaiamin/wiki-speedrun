import { describe, expect, it } from "vitest";
import {
  BACKDROP_NODES,
  BACKDROP_TERM_COUNT,
  BACKDROP_WORD_GAP,
  placeBackdropWords,
} from "./backdrop-layout";

describe("backdrop layout", () => {
  it("has a node for every term it asks for", () => {
    expect(BACKDROP_NODES).toHaveLength(BACKDROP_TERM_COUNT);
  });

  it("keeps every word readable", () => {
    for (const node of BACKDROP_NODES) {
      expect(node.size).toBeGreaterThanOrEqual(0.72);
    }
  });

  it("mixes small words with subtle angled words", () => {
    expect(BACKDROP_NODES.filter((node) => node.size < 1.1).length).toBeGreaterThan(
      BACKDROP_TERM_COUNT / 2,
    );
    expect(BACKDROP_NODES.some((node) => node.tilt !== 0)).toBe(true);
    expect(BACKDROP_NODES.some((node) => node.tilt === 0)).toBe(true);
    expect(BACKDROP_NODES.every((node) => Math.abs(node.tilt) <= 6.5)).toBe(
      true,
    );
  });

  it("places visible words without collisions", () => {
    const viewportWidth = 1440;
    const viewportHeight = 900;
    const items = BACKDROP_NODES.map((_, index) => ({
      index,
      width: 60 + (index % 9) * 13,
      height: 22 + (index % 3) * 4,
    }));
    const positions = placeBackdropWords(
      items,
      viewportWidth,
      viewportHeight,
    );
    const placed = positions.flatMap((position, index) => {
      if (!position) return [];
      const item = items[index];
      return [
        {
          left: Math.max(0, position.left - item.width / 2),
          top: Math.max(0, position.top - item.height / 2),
          right: Math.min(viewportWidth, position.left + item.width / 2),
          bottom: Math.min(viewportHeight, position.top + item.height / 2),
        },
      ];
    });

    expect(placed.length).toBeGreaterThan(40);
    for (let first = 0; first < placed.length; first += 1) {
      for (let second = first + 1; second < placed.length; second += 1) {
        const a = placed[first];
        const b = placed[second];
        const separated =
          a.right + BACKDROP_WORD_GAP <= b.left ||
          b.right + BACKDROP_WORD_GAP <= a.left ||
          a.bottom + BACKDROP_WORD_GAP <= b.top ||
          b.bottom + BACKDROP_WORD_GAP <= a.top;
        expect(separated).toBe(true);
      }
    }
  });
});
