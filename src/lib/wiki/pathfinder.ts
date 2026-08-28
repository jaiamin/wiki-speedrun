import {
  RequestBudget,
  incomingLinks,
  linksAmong,
  outgoingLinks,
} from "./graph";
import { normalizeTitle } from "./titles";

export interface PathResult {
  /** Full route including both endpoints, or null if none was found. */
  path: string[] | null;
  /** Clicks required — one less than the number of pages in the path. */
  clicks: number | null;
  /**
   * True when this is provably the shortest route, not merely the shortest
   * one found. See `findShortestPath` for why a depth-3 hit can still be
   * proven optimal.
   */
  optimal: boolean;
  /** Deepest level the search actually completed. */
  searchedDepth: number;
  requests: number;
}

export interface PathOptions {
  /** Hard ceiling on Wikimedia requests for this search. */
  maxRequests?: number;
  /** Stop collecting inbound links to the target past this many. */
  inboundCap?: number;
  /** How many level-1 pages to expand when reaching for a depth-3 route. */
  expandWidth?: number;
  /** How many of the target's inbound pages to consider as waypoints. */
  candidateWidth?: number;
}

/**
 * Pages that are technically valid waypoints but make for miserable routes:
 * bare years, list and index pages, and disambiguation stubs. They are still
 * legal to click — this only keeps them from being *recommended*.
 */
const LOW_QUALITY = /^(list of|lists of|index of|outline of|glossary of|timeline of)\b|^\d{1,4}(s| BC)?$|\(disambiguation\)$/i;

function isLowQuality(title: string): boolean {
  return LOW_QUALITY.test(title);
}

/**
 * Rank candidate waypoints so the route we surface is one a human would
 * actually enjoy finding.
 *
 * Short titles are a cheap and surprisingly good proxy for hub-ness on
 * Wikipedia: "France", "Music", and "World War II" are all short and all
 * enormously well connected, whereas long titles skew toward narrow stubs.
 * Using it avoids spending requests just to measure degree.
 */
function byHubLikelihood(a: string, b: string): number {
  const penalty = (t: string) => (isLowQuality(t) ? 1000 : 0) + t.length;
  return penalty(a) - penalty(b);
}

/**
 * Bidirectional breadth-first search over Wikipedia's live link graph.
 *
 * Searching from both ends is what makes this tractable: the frontier at depth
 * d grows roughly like b^d, so two searches of depth d/2 cost dramatically
 * less than one of depth d.
 *
 * The optimality guarantee is worth stating precisely. Level 1 is expanded
 * exhaustively in both directions — every page the start links to, and every
 * page that links to the target. If those two sets are complete and do not
 * intersect, then no route of two clicks or fewer can exist, so *any* route of
 * three clicks we subsequently find is genuinely shortest. That is why
 * `optimal` depends on whether level 1 completed, not on how the depth-3 hit
 * was discovered.
 *
 * When a cap truncates level 1 (targets like "United States" have hundreds of
 * thousands of inbound links), the search still returns a working route — it
 * just reports `optimal: false` rather than overclaiming.
 */
export async function findShortestPath(
  rawStart: string,
  rawTarget: string,
  options: PathOptions = {},
): Promise<PathResult> {
  const {
    maxRequests = 60,
    inboundCap = 20_000,
    expandWidth = 250,
    candidateWidth = 150,
  } = options;

  const start = normalizeTitle(rawStart);
  const target = normalizeTitle(rawTarget);
  const budget = new RequestBudget(maxRequests);

  const done = (
    path: string[] | null,
    optimal: boolean,
    depth: number,
  ): PathResult => ({
    path,
    clicks: path ? path.length - 1 : null,
    optimal,
    searchedDepth: depth,
    requests: budget.spent,
  });

  if (start === target) return done([start], true, 0);

  // Level 1 forward: everything one click from the start.
  const forward = await outgoingLinks(start, budget);
  const forwardSet = new Set(forward.titles);
  if (forwardSet.has(target)) return done([start, target], true, 1);

  // Level 1 backward: everything one click from the target.
  const backward = await incomingLinks(target, budget, inboundCap);
  const backwardSet = new Set(backward.titles);

  const levelOneComplete = forward.complete && backward.complete;

  // Two clicks: a single page the start links to that also links to the target.
  const meeting = [...forwardSet]
    .filter((title) => backwardSet.has(title))
    .sort(byHubLikelihood);

  if (meeting.length > 0) {
    return done([start, meeting[0], target], forward.complete, 2);
  }

  // Three clicks: find an edge from something the start reaches into something
  // that reaches the target. Rather than downloading both frontiers in full,
  // `linksAmong` asks MediaWiki which of these specific edges exist.
  const sources = [...forwardSet].sort(byHubLikelihood).slice(0, expandWidth);
  const candidates = [...backwardSet]
    .sort(byHubLikelihood)
    .slice(0, candidateWidth);

  const edges = await linksAmong(sources, candidates, budget);

  let best: { first: string; second: string } | null = null;

  for (const first of sources) {
    for (const second of edges.get(first) ?? []) {
      if (best && byHubLikelihood(second, best.second) >= 0) continue;
      best = { first, second };
    }
  }

  if (best) {
    return done([start, best.first, best.second, target], levelOneComplete, 3);
  }

  return done(null, false, 3);
}

/**
 * The single next click that makes progress, without revealing the whole
 * route. Returns null when no route is known within budget.
 */
export async function findNextStep(
  current: string,
  target: string,
  options?: PathOptions,
): Promise<{ next: string | null; remaining: number | null }> {
  const result = await findShortestPath(current, target, options);
  if (!result.path || result.path.length < 2) {
    return { next: null, remaining: null };
  }
  return { next: result.path[1], remaining: result.clicks };
}
