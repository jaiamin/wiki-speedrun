import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { createPuzzle } from "@/lib/game/puzzle";
import {
  DIFFICULTIES,
  RUN_LENGTHS,
  type Difficulty,
  type RunLength,
} from "@/lib/game/types";

/** Hand out a puzzle. Never cached: a fresh run should be a fresh pairing. */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const requested = params.get("difficulty") ?? "medium";
    const difficulty = DIFFICULTIES.includes(requested as Difficulty)
      ? (requested as Difficulty)
      : "medium";
    const requestedStages = Number(params.get("stages") ?? 1);
    const stages = RUN_LENGTHS.includes(requestedStages as RunLength)
      ? (requestedStages as RunLength)
      : 1;

    return NextResponse.json(await createPuzzle(difficulty, stages));
  } catch (error) {
    return errorResponse(error);
  }
}
