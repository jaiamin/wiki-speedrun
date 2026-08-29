import { describe, expect, it } from "vitest";
import { flattenPath } from "./path-list";
import type { PathNode } from "./use-run";

const node = (
  id: number,
  parentId: number | null,
  title = `n${id}`,
): PathNode => ({ id, title, parentId, at: id * 1000, stage: 0 });

describe("flattenPath", () => {
  it("handles an empty path", () => {
    expect(flattenPath([], 0)).toEqual([]);
  });

  it("keeps a straight run flat, however long", () => {
    // The common case: one line from source to target. Indenting it would
    // imply branching that never happened.
    const chain = Array.from({ length: 15 }, (_, i) =>
      node(i, i === 0 ? null : i - 1),
    );
    const rows = flattenPath(chain, 14);

    expect(rows.every((row) => row.indent === 0)).toBe(true);
    expect(rows.every((row) => row.branchStart === false)).toBe(true);
  });

  it("indents the children of a fork", () => {
    const rows = flattenPath([node(0, null), node(1, 0), node(2, 0)], 1);
    const at = (id: number) => rows.find((r) => r.node.id === id)!;

    expect(at(0).indent).toBe(0);
    expect(at(1).indent).toBe(1);
    expect(at(2).indent).toBe(1);
  });

  it("keeps a branch stacked at its own level once it stops forking", () => {
    // 0 forks to 1 and 3; 1 → 2 is the same run of the path, so 2 stays at 1's
    // indent rather than stepping again.
    const rows = flattenPath(
      [node(0, null), node(1, 0), node(2, 1), node(3, 0)],
      2,
    );
    const at = (id: number) => rows.find((r) => r.node.id === id)!;

    expect([at(1).indent, at(2).indent, at(3).indent]).toEqual([1, 1, 1]);
  });

  it("distinguishes a branch head from a continuation at the same indent", () => {
    // 2 and 3 both sit at indent 1. Only the elbow says that 3 begins a new
    // branch from 0 while 2 merely continues 1's.
    const rows = flattenPath(
      [node(0, null), node(1, 0), node(2, 1), node(3, 0)],
      2,
    );
    const at = (id: number) => rows.find((r) => r.node.id === id)!;

    expect(at(1).branchStart).toBe(true);
    expect(at(3).branchStart).toBe(true);
    expect(at(2).branchStart).toBe(false);
  });

  it("nests a fork inside a branch one level deeper", () => {
    // 0 forks to 1 and 4; 1 then forks to 2 and 3.
    const rows = flattenPath(
      [node(0, null), node(1, 0), node(2, 1), node(3, 1), node(4, 0)],
      2,
    );
    const at = (id: number) => rows.find((r) => r.node.id === id)!;

    expect(at(1).indent).toBe(1);
    expect([at(2).indent, at(3).indent]).toEqual([2, 2]);
    expect(at(4).indent).toBe(1);
  });

  it("marks the route to the current node", () => {
    const rows = flattenPath(
      [node(0, null), node(1, 0), node(2, 1), node(3, 0)],
      2,
    );

    expect(rows.filter((r) => r.onRoute).map((r) => r.node.id).sort()).toEqual([
      0, 1, 2,
    ]);
  });

  it("keeps an abandoned branch listed", () => {
    const rows = flattenPath(
      [node(0, null), node(1, 0), node(2, 1), node(3, 0)],
      3,
    );

    expect(rows).toHaveLength(4);
    expect(rows.find((r) => r.node.id === 2)!.onRoute).toBe(false);
  });

  it("lists branches in the order they were first visited", () => {
    const rows = flattenPath([node(0, null), node(1, 0), node(2, 0)], 1);
    expect(rows.map((r) => r.node.id)).toEqual([0, 1, 2]);
  });

  it("flags the tip of each branch", () => {
    const rows = flattenPath([node(0, null), node(1, 0), node(2, 0)], 1);
    const at = (id: number) => rows.find((r) => r.node.id === id)!;

    expect(at(0).leaf).toBe(false);
    expect(at(1).leaf).toBe(true);
  });

  it("survives a node whose parent is missing", () => {
    expect(() => flattenPath([node(1, 99)], 1)).not.toThrow();
  });
});
