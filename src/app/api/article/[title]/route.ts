import type { NextRequest } from "next/server";
import { cached, errorResponse } from "@/lib/api";
import { getArticle } from "@/lib/wiki/article";
import { CACHE } from "@/lib/wiki/config";

/**
 * Serve a sanitized article.
 *
 * This is the endpoint the whole game runs through. Wikipedia sends
 * `x-frame-options: SAMEORIGIN`, so embedding it in an iframe is impossible —
 * and even if it were not, an iframe gives no way to intercept a click and
 * stop the clock. Proxying and rewriting is what makes the run observable.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ title: string }> },
) {
  try {
    const { title } = await params;
    const article = await getArticle(decodeURIComponent(title));
    return cached(article, CACHE.article);
  } catch (error) {
    return errorResponse(error);
  }
}
