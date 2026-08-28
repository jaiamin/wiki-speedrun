"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/game/format";
import { useSummary } from "@/lib/game/use-summary";
import type { Puzzle } from "@/lib/game/types";
import type { TrailEntry } from "@/lib/game/use-run";
import { cn } from "@/lib/utils";

interface RunPanelProps {
  puzzle: Puzzle;
  trail: TrailEntry[];
  startedAt: number | null;
  elapsedMs: number;
  running: boolean;
  disabled: boolean;
  onJumpTo: (index: number) => void;
  onGiveUp: () => void;
}

/**
 * Everything about the run that is not the article, in a fixed column on the
 * right so the encyclopedia keeps the whole of the rest.
 *
 * Two layouts rather than one responsive one, because they are different
 * instruments. Beside the page there is room to keep the clock, the target and
 * the whole trail open permanently. On a phone there is no column for them, so
 * it collapses to a strip carrying what must never scroll away, with the trail
 * a tap behind it.
 */
export function RunPanel(props: RunPanelProps) {
  return (
    <>
      <MobileBar {...props} />
      <DesktopPanel {...props} />
    </>
  );
}

function DesktopPanel({
  puzzle,
  trail,
  startedAt,
  elapsedMs,
  running,
  disabled,
  onJumpTo,
  onGiveUp,
}: RunPanelProps) {
  const clicks = Math.max(0, trail.length - 1);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[18rem] shrink-0 flex-col overflow-y-auto border-l border-line lg:flex xl:w-[20rem]">
      <div className="border-b border-line p-5">
        <div className="label mb-2.5">Time</div>
        <div
          className={cn(
            "tnum font-mono text-[2.125rem] leading-none font-medium tracking-[-0.04em] transition-colors",
            !running && "text-muted",
          )}
          role="timer"
          aria-live="off"
        >
          {formatClock(elapsedMs)}
        </div>
        <div className="tnum mt-2.5 font-mono text-xs text-muted">
          {clicks} {clicks === 1 ? "click" : "clicks"}
        </div>
      </div>

      <div className="border-b border-line p-5">
        <div className="label mb-3">Target</div>
        <Target title={puzzle.target} />
      </div>

      <div className="flex-1 border-b border-line p-5">
        <div className="label mb-2">Trail</div>
        <Trail
          trail={trail}
          startedAt={startedAt}
          disabled={disabled}
          onJumpTo={onJumpTo}
        />
      </div>

      <div className="sticky bottom-0 bg-canvas p-5">
        <Button size="md" variant="ghost" onClick={onGiveUp}>
          <Flag className="size-3.5" aria-hidden />
          Give up
        </Button>
      </div>
    </aside>
  );
}

function Target({ title }: { title: string }) {
  const summary = useSummary(title);

  return (
    <div>
      {summary?.thumbnail && (
        <img
          src={summary.thumbnail.source}
          alt=""
          className="mb-3 h-24 w-full rounded-[var(--radius-control)] border border-line object-cover"
        />
      )}
      <div className="text-[1.0625rem] leading-snug font-semibold tracking-[-0.015em]">
        {title}
      </div>
      {summary?.description && (
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
          {summary.description}
        </p>
      )}
    </div>
  );
}

/**
 * The route so far, and the way back through it.
 *
 * Every page except the one you are on is a button that returns you there,
 * which is why there is no separate back button: stepping back one page is
 * clicking the row above, and the trail was already on screen. Jumping
 * truncates the trail, so the route stays an honest record of how the run
 * actually went rather than everywhere you ever looked.
 */
function Trail({
  trail,
  startedAt,
  disabled,
  onJumpTo,
}: {
  trail: TrailEntry[];
  startedAt: number | null;
  disabled: boolean;
  onJumpTo: (index: number) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the page you are actually on in view as the run grows.
  useEffect(() => {
    const list = listRef.current;
    list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [trail.length]);

  if (startedAt === null) return null;

  return (
    <ol ref={listRef} className="-mx-2 max-h-[46vh] overflow-y-auto">
      {trail.map((entry, index) => {
        const current = index === trail.length - 1;

        return (
          <li key={`${entry.title}-${entry.at}`}>
            <button
              type="button"
              disabled={current || disabled}
              onClick={() => onJumpTo(index)}
              title={current ? entry.title : `Go back to ${entry.title}`}
              className={cn(
                "flex w-full items-baseline gap-2.5 rounded-[5px] px-2 py-1.5 text-left transition-colors",
                current
                  ? "cursor-default"
                  : "hover:bg-surface disabled:cursor-default disabled:hover:bg-transparent",
              )}
            >
              <span className="tnum w-4 shrink-0 font-mono text-[0.625rem] text-faint">
                {String(index).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[0.8125rem]",
                  current ? "font-medium" : "text-muted",
                )}
              >
                {entry.title}
              </span>
              <span className="tnum shrink-0 font-mono text-[0.625rem] text-faint">
                {index === 0 ? "—" : formatClock(entry.at - startedAt)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function MobileBar({
  puzzle,
  trail,
  startedAt,
  elapsedMs,
  running,
  disabled,
  onJumpTo,
  onGiveUp,
}: RunPanelProps) {
  const [open, setOpen] = useState(false);
  const clicks = Math.max(0, trail.length - 1);

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
      >
        <span
          className={cn(
            "tnum shrink-0 font-mono text-[1.1875rem] leading-none font-medium tracking-[-0.03em]",
            !running && "text-muted",
          )}
        >
          {formatClock(elapsedMs)}
        </span>
        <span className="tnum shrink-0 font-mono text-[0.625rem] text-faint">
          {clicks}
        </span>

        <span className="min-w-0 flex-1 truncate pl-2 text-right text-[0.8125rem] font-semibold tracking-[-0.011em]">
          {puzzle.target}
        </span>

        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-line px-4 py-4">
          <div className="label mb-2">Trail</div>
          <Trail
            trail={trail}
            startedAt={startedAt}
            disabled={disabled}
            onJumpTo={(index) => {
              onJumpTo(index);
              setOpen(false);
            }}
          />

          <div className="mt-4">
            <Button size="md" variant="ghost" onClick={onGiveUp}>
              <Flag className="size-3.5" aria-hidden />
              Give up
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
