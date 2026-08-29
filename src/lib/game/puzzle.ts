import pools from "@/data/pools.json";
import { wikiApi } from "@/lib/wiki/client";
import { RequestBudget, outgoingLinksBatch } from "@/lib/wiki/graph";
import { normalizeTitle } from "@/lib/wiki/titles";
import { hashSeed, mulberry32, pick } from "./random";
import type { Difficulty, Puzzle } from "./types";

const CORE: readonly string[] = pools.core;
const BROAD: readonly string[] = pools.broad;

/**
 * A start article needs enough outgoing links to actually offer choices, and a
 * target needs to be reachable. Vital articles clear both bars comfortably;
 * this threshold only guards the Chaos pool, which draws from all of Wikipedia.
 */
const MIN_PLAYABLE_LINKS = 25;

/**
 * Navigational pages — indexes, lists, outlines, bare years, disambiguation
 * stubs. They are fine to pass *through*, but make poor endpoints: an index
 * page has almost no inbound links, so it is often unreachable, and starting
 * on one is just a wall of links rather than an article to read.
 */
const LOW_QUALITY_ENDPOINT =
  /^(list|lists|index|outline|glossary|timeline|bibliography) of\b|^\d{1,4}(s| BC)?$|\(disambiguation\)$/i;

/** How far apart two endpoints must be for the puzzle to be interesting. */
function isTooSimilar(start: string, target: string): boolean {
  if (start === target) return true;
  // "France" -> "History of France" is technically a run, but a boring one.
  return start.includes(target) || target.includes(start);
}

/**
 * Build a puzzle from the curated pools.
 *
 * Difficulty is expressed as *which pools the endpoints come from* rather than
 * as a measured path length. Measuring would mean running the pathfinder before
 * the game could start, adding seconds of dead time to every run; drawing from
 * importance-ranked pools gets the same felt difficulty for free, because
 * obscure endpoints are both harder to reason about and further from hubs.
 */
export function generatePuzzle(
  difficulty: Difficulty,
  seed?: string,
  targetCount = 1,
): Puzzle {
  const random = seed ? mulberry32(hashSeed(seed)) : Math.random;

  const [startPool, targetPool] =
    difficulty === "easy"
      ? [CORE, CORE]
      : difficulty === "medium"
        ? [CORE, BROAD]
        : [BROAD, BROAD];

  const start = pick(startPool, random);
  const targets: string[] = [];
  const used = new Set([start]);
  let previous = start;

  for (let stage = 0; stage < targetCount; stage += 1) {
    let target = pick(targetPool, random);

    // Retry rather than loop forever; the pools are large enough that a
    // handful of attempts always produces a distinct next checkpoint.
    for (
      let attempt = 0;
      attempt < 40 && (used.has(target) || isTooSimilar(previous, target));
      attempt += 1
    ) {
      target = pick(targetPool, random);
    }

    targets.push(normalizeTitle(target));
    used.add(target);
    previous = target;
  }

  return {
    start: normalizeTitle(start),
    targets,
    difficulty,
  };
}

interface RandomResponse {
  query?: { random?: Array<{ title: string }> };
}

/**
 * Chaos mode: two genuinely random articles, filtered for playability.
 *
 * `list=random` is heavily skewed toward stubs — individual sports fixtures,
 * schools, taxonomic entries — which have almost no outgoing links and make
 * for an unwinnable run. Sampling wide and keeping only well-connected pages
 * is what makes the mode playable rather than merely random.
 */
export async function generateChaosPuzzle(targetCount = 1): Promise<Puzzle> {
  const body = await wikiApi<RandomResponse>(
    { action: "query", list: "random", rnnamespace: 0, rnlimit: 30 },
    0,
  );

  const candidates = (body.query?.random ?? [])
    .map((entry) => normalizeTitle(entry.title))
    .filter((title) => !LOW_QUALITY_ENDPOINT.test(title));

  const budget = new RequestBudget(8);
  const linkCounts = await outgoingLinksBatch(candidates, budget, 60);

  const playable = candidates.filter(
    (title) => (linkCounts.get(title)?.size ?? 0) >= MIN_PLAYABLE_LINKS,
  );

  // If Wikipedia handed us nothing but stubs, fall back rather than ship a
  // run that cannot be finished.
  if (playable.length < targetCount + 1) {
    return { ...generatePuzzle("hard", undefined, targetCount), difficulty: "chaos" };
  }

  const sequence = [playable[0]];
  for (let stage = 0; stage < targetCount; stage += 1) {
    const previous = sequence[sequence.length - 1];
    const next =
      playable.find(
        (title) =>
          !sequence.includes(title) && !isTooSimilar(previous, title),
      ) ?? playable.find((title) => !sequence.includes(title));

    if (!next) {
      return {
        ...generatePuzzle("hard", undefined, targetCount),
        difficulty: "chaos",
      };
    }
    sequence.push(next);
  }

  return { start: sequence[0], targets: sequence.slice(1), difficulty: "chaos" };
}

export async function createPuzzle(
  difficulty: Difficulty,
  targetCount = 1,
): Promise<Puzzle> {
  return difficulty === "chaos"
    ? generateChaosPuzzle(targetCount)
    : generatePuzzle(difficulty, undefined, targetCount);
}
