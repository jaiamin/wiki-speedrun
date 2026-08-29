import type { Article } from "./article";
import type { ArticleSection } from "./sanitize";

/**
 * Turn whatever the article endpoint returned into a complete `Article`.
 *
 * The response is served with a long `public` cache, so a payload written by an
 * older version of this app can be replayed into a newer one — that is how a
 * cached article from before `sections` existed reached a build that assumed
 * the field, and crashed the page on `sections.map`. Any cache layer can do
 * this: the browser, a CDN, a service worker.
 *
 * So the shape is treated as untrusted rather than assumed. Additive fields
 * degrade to empty, because an article with no contents list is still perfectly
 * playable. `title` and `html` do not: without them there is no page to show,
 * and rendering a blank article would hide the failure instead of surfacing it.
 */
export function toArticle(payload: unknown, requestedTitle: string): Article {
  const raw = (payload ?? {}) as Partial<Article>;

  if (typeof raw.html !== "string" || raw.html.length === 0) {
    throw new Error(`Malformed article payload for "${requestedTitle}"`);
  }

  return {
    title: typeof raw.title === "string" && raw.title ? raw.title : requestedTitle,
    pageId: typeof raw.pageId === "number" ? raw.pageId : 0,
    html: raw.html,
    links: Array.isArray(raw.links) ? raw.links : [],
    sections: Array.isArray(raw.sections)
      ? (raw.sections as ArticleSection[])
      : [],
    redirectedFrom:
      typeof raw.redirectedFrom === "string" ? raw.redirectedFrom : null,
  };
}
