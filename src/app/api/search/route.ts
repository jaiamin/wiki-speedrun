import type { NextRequest } from "next/server";
import { cached, errorResponse } from "@/lib/api";
import { searchArticles } from "@/lib/wiki/article";
import { CACHE } from "@/lib/wiki/config";

/** Typeahead for building a custom run. */
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    return cached({ results: await searchArticles(query) }, CACHE.search);
  } catch (error) {
    return errorResponse(error);
  }
}
