import { wikiApi } from "./client";
import { CACHE, MAX_TITLES_PER_QUERY } from "./config";
import { normalizeTitle } from "./titles";

/**
 * A shared request allowance for one search.
 *
 * Every hop of a breadth-first search over Wikipedia's link graph costs real
 * requests against Wikimedia's servers, and a popular target can have hundreds
 * of thousands of inbound links. The budget is what keeps a single hint from
 * turning into a thousand-request crawl.
 */
export class RequestBudget {
  private used = 0;

  constructor(private readonly limit: number) {}

  get spent(): number {
    return this.used;
  }

  get exhausted(): boolean {
    return this.used >= this.limit;
  }

  take(): boolean {
    if (this.exhausted) return false;
    this.used += 1;
    return true;
  }
}

interface LinksResponse {
  query?: {
    pages?: Array<{
      title: string;
      missing?: boolean;
      links?: Array<{ title: string }>;
      linkshere?: Array<{ title: string }>;
    }>;
  };
  continue?: Record<string, string>;
}

/**
 * Every article `title` links out to, following continuations until the page
 * is exhausted or the budget runs dry.
 *
 * Returns `complete: false` when truncated, which the pathfinder propagates so
 * it never claims a path is optimal on the strength of a partial frontier.
 */
export async function outgoingLinks(
  title: string,
  budget: RequestBudget,
  cap = Infinity,
): Promise<{ titles: string[]; complete: boolean }> {
  return paginate(
    { titles: title, prop: "links", plnamespace: 0, pllimit: "max" },
    "links",
    budget,
    cap,
  );
}

/** Every article that links to `title` — the reverse edge, for backward search. */
export async function incomingLinks(
  title: string,
  budget: RequestBudget,
  cap = Infinity,
): Promise<{ titles: string[]; complete: boolean }> {
  return paginate(
    { titles: title, prop: "linkshere", lhnamespace: 0, lhlimit: "max" },
    "linkshere",
    budget,
    cap,
  );
}

async function paginate(
  params: Record<string, string | number>,
  key: "links" | "linkshere",
  budget: RequestBudget,
  cap: number,
): Promise<{ titles: string[]; complete: boolean }> {
  const collected = new Set<string>();
  let cont: Record<string, string> | undefined;

  do {
    if (collected.size >= cap) return { titles: [...collected], complete: false };
    if (!budget.take()) return { titles: [...collected], complete: false };

    const body = await wikiApi<LinksResponse>(
      { action: "query", redirects: 1, ...params, ...cont },
      CACHE.links,
    );

    const page = body.query?.pages?.[0];
    if (!page || page.missing) return { titles: [], complete: true };

    for (const entry of page[key] ?? []) {
      collected.add(normalizeTitle(entry.title));
    }
    cont = body.continue;
  } while (cont);

  return { titles: [...collected], complete: true };
}

/**
 * Outgoing links for many pages at once.
 *
 * MediaWiki caps a query at 500 links *in total* across all requested titles,
 * so batching does not reduce the number of round trips for link-heavy pages —
 * it mainly amortizes the per-request overhead. Results are capped per page so
 * one enormous article cannot consume the whole batch's allowance.
 */
export async function outgoingLinksBatch(
  titles: string[],
  budget: RequestBudget,
  perPageCap = 400,
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();

  for (let i = 0; i < titles.length; i += MAX_TITLES_PER_QUERY) {
    const batch = titles.slice(i, i + MAX_TITLES_PER_QUERY);
    let cont: Record<string, string> | undefined;

    do {
      if (!budget.take()) return result;

      const body = await wikiApi<LinksResponse>(
        {
          action: "query",
          titles: batch.join("|"),
          prop: "links",
          plnamespace: 0,
          pllimit: "max",
          redirects: 1,
          ...cont,
        },
        CACHE.links,
      );

      for (const page of body.query?.pages ?? []) {
        if (page.missing) continue;
        const key = normalizeTitle(page.title);
        const bucket = result.get(key) ?? new Set<string>();
        for (const link of page.links ?? []) {
          if (bucket.size >= perPageCap) break;
          bucket.add(normalizeTitle(link.title));
        }
        result.set(key, bucket);
      }

      cont = body.continue;
    } while (cont);
  }

  return result;
}

/**
 * Ask which of `candidates` each of `sources` links to, in one round trip per
 * 50x50 block.
 *
 * This inverts the usual expansion. Instead of downloading every outgoing link
 * of every frontier page and intersecting locally, `pltitles` pushes the
 * intersection into MediaWiki: it returns only the edges that actually exist.
 * A block covers 2,500 candidate edges for a single request, which is what
 * makes a live depth-3 search affordable.
 *
 * Both `titles` and `pltitles` are capped at 50 entries for anonymous clients,
 * hence the nested chunking.
 */
export async function linksAmong(
  sources: string[],
  candidates: string[],
  budget: RequestBudget,
): Promise<Map<string, Set<string>>> {
  const edges = new Map<string, Set<string>>();
  if (sources.length === 0 || candidates.length === 0) return edges;

  for (let c = 0; c < candidates.length; c += MAX_TITLES_PER_QUERY) {
    const candidateChunk = candidates.slice(c, c + MAX_TITLES_PER_QUERY);

    for (let s = 0; s < sources.length; s += MAX_TITLES_PER_QUERY) {
      const sourceChunk = sources.slice(s, s + MAX_TITLES_PER_QUERY);
      if (!budget.take()) return edges;

      const body = await wikiApi<LinksResponse>(
        {
          action: "query",
          titles: sourceChunk.join("|"),
          prop: "links",
          plnamespace: 0,
          pllimit: "max",
          pltitles: candidateChunk.join("|"),
          redirects: 1,
        },
        CACHE.links,
      );

      for (const page of body.query?.pages ?? []) {
        if (page.missing || !page.links?.length) continue;
        const key = normalizeTitle(page.title);
        const bucket = edges.get(key) ?? new Set<string>();
        for (const link of page.links) bucket.add(normalizeTitle(link.title));
        edges.set(key, bucket);
      }
    }
  }

  return edges;
}
