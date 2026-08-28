"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, CornerUpLeft, Flag } from "lucide-react";
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
  canGoBack: boolean;
  onBack: () => void;
  onGiveUp: () => void;
}

/**
 * Everything about the run that is not the article, held in a fixed column on
 * the right so the encyclopedia keeps the whole of the rest.
 *
 * Two layouts rather than one responsive one, because they are genuinely
 * different instruments. Beside the page there is room to keep the clock, the
 * target and the full trail open permanently. On a phone there is no column to
 * put them in, so it collapses to a strip carrying only what must never scroll
 * away, with the trail a tap behind it.
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
  canGoBack,
  onBack,
  onGiveUp,
}: RunPanelProps) {
  const clicks = Math.max(0, trail.length - 1);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[18rem] shrink-0 flex-col overflow-y-auto border-l border-line lg:flex xl:w-[20rem]">
      <Section>
        <div className="label mb-2.5 flex items-center gap-2">
          <span
            className={cn(
              "size-1.5 rounded-full",
              running ? "animate-pulse bg-text" : "bg-line-strong",
            )}
            aria-hidden
          />
          Time
        </div>
        <div
          className="tnum font-mono text-[2.125rem] leading-none font-medium tracking-[-0.04em]"
          role="timer"
          aria-live="off"
        >
          {formatClock(elapsedMs)}
        </div>
        <div className="tnum mt-2 font-mono text-xs text-muted">
          {clicks} {clicks === 1 ? "click" : "clicks"}
        </div>
      </Section>

      <Section>
        <div className="label mb-3">Target</div>
        <Target title={puzzle.target} />
      </Section>

      <Section className="flex-1">
        <div className="label mb-2.5">Trail</div>
        <Trail trail={trail} startedAt={startedAt} />
      </Section>

      <div className="sticky bottom-0 flex gap-2 border-t border-line bg-canvas p-5">
        <Button size="md" onClick={onBack} disabled={!canGoBack}>
          <CornerUpLeft className="size-3.5" aria-hidden />
          Back
        </Button>
        <Button size="md" variant="ghost" onClick={onGiveUp}>
          <Flag className="size-3.5" aria-hidden />
          Give up
        </Button>
      </div>
    </aside>
  );
}

function Section({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("border-b border-line p-5", className)}>{children}</div>
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
          className="mb-2.5 h-24 w-full rounded-[var(--radius-control)] border border-line object-cover"
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

/** The route so far, newest last, with the time each page was reached. */
function Trail({
  trail,
  startedAt,
}: {
  trail: TrailEntry[];
  startedAt: number | null;
}) {
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the page you are actually on in view as the run grows.
  useEffect(() => {
    const list = listRef.current;
    list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [trail.length]);

  if (startedAt === null) return null;

  return (
    <ol ref={listRef} className="max-h-[40vh] overflow-y-auto">
      {trail.map((entry, index) => {
        const current = index === trail.length - 1;

        return (
          <li
            key={`${entry.title}-${entry.at}`}
            className="flex items-baseline gap-2.5 py-1"
          >
            <span className="tnum w-4 shrink-0 font-mono text-[0.625rem] text-faint">
              {String(index).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[0.8125rem]",
                current ? "font-medium text-text" : "text-muted",
              )}
              title={entry.title}
            >
              {entry.title}
            </span>
            <span className="tnum shrink-0 font-mono text-[0.625rem] text-faint">
              {index === 0 ? "—" : formatClock(entry.at - startedAt)}
            </span>
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
  canGoBack,
  onBack,
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
            "size-1.5 shrink-0 rounded-full",
            running ? "animate-pulse bg-text" : "bg-line-strong",
          )}
          aria-hidden
        />
        <span className="tnum shrink-0 font-mono text-[1.1875rem] leading-none font-medium tracking-[-0.03em]">
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
          <div className="label mb-2.5">Trail</div>
          <Trail trail={trail} startedAt={startedAt} />

          <div className="mt-4 flex gap-2">
            <Button size="md" onClick={onBack} disabled={!canGoBack}>
              <CornerUpLeft className="size-3.5" aria-hidden />
              Back
            </Button>
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
