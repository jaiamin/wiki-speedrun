import { HTMLElement, NodeType, parse } from "node-html-parser";
import { titleFromHref } from "./titles";

/**
 * Elements removed wholesale. These are either unplayable (citation markers
 * that link to `#cite_note` anchors), pure chrome (edit pencils, maintenance
 * banners), or styling we replace with our own so the article inherits the
 * game's design rather than Wikipedia's.
 */
const STRIP_SELECTORS = [
  "script",
  "style",
  "link",
  "meta",
  "noscript",
  ".mw-editsection",
  ".mw-empty-elt",
  ".shortdescription",
  ".printfooter",
  ".catlinks",
  ".mw-references-wrap",
  ".reference",
  ".reflist",
  ".refbegin",
  ".mw-cite-backlink",
  ".sistersitebox",
  ".side-box",
  ".ambox",
  ".mbox",
  ".metadata",
  ".navigation-not-searchable",
  "#coordinates",
] as const;

/**
 * Sections dropped by heading id. These are bibliographies and link dumps:
 * they carry almost no in-article navigation value but a lot of weight.
 * `See also` is deliberately kept — it is a legitimate and beloved shortcut.
 */
const STRIP_SECTIONS = new Set([
  "references",
  "notes",
  "citations",
  "sources",
  "bibliography",
  "external_links",
  "further_reading",
  "works_cited",
  "footnotes",
  "explanatory_notes",
]);

export interface SanitizedArticle {
  /** Game-ready HTML: every live link carries `data-wiki-title`. */
  html: string;
  /** Every article reachable by clicking on this page, normalized. */
  links: string[];
  /** Article headings used by the in-game contents rail. */
  sections: ArticleSection[];
}

export interface ArticleSection {
  id: string;
  label: string;
  level: 2 | 3;
}

/**
 * Turn raw `action=parse` HTML into something the game can render and trust.
 *
 * Two jobs, done in one pass so we never walk the (large) tree twice:
 * strip everything unplayable, and convert article links into inert anchors
 * tagged with `data-wiki-title`. The client intercepts those rather than
 * letting the browser navigate, which is what keeps the run inside the app.
 */
export function sanitizeArticle(rawHtml: string): SanitizedArticle {
  const root = parse(rawHtml, {
    comment: false,
    blockTextElements: { script: false, noscript: false, style: false },
  });

  for (const selector of STRIP_SELECTORS) {
    for (const element of root.querySelectorAll(selector)) element.remove();
  }

  removeBlockedSections(root);

  const sections = collectSections(root);
  const links = rewriteLinks(root);
  normalizeMedia(root);
  stripEventHandlers(root);

  return { html: root.toString(), links: [...links].sort(), sections };
}

/** Keep Wikipedia's section ids so contents buttons can scroll locally. */
function collectSections(root: HTMLElement): ArticleSection[] {
  return root
    .querySelectorAll("h2, h3")
    .map((heading) => ({
      id: heading.getAttribute("id") ?? "",
      label: heading.textContent.trim(),
      level: heading.tagName === "H2" ? (2 as const) : (3 as const),
    }))
    .filter((section) => section.id && section.label);
}

/**
 * Drop each blocked `h2` section along with everything under it, stopping at
 * the next `h2`. Wikipedia emits headings as flat siblings inside
 * `.mw-parser-output` rather than nesting section content, so "the section"
 * is defined by sibling order, not containment.
 */
function removeBlockedSections(root: HTMLElement): void {
  const container = root.querySelector(".mw-parser-output") ?? root;
  let removing = false;

  for (const node of [...container.childNodes]) {
    const isElement = node.nodeType === NodeType.ELEMENT_NODE;

    if (isElement) {
      const element = node as HTMLElement;
      const heading = element.classList?.contains("mw-heading2")
        ? element.querySelector("h2")
        : element.tagName === "H2"
          ? element
          : null;

      if (heading) {
        const id = (heading.getAttribute("id") ?? "").toLowerCase();
        removing = STRIP_SECTIONS.has(id);
      }
    }

    if (removing) node.remove();
  }
}

/**
 * Rewrite every anchor and collect the outgoing article set.
 *
 * Live article links keep their text but lose their href, so a stray
 * middle-click or "open in new tab" cannot escape the run. Everything else
 * (files, categories, external sites, red links) is unwrapped to plain text
 * so it is visibly not a move.
 */
function rewriteLinks(root: HTMLElement): Set<string> {
  const links = new Set<string>();

  for (const anchor of root.querySelectorAll("a")) {
    const title = titleFromHref(anchor.getAttribute("href") ?? "");

    if (!title) {
      unwrap(anchor);
      continue;
    }

    links.add(title);
    anchor.setAttribute("data-wiki-title", title);
    anchor.setAttribute("href", `/wiki/${encodeURIComponent(title)}`);
    anchor.setAttribute("class", "ws-link");
    anchor.removeAttribute("rel");
    anchor.removeAttribute("target");
  }

  return links;
}

/** Replace an element with its own children, keeping the text in place. */
function unwrap(element: HTMLElement): void {
  const parent = element.parentNode;
  if (!parent) return;
  element.replaceWith(...element.childNodes);
}

/**
 * Make media load standalone. Wikipedia emits protocol-relative upload URLs,
 * which resolve fine in a browser but are ambiguous once the markup has been
 * moved to another origin.
 */
function normalizeMedia(root: HTMLElement): void {
  for (const img of root.querySelectorAll("img")) {
    for (const attribute of ["src", "srcset"]) {
      const value = img.getAttribute(attribute);
      if (value?.startsWith("//")) {
        img.setAttribute(attribute, `https:${value}`);
      }
    }
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
  }
}

/**
 * Defence in depth. The markup comes from Wikipedia and is injected with
 * `dangerouslySetInnerHTML`, so inline handlers are stripped even though
 * `<script>` is already gone and MediaWiki would not emit them.
 */
function stripEventHandlers(root: HTMLElement): void {
  for (const element of root.querySelectorAll("*")) {
    for (const name of Object.keys(element.attributes)) {
      if (name.toLowerCase().startsWith("on")) element.removeAttribute(name);
      if (name.toLowerCase() === "srcdoc") element.removeAttribute(name);
    }
  }
}
