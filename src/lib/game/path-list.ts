import type { PathNode } from "./use-run";

export interface PathRow {
  node: PathNode;
  /** Steps from the start along this node's branch. */
  depth: number;
  /** How far to indent: one level per fork above this node. */
  indent: number;
  /**
   * True when this page is the head of a branch — its parent split here — as
   * opposed to a continuation of the branch it sits in.
   */
  branchStart: boolean;
  /** True when this node lies on the route to wherever you are standing. */
  onRoute: boolean;
  /** True when nothing follows this node — the tip of a branch. */
  leaf: boolean;
}

/**
 * Flatten the path graph into rows, in the order they were first explored.
 *
 * Pages on the same run of the path stack vertically; a fork indents its
 * children, and each branch then stacks at its own level.
 *
 * Indentation therefore counts forks above a page, not generations. A run that
 * never branches — which is most of them — stays entirely flat however long it
 * gets, because indenting a straight line implies branching that is not there.
 *
 * That alone is ambiguous, and the ambiguity is the whole reason `branchStart`
 * exists: a branch that continues straight keeps its indent, so a page and its
 * parent's siblings land at the same offset. Marking which rows *begin* a
 * branch separates the two — everything else at that indent is a continuation
 * of the branch above it.
 *
 * Children are walked in id order, which is the order they were first visited,
 * so the list never reshuffles under the player as the run grows.
 */
export function flattenPath(
  path: PathNode[],
  currentNodeId: number,
): PathRow[] {
  if (path.length === 0) return [];

  const byId = new Map(path.map((node) => [node.id, node]));
  const children = new Map<number, PathNode[]>();
  const roots: PathNode[] = [];

  for (const node of [...path].sort((a, b) => a.id - b.id)) {
    if (node.parentId === null || !byId.has(node.parentId)) {
      roots.push(node);
      continue;
    }
    children.set(node.parentId, [
      ...(children.get(node.parentId) ?? []),
      node,
    ]);
  }

  // The route to where you are standing, so those rows can be picked out.
  const onRoute = new Set<number>();
  let cursor = byId.get(currentNodeId);
  while (cursor) {
    onRoute.add(cursor.id);
    cursor = cursor.parentId === null ? undefined : byId.get(cursor.parentId);
  }

  const rows: PathRow[] = [];

  const walk = (
    node: PathNode,
    depth: number,
    indent: number,
    branchStart: boolean,
  ) => {
    const kids = children.get(node.id) ?? [];

    rows.push({
      node,
      depth,
      indent,
      branchStart,
      onRoute: onRoute.has(node.id),
      leaf: kids.length === 0,
    });

    // A fork pushes its children in by one and marks each of them as a head.
    // A single child is the same run of the path, so it stays put.
    const forks = kids.length > 1;
    for (const kid of kids) {
      walk(kid, depth + 1, forks ? indent + 1 : indent, forks);
    }
  };

  for (const root of roots) walk(root, 0, 0, false);

  return rows;
}
