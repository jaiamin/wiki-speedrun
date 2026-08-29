import pools from "@/data/pools.json";
import { hashSeed, mulberry32 } from "./random";

/** Build the same stable word field anywhere the pre-game UI appears. */
export function getBackdropTerms(count: number): string[] {
  const candidates = [...pools.core, ...pools.broad].filter(
    (title) => title.length <= 16 && !title.includes("("),
  );

  const random = mulberry32(hashSeed("wiki-speedrun:backdrop"));
  const picked = new Set<string>();

  while (picked.size < count && picked.size < candidates.length) {
    picked.add(candidates[Math.floor(random() * candidates.length)]);
  }

  return [...picked];
}
