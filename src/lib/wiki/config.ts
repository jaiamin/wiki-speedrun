/**
 * Central configuration for every outbound Wikimedia request.
 *
 * Wikimedia's User-Agent policy requires a descriptive agent with a contact
 * route; anonymous or browser-spoofing agents get rate limited or blocked
 * outright. Self-hosters should set WIKI_USER_AGENT to their own contact.
 * @see https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy
 */
export const WIKI_LANG = process.env.NEXT_PUBLIC_WIKI_LANG ?? "en";

export const WIKI_HOST = `https://${WIKI_LANG}.wikipedia.org`;
export const WIKI_API = `${WIKI_HOST}/w/api.php`;
export const WIKI_REST = `${WIKI_HOST}/api/rest_v1`;
export const PAGEVIEWS_API =
  "https://wikimedia.org/api/rest_v1/metrics/pageviews";

export const USER_AGENT =
  process.env.WIKI_USER_AGENT ??
  "wiki-speedrun/0.1 (https://github.com/jaiamin/wiki-speedrun)";

/**
 * Cache lifetimes, in seconds.
 *
 * Article bodies are the expensive fetch (500KB-900KB of raw HTML) and change
 * rarely relative to a run, so they cache hard. The link graph backs the
 * pathfinder, where a stale edge only costs an imperfect hint, so it caches
 * harder still. Pageview rankings only move once a day.
 */
export const CACHE = {
  article: 60 * 60 * 24,
  links: 60 * 60 * 24 * 7,
  summary: 60 * 60 * 24 * 7,
  pageviews: 60 * 60 * 12,
  search: 60 * 60,
} as const;

/** MediaWiki accepts at most 50 titles per query for anonymous clients. */
export const MAX_TITLES_PER_QUERY = 50;
