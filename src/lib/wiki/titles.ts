/**
 * Namespace prefixes that exist on Wikipedia but are not articles. Links into
 * these are dead ends for a speedrun (and `Special:Search` would let you
 * teleport straight to the target), so the sanitizer strips them.
 */
const NON_ARTICLE_PREFIXES = [
  "Special",
  "Talk",
  "User",
  "User talk",
  "Wikipedia",
  "Wikipedia talk",
  "File",
  "File talk",
  "MediaWiki",
  "MediaWiki talk",
  "Template",
  "Template talk",
  "Help",
  "Help talk",
  "Category",
  "Category talk",
  "Portal",
  "Portal talk",
  "Draft",
  "Draft talk",
  "TimedText",
  "Module",
  "Module talk",
  "Image",
  "Media",
] as const;

const PREFIX_PATTERN = new RegExp(
  `^(${NON_ARTICLE_PREFIXES.join("|").replace(/ /g, "[ _]")}):`,
  "i",
);

/**
 * Put a title into the form MediaWiki itself would store it in: spaces rather
 * than underscores, no surrounding or repeated whitespace, no fragment, and an
 * uppercased first character (the main namespace is case-insensitive on the
 * first letter only, which is why the rest is left alone).
 */
export function normalizeTitle(raw: string): string {
  let title = raw.trim();

  const hash = title.indexOf("#");
  if (hash !== -1) title = title.slice(0, hash);

  title = title.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (!title) return "";

  return title.charAt(0).toUpperCase() + title.slice(1);
}

/** The URL form of a title: normalized, then underscored and encoded. */
export function titleToPath(title: string): string {
  return encodeURIComponent(normalizeTitle(title).replace(/ /g, "_"));
}

/**
 * Pull an article title out of an href, or return null if the link does not
 * point at a readable article on this wiki.
 *
 * Rejects: external links, interwiki links, non-article namespaces, red links
 * (`?action=edit&redlink=1`), and bare fragments.
 */
export function titleFromHref(href: string): string | null {
  if (!href) return null;

  // Bare fragments are same-page anchors, not navigation.
  if (href.startsWith("#")) return null;

  // Red links carry a query string; they point at nonexistent articles.
  if (href.includes("redlink=1") || href.includes("action=edit")) return null;

  const match = /^(?:https?:)?\/\/[a-z-]+\.wikipedia\.org\/wiki\/(.+)$|^\/wiki\/(.+)$|^\.\/(.+)$/.exec(
    href,
  );
  if (!match) return null;

  const encoded = match[1] ?? match[2] ?? match[3];
  if (!encoded) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    // Malformed percent-encoding: not a link we can trust.
    return null;
  }

  if (PREFIX_PATTERN.test(decoded)) return null;

  const title = normalizeTitle(decoded);
  return title || null;
}

/** True when two titles refer to the same article, ignoring form differences. */
export function titlesMatch(a: string, b: string): boolean {
  return normalizeTitle(a) === normalizeTitle(b);
}

export function isArticleTitle(title: string): boolean {
  return Boolean(title) && !PREFIX_PATTERN.test(title);
}
