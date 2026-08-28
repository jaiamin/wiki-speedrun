import { WikiError, wikiApi, wikiJson } from "./client";
import { CACHE, WIKI_REST } from "./config";
import { sanitizeArticle } from "./sanitize";
import { normalizeTitle, titleToPath } from "./titles";

export interface Article {
  /** Canonical title after redirects — the value win detection compares. */
  title: string;
  pageId: number;
  html: string;
  links: string[];
  /** True when the requested title redirected somewhere else. */
  redirectedFrom: string | null;
}

export interface ArticleSummary {
  title: string;
  description: string | null;
  extract: string;
  thumbnail: { source: string; width: number; height: number } | null;
}

interface ParseResponse {
  parse?: {
    title: string;
    pageid: number;
    text: string;
    redirects?: Array<{ from: string; to: string }>;
  };
}

/**
 * Parsing a 500KB article costs real CPU, and during a run the same few pages
 * get requested repeatedly (back button, retries, two tabs). Next's fetch cache
 * saves the network hop; this saves the parse on top of it.
 */
const CACHE_LIMIT = 64;
const parsed = new Map<string, Article>();

function remember(key: string, article: Article): Article {
  parsed.set(key, article);
  if (parsed.size > CACHE_LIMIT) {
    // Map preserves insertion order, so the first key is the oldest.
    parsed.delete(parsed.keys().next().value as string);
  }
  return article;
}

/**
 * Fetch an article and return it ready to render inside the game.
 *
 * `redirects=1` matters more than it looks: a player clicking "USA" must land
 * on — and win at — "United States", so the canonical title is resolved
 * server-side and everything downstream compares against that.
 */
export async function getArticle(rawTitle: string): Promise<Article> {
  const requested = normalizeTitle(rawTitle);
  if (!requested) throw new WikiError("Empty article title", 400);

  const cached = parsed.get(requested);
  if (cached) return cached;

  const body = await wikiApi<ParseResponse>(
    {
      action: "parse",
      page: requested,
      prop: "text",
      redirects: 1,
      disableeditsection: 1,
      disabletoc: 1,
      formatversion: 2,
    },
    CACHE.article,
  );

  if (!body.parse) throw new WikiError(`No such article: ${requested}`, 404);

  const { html, links } = sanitizeArticle(body.parse.text);
  const title = normalizeTitle(body.parse.title);

  const article: Article = {
    title,
    pageId: body.parse.pageid,
    html,
    links,
    redirectedFrom: title === requested ? null : requested,
  };

  // Cache under both names so following the same redirect twice is free.
  remember(title, article);
  return remember(requested, article);
}

/** Short blurb and thumbnail — used to preview the target without spoiling it. */
export async function getSummary(rawTitle: string): Promise<ArticleSummary> {
  const title = normalizeTitle(rawTitle);
  const body = await wikiJson<{
    title: string;
    description?: string;
    extract?: string;
    thumbnail?: { source: string; width: number; height: number };
  }>(`${WIKI_REST}/page/summary/${titleToPath(title)}`, {}, CACHE.summary);

  return {
    title: normalizeTitle(body.title ?? title),
    description: body.description ?? null,
    extract: body.extract ?? "",
    thumbnail: body.thumbnail ?? null,
  };
}

/** Typeahead for the custom-puzzle pickers. */
export async function searchArticles(
  query: string,
  limit = 8,
): Promise<Array<{ title: string; description: string | null }>> {
  if (!query.trim()) return [];

  // `prefixsearch` alone returns titles with no context, which makes picking
  // between "Mercury (planet)" and "Mercury (element)" guesswork. Running it
  // as a generator lets `prop=description` decorate each hit in the same
  // request, and `index` preserves the ranking the search engine chose.
  const body = await wikiApi<{
    query?: {
      pages?: Array<{ title: string; description?: string; index?: number }>;
    };
  }>(
    {
      action: "query",
      generator: "prefixsearch",
      gpssearch: query,
      gpslimit: limit,
      gpsnamespace: 0,
      prop: "description",
    },
    CACHE.search,
  );

  return (body.query?.pages ?? [])
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((entry) => ({
      title: normalizeTitle(entry.title),
      description: entry.description ?? null,
    }));
}
