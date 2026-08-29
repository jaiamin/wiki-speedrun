import { hashSeed, mulberry32 } from "@/lib/game/random";

/** The maximum number of words the backdrop can place. */
export const BACKDROP_TERM_COUNT = 220;
export const BACKDROP_WORD_GAP = 10;

export interface BackdropNode {
  size: number;
  tilt: number;
}

export interface BackdropItem {
  index: number;
  width: number;
  height: number;
}

export interface BackdropPosition {
  left: number;
  top: number;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Fixed sizes keep the server render and hydration identical. */
export const BACKDROP_NODES: BackdropNode[] = (() => {
  const random = mulberry32(hashSeed("wiki-speedrun:backdrop-sizes"));

  return Array.from({ length: BACKDROP_TERM_COUNT }, () => {
    const small = random() < 0.76;
    const angled = random() < 0.45;
    const direction = random() < 0.5 ? -1 : 1;

    return {
      size: small ? 0.72 + random() * 0.38 : 1.1 + random() * 0.85,
      tilt: angled ? direction * (2 + random() * 4.5) : 0,
    };
  });
})();

const overlaps = (a: Box, b: Box) =>
  !(
    a.right + BACKDROP_WORD_GAP <= b.left ||
    b.right + BACKDROP_WORD_GAP <= a.left ||
    a.bottom + BACKDROP_WORD_GAP <= b.top ||
    b.bottom + BACKDROP_WORD_GAP <= a.top
  );

/**
 * Place measured words randomly without collisions. Larger words go first so
 * they cannot become trapped in small leftover gaps. Words that do not fit are
 * omitted instead of being squeezed into an overlap.
 */
export function placeBackdropWords(
  items: BackdropItem[],
  viewportWidth: number,
  viewportHeight: number,
): Array<BackdropPosition | null> {
  const positions: Array<BackdropPosition | null> = Array.from(
    { length: BACKDROP_TERM_COUNT },
    () => null,
  );
  if (viewportWidth <= 0 || viewportHeight <= 0) return positions;

  const random = mulberry32(
    hashSeed(`wiki-speedrun:backdrop:${viewportWidth}x${viewportHeight}`),
  );
  const occupied: Box[] = [];
  const ordered = [...items].sort(
    (a, b) => b.width * b.height - a.width * a.height,
  );

  for (const item of ordered) {
    const bleedX = Math.min(item.width * 0.32, 64);
    const bleedY = Math.min(item.height * 0.3, 18);
    const minX = item.width / 2 - bleedX;
    const maxX = viewportWidth - item.width / 2 + bleedX;
    const minY = item.height / 2 - bleedY;
    const maxY = viewportHeight - item.height / 2 + bleedY;

    if (maxX < minX || maxY < minY) continue;

    for (let attempt = 0; attempt < 600; attempt += 1) {
      const left = minX + random() * (maxX - minX);
      const top = minY + random() * (maxY - minY);
      const box = {
        left: Math.max(0, left - item.width / 2),
        top: Math.max(0, top - item.height / 2),
        right: Math.min(viewportWidth, left + item.width / 2),
        bottom: Math.min(viewportHeight, top + item.height / 2),
      };

      if (occupied.some((other) => overlaps(box, other))) continue;

      positions[item.index] = { left, top };
      occupied.push(box);
      break;
    }
  }

  return positions;
}
