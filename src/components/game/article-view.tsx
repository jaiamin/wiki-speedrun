"use client";

import { useEffect, useRef } from "react";
import type { Article } from "@/lib/wiki/article";
import { normalizeTitle } from "@/lib/wiki/titles";

interface ArticleViewProps {
  article: Article | null;
  /** Titles already on the trail, so they can be marked as visited. */
  visited: string[];
  onNavigate: (title: string) => void;
  /** Enforces the classic wikiracing rule against in-page search. */
  blockFind: boolean;
  onBlockedFind: () => void;
}

/**
 * Renders a proxied article and turns link clicks into game moves.
 *
 * Interception is delegated to the container rather than bound per anchor:
 * a long article carries several hundred links, and attaching that many
 * listeners on every navigation would be wasteful. One listener on the root,
 * plus `closest()`, handles all of them and survives re-renders.
 */
export function ArticleView({
  article,
  visited,
  onNavigate,
  blockFind,
  onBlockedFind,
}: ArticleViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * A new article is a new page, so the reader starts at the top. Which
   * element actually scrolls depends on the layout: beside the rail on desktop
   * the article has its own scroll container, while on a phone the whole page
   * scrolls under a sticky bar. Reset both rather than guess.
   */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [article?.title]);

  /**
   * Wikipedia's tables are routinely wider than any column we can give them.
   * Each gets its own horizontal scroller so a wide table never forces the
   * whole page sideways.
   */
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    for (const table of root.querySelectorAll("table.wikitable")) {
      if (table.parentElement?.classList.contains("ws-table-scroll")) continue;
      const wrapper = document.createElement("div");
      wrapper.className = "ws-table-scroll";
      table.replaceWith(wrapper);
      wrapper.append(table);
    }
  }, [article?.html]);

  // Mark links to pages already on the trail, so backtracking is legible.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const seen = new Set(visited.map(normalizeTitle));
    for (const anchor of root.querySelectorAll<HTMLAnchorElement>(
      "a[data-wiki-title]",
    )) {
      const title = anchor.dataset.wikiTitle ?? "";
      if (seen.has(title)) anchor.dataset.visited = "true";
      else delete anchor.dataset.visited;
    }
  }, [article?.html, visited]);

  /**
   * No Ctrl+F. Finding the target's name on the page with the browser's own
   * search would replace the game with a text search, so the classic
   * wikiracing rule is enforced rather than merely requested.
   */
  useEffect(() => {
    if (!blockFind) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const isFind =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f";
      if (!isFind) return;
      event.preventDefault();
      onBlockedFind();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [blockFind, onBlockedFind]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>(
      "a[data-wiki-title]",
    );
    if (!anchor) return;

    // Let genuine "open in new tab" gestures through to nothing — the href is
    // an internal route, so nothing escapes, but we must not count it a move.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    const title = anchor.dataset.wikiTitle;
    if (title) onNavigate(title);
  };

  if (!article) return null;

  return (
    <div ref={scrollRef} data-article-scroll>
      {/* Full bleed: the article uses the whole width the run panel leaves. */}
      <div className="px-5 py-9 sm:px-8 sm:py-12 lg:px-12">
        <header className="mb-7">
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.021em] sm:text-[2rem]">
            {article.title}
          </h1>
          {article.redirectedFrom && (
            <p className="mt-1.5 text-xs text-muted">
              Redirected from {article.redirectedFrom}
            </p>
          )}
        </header>

        <div
          ref={containerRef}
          className="article"
          onClick={handleClick}
          dangerouslySetInnerHTML={{ __html: article.html }}
        />
      </div>
    </div>
  );
}
