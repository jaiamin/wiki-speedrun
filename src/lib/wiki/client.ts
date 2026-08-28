import { USER_AGENT, WIKI_API } from "./config";

export class WikiError extends Error {
  constructor(
    message: string,
    readonly status: number = 502,
  ) {
    super(message);
    this.name = "WikiError";
  }
}

export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;

function buildUrl(base: string, params: QueryParams): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/** A raw GET against any Wikimedia host, with the required agent attached. */
export async function wikiFetch(
  url: string,
  revalidate: number,
): Promise<Response> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Api-User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new WikiError(
      `Wikimedia responded ${response.status} for ${url}`,
      response.status === 404 ? 404 : 502,
    );
  }
  return response;
}

/**
 * Call the MediaWiki Action API.
 *
 * `formatversion=2` is what makes responses sane: pages come back as an array
 * rather than an object keyed by page id, and missing pages are flagged with a
 * boolean instead of a negative key.
 */
export async function wikiApi<T>(
  params: QueryParams,
  revalidate: number,
): Promise<T> {
  const url = buildUrl(WIKI_API, {
    format: "json",
    formatversion: 2,
    ...params,
  });
  const response = await wikiFetch(url, revalidate);
  const body = (await response.json()) as T & {
    error?: { code: string; info: string };
  };

  if (body.error) {
    // A nonexistent or malformed title is a client mistake, not an upstream
    // failure, so it must not surface as a 502.
    const notFound = ["missingtitle", "invalidtitle", "nosuchpageid"].includes(
      body.error.code,
    );
    throw new WikiError(
      `Wikimedia API error: ${body.error.info}`,
      notFound ? 404 : 502,
    );
  }
  return body;
}

/** GET a non-Action-API Wikimedia endpoint (REST, pageviews) as JSON. */
export async function wikiJson<T>(
  base: string,
  params: QueryParams,
  revalidate: number,
): Promise<T> {
  const response = await wikiFetch(buildUrl(base, params), revalidate);
  return (await response.json()) as T;
}
