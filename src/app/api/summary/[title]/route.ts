import type { NextRequest } from "next/server";
import { cached, errorResponse } from "@/lib/api";
import { getSummary } from "@/lib/wiki/article";
import { CACHE } from "@/lib/wiki/config";

/** Blurb and thumbnail for the target card, so the goal has a face. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ title: string }> },
) {
  try {
    const { title } = await params;
    return cached(await getSummary(decodeURIComponent(title)), CACHE.summary);
  } catch (error) {
    return errorResponse(error);
  }
}
