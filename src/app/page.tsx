import pools from "@/data/pools.json";
import { BACKDROP_TERM_COUNT } from "@/components/home/backdrop-layout";
import { Home } from "@/components/home/home";
import { hashSeed, mulberry32 } from "@/lib/game/random";

/**
 * Pick the words scattered behind the home card.
 *
 * Chosen on the server with a fixed seed rather than at random on the client:
 * this route is statically prerendered, and an unseeded pick would render one
 * set on the server and a different set on hydration, which React reports as a
 * mismatch. Short titles only — long ones wrap and stop reading as scenery.
 */
function backdropTerms(count: number): string[] {
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

export default function Page() {
  return <Home backdropTerms={backdropTerms(BACKDROP_TERM_COUNT)} />;
}
