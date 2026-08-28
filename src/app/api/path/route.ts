import type { NextRequest } from "next/server";
import { cached, errorResponse } from "@/lib/api";
import { findShortestPath } from "@/lib/wiki/pathfinder";
import { CACHE } from "@/lib/wiki/config";

/**
 * Shortest route between two articles, used for the "par" comparison on the
 * results screen.
 *
 * A search takes a few seconds and a couple of dozen upstream requests, so the
 * response is cached hard — the link graph barely moves day to day, and two
 * players given the same puzzle should see the same par.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const from = params.get("from");
    const to = params.get("to");

    if (!from || !to) {
      return Response.json(
        { error: "Both `from` and `to` are required" },
        { status: 400 },
      );
    }

    const result = await findShortestPath(from, to);
    return cached(result, CACHE.links);
  } catch (error) {
    return errorResponse(error);
  }
}

/** A search can spend several seconds waiting on Wikimedia. */
export const maxDuration = 60;
