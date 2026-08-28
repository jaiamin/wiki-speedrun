import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { createPuzzle, generateDailyPuzzle } from "@/lib/game/puzzle";
import { DIFFICULTIES, type Difficulty } from "@/lib/game/types";

/**
 * Hand out a puzzle. Never cached: a fresh run should be a fresh pairing, and
 * the daily is cheap enough to recompute from its seed on every request.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    if (params.get("daily") === "1") {
      return NextResponse.json(generateDailyPuzzle());
    }

    const requested = params.get("difficulty") ?? "medium";
    const difficulty = DIFFICULTIES.includes(requested as Difficulty)
      ? (requested as Difficulty)
      : "medium";

    return NextResponse.json(await createPuzzle(difficulty));
  } catch (error) {
    return errorResponse(error);
  }
}
