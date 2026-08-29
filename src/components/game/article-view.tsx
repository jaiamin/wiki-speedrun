"use client";

import { useEffect, useRef } from "react";
import type { Article } from "@/lib/wiki/article";
import type { ArticleSection } from "@/lib/wiki/sanitize";
import { normalizeTitle } from "@/lib/wiki/titles";
import { LinkPreview, useLinkPreview } from "./link-preview";

interface ArticleViewProps {
  article: Article | null;
  /** Titles already on the trail, so they can be marked as visited. */
  visited: string[];
  onNavigate: (title: string) => void;
  /** Enforces the classic wikiracing rule against in-page search. */
  blockFind: boolean;
  onBlockedFind: () => void;
  /** Leaving mid-run is giving up, so the wordmark does exactly that. */
  onExit: () => void;
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
  onExit,
}: ArticleViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { handlers, preview, clear } = useLinkPreview(true);

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
    if (title) {
      // The preview describes a page we are leaving; dismiss it immediately
      // rather than letting it hang over the next article.
      clear();
      onNavigate(title);
    }
  };

  if (!article) return null;

  const scrollToSection = (id: string) => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const heading = [...(containerRef.current?.querySelectorAll<HTMLElement>(
      "h2[id], h3[id]",
    ) ?? [])].find((candidate) => candidate.id === id);
    if (!heading) return;

    const top =
      heading.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop -
      24;
    scroller.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div className="flex h-full overflow-hidden">
      <Contents
        sections={article.sections}
        onSelect={scrollToSection}
        onExit={onExit}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="flex h-[4.25rem] shrink-0 items-center border-b border-line px-5 sm:h-[4.75rem] sm:px-8 lg:px-12">
          {/*
            Fredoka rather than the UI sans: the title is the one piece of the
            game's own voice on a page otherwise given over to Wikipedia's.
            It carries less negative tracking than Inter Tight wants — a
            rounded face goes cramped when it is pulled in that far.
          */}
          <h1 className="font-display truncate text-[1.5rem] leading-tight font-semibold tracking-[-0.01em] sm:text-[1.75rem]">
            {article.title}
          </h1>
        </header>

        <div
          ref={scrollRef}
          data-article-scroll
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {/* Full bleed: the article uses the whole width the run panel leaves. */}
          <div className="px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
            {article.redirectedFrom && (
              <p className="mb-6 text-xs text-muted">
                Redirected from {article.redirectedFrom}
              </p>
            )}

            <div
              ref={containerRef}
              className="article"
              onClick={handleClick}
              {...handlers}
              dangerouslySetInnerHTML={{ __html: article.html }}
            />
          </div>

          {preview && (
            <LinkPreview
              anchor={preview.anchor}
              summary={preview.summary}
              loading={preview.loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Contents({
  sections,
  onSelect,
  onExit,
}: {
  sections: ArticleSection[];
  onSelect: (id: string) => void;
  onExit: () => void;
}) {
  return (
    <aside className="hidden h-full w-[11.5rem] shrink-0 flex-col border-r border-line bg-surface/55 lg:flex xl:w-[13.5rem]">
      {/*
        The header height is shared with the article header beside it so the
        rule across the top stays unbroken — the wordmark grows into that
        height rather than changing it, and the padding tightens to buy the
        width the larger size needs inside a 13rem column.
      */}
      {/*
        The wordmark is the way out. There is no other route off this page
        while a run is live, and leaving one is giving up — so it does that
        rather than silently discarding the run.
      */}
      <button
        type="button"
        onClick={onExit}
        title="Give up and leave this run"
        aria-label="Give up and leave this run"
        className="font-display flex h-[4.75rem] shrink-0 items-center border-b border-line bg-canvas px-3.5 text-[1.75rem] font-semibold tracking-[-0.03em] text-[var(--color-backdrop-ink)] transition-opacity hover:opacity-70 xl:px-5 xl:text-[2rem]"
      >
        wiki
        <span className="text-link underline decoration-[0.11em] underline-offset-[0.13em]">
          dash
        </span>
        .io
      </button>
      <div className="font-display px-5 pt-5 pb-2 text-sm font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
        Contents
      </div>
      <nav
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-1 pb-3"
        aria-label="Article contents"
      >
        {sections.map((section) => (
          <button
            key={`${section.level}-${section.id}`}
            type="button"
            onClick={() => onSelect(section.id)}
            className={`font-display w-full rounded-lg py-1.5 pr-2 text-left text-[0.8125rem] leading-snug text-muted hover:bg-black/5 hover:text-[var(--color-backdrop-ink)] ${section.level === 3 ? "pl-5" : "pl-2 font-semibold"}`}
          >
            {section.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
