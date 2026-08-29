"use client";

import { useEffect, useMemo, useRef } from "react";
import { flattenPath } from "@/lib/game/path-list";
import type { PathNode } from "@/lib/game/use-run";
import { cn } from "@/lib/utils";

/** Pixels each fork steps to the right. */
const INDENT_STEP = 15;

/**
 * Indentation stops deepening past this. Forks nest rarely, but a run that
 * kept forking would otherwise squeeze titles into a two-word column.
 */
const MAX_INDENT = 6;

interface PathListProps {
  path: PathNode[];
  currentNodeId: number;
  /** Pages from cleared stages are history, not somewhere to go back to. */
  stage: number;
  disabled: boolean;
  onJumpTo: (nodeId: number) => void;
  className?: string;
}

/**
 * Everywhere you have been, as an indented list.
 *
 * A run's path is deep and narrow — every click adds a row, but it only widens
 * on the rarer backtrack-and-fork — which is the same shape as the column it
 * has to live in. Rows get the full width, so titles are never truncated, and
 * knowing which page a step was is the entire point of showing it.
 *
 * Every row is a button, so the list is also the navigation: this is how you
 * go back, including onto a branch you walked away from.
 *
 * Deliberately no times per row. While a run is live the question a player is
 * answering here is *which page*, not *when* — the running total is already the
 * largest thing on the panel, and a column of figures would take a fifth of
 * each row from the titles, which are the reason this is a list at all.
 */
export function PathList({
  path,
  currentNodeId,
  stage,
  disabled,
  onJumpTo,
  className,
}: PathListProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const currentRef = useRef<HTMLLIElement>(null);

  const rows = useMemo(
    () => flattenPath(path, currentNodeId),
    [path, currentNodeId],
  );

  // Follow the run. `nearest` rather than `center` so a short list is not
  // yanked around when the current row is already comfortably in view.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentNodeId, rows.length]);

  if (rows.length === 0) return null;

  return (
    <ol
      ref={listRef}
      className={cn("slim-scrollbar overflow-y-auto overscroll-contain pr-1", className)}
    >
      {rows.map((row) => {
        const current = row.node.id === currentNodeId;
        const cleared = row.node.stage !== stage;
        const reachable = !current && !cleared && !disabled;

        return (
          <li
            key={row.node.id}
            ref={current ? currentRef : undefined}
            className="relative"
            style={{
              paddingLeft: Math.min(row.indent, MAX_INDENT) * INDENT_STEP,
            }}
          >
            {/*
              A rail per level of nesting, and an elbow on the rows that begin
              a branch. Without the elbow a page and its parent's siblings sit
              at the same indent and read as the same thing; with it, an elbow
              means "the path split here" and a bare rail means "this run
              continues".
            */}
            {Array.from(
              { length: Math.min(row.indent, MAX_INDENT) },
              (_, level) => (
                <span
                  key={level}
                  aria-hidden
                  className="absolute inset-y-0 w-px bg-black/12"
                  style={{ left: level * INDENT_STEP + 7 }}
                />
              ),
            )}

            {row.indent > 0 && row.branchStart && (
              <span
                aria-hidden
                className="absolute h-px bg-black/20"
                style={{
                  left: (Math.min(row.indent, MAX_INDENT) - 1) * INDENT_STEP + 7,
                  width: INDENT_STEP - 4,
                  top: "0.95rem",
                }}
              />
            )}

            <button
              type="button"
              disabled={!reachable}
              onClick={() => onJumpTo(row.node.id)}
              title={
                current
                  ? row.node.title
                  : cleared
                    ? `${row.node.title} is in a cleared stage`
                    : `Go back to ${row.node.title}`
              }
              className={cn(
                "flex w-full items-baseline gap-2 rounded-xl px-2.5 py-1.5 text-left transition-colors",
                current && "bg-[var(--color-play)]",
                reachable && "hover:bg-black/5",
                !reachable && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "font-display min-w-0 flex-1 text-[0.8125rem] leading-snug",
                  current && "font-bold text-white",
                  // A page on the way to where you are reads as live; one on a
                  // branch you left reads as explored but set aside.
                  !current &&
                    row.onRoute &&
                    "font-semibold text-[var(--color-backdrop-ink)]",
                  !current && !row.onRoute && "text-muted",
                  cleared && "opacity-60",
                )}
              >
                {row.node.title}
              </span>

            </button>
          </li>
        );
      })}
    </ol>
  );
}
