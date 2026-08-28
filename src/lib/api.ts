import { NextResponse } from "next/server";
import { WikiError } from "@/lib/wiki/client";

/**
 * Turn a thrown error into a response without leaking internals.
 *
 * `WikiError` already carries a meaningful status (404 for a missing article,
 * 502 when Wikimedia itself misbehaves); anything else is genuinely ours and
 * reports as a 500 with a generic message.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof WikiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error("[wiki-speedrun]", error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

/** Cache headers for responses that are safe to hold at the edge. */
export function cached<T>(body: T, seconds: number): NextResponse {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 2}`,
    },
  });
}
