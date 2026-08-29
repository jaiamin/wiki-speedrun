"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, Flag, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PathList } from "@/components/game/path-list";
import { useSummary } from "@/lib/game/use-summary";
import { formatClock } from "@/lib/game/format";
import type { PathNode } from "@/lib/game/use-run";
import { cn } from "@/lib/utils";

interface RunPanelProps {
  target: string;
  stageIndex: number;
  stageCount: number;
  path: PathNode[];
  currentNodeId: number;
  elapsedMs: number;
  running: boolean;
  disabled: boolean;
  onJumpTo: (nodeId: number) => void;
  onGiveUp: () => void;
}

/**
 * Everything about the run that is not the article, in two layouts, because
 * they are genuinely different instruments. Beside the page there is room to
 * keep the clock, the target and the whole trail open permanently; on a phone
 * there is no column for them, so it collapses to a strip carrying what must
 * never scroll away, with the trail a tap behind it.
 *
 * They are exported separately rather than wrapped together because their
 * position in the document differs: the bar has to come *before* the article so
 * it sits at the top of the stack on a phone, while the panel has to come
 * *after* it to land in the right-hand column on a wide screen.
 */
export function RunPanelDesktop({
  target,
  stageIndex,
  stageCount,
  path,
  currentNodeId,
  elapsedMs,
  running,
  disabled,
  onJumpTo,
  onGiveUp,
}: RunPanelProps) {
  // Scrolls rather than clips. The graph takes the remaining height when there
  // is room and shrinks to its floor when there is not — but on a short window
  // even that floor overflows, and without a scrollbar the bottom of the panel
  // would simply be unreachable.
  return (
    <aside className="hidden h-full w-[18rem] shrink-0 flex-col overflow-y-auto border-l border-line lg:flex xl:w-[20rem]">
      {/*
        Same height as the wordmark and article headers to its left, so the
        three read as one bar across the top of the page rather than three
        stacked boxes. That leaves no room for a "Time" label above the clock —
        no loss, since a running monospace timer needs no caption.
      */}
      <div className="flex h-[4.75rem] shrink-0 items-center gap-3 px-5">
        <Timer
          className={cn(
            "size-6 shrink-0 stroke-[2.25] transition-colors",
            running ? "text-[var(--color-backdrop-ink)]/55" : "text-faint",
          )}
          aria-hidden
        />
        <Clock
          ms={elapsedMs}
          className={cn(
            "font-display text-[2rem] leading-none font-medium tracking-[-0.02em] transition-colors",
            !running && "text-muted",
          )}
        />
      </div>

      {/*
        The target only. Where a run started is neither actionable nor worth
        remembering mid-run — and it is already the first row of the path
        below — so the space goes to the thing you are actually chasing.
      */}
      <div className="p-5">
        <div className="font-display mb-2.5 text-sm font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
          {stageCount > 1
            ? `Target ${stageIndex + 1} of ${stageCount}`
            : "Target"}
        </div>
        <Target title={target} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-5">
        <div className="font-display mb-2.5 shrink-0 text-sm font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
          Path
        </div>
        <PathList
          path={path}
          currentNodeId={currentNodeId}
          stage={stageIndex}
          disabled={disabled}
          onJumpTo={onJumpTo}
          className="-mx-2 min-h-0 flex-1"
        />
      </div>

      <div className="sticky bottom-0 flex justify-center bg-canvas p-5">
        <Button
          size="md"
          variant="play"
          className="w-1/2 rounded-full font-display font-bold"
          onClick={onGiveUp}
        >
          <Flag
            className="size-4 stroke-[2.5] [&>path]:fill-white"
            aria-hidden
          />
          Give up
        </Button>
      </div>
    </aside>
  );
}

/**
 * The running clock.
 *
 * Fredoka has no tabular figures — `font-variant-numeric: tabular-nums` is
 * simply ignored, and its digits range from 11.5px to 17.5px wide at this
 * size. On a readout that repaints every frame that means the whole clock
 * shuffles sideways as the hundredths tick over.
 *
 * So each digit gets its own box exactly one `ch` wide — the width of a zero
 * in the current font — and is centred inside it. Punctuation keeps its
 * natural width. That buys back fixed-width behaviour without giving up the
 * display face, which mono would have.
 */
function Clock({ ms, className }: { ms: number; className?: string }) {
  const text = formatClock(ms);

  return (
    <div
      className={className}
      role="timer"
      aria-live="off"
      aria-label={text}
    >
      {text.split("").map((character, index) => (
        <span
          key={index}
          aria-hidden
          className={
            character >= "0" && character <= "9"
              ? "inline-block w-[1ch] text-center"
              : "inline-block"
          }
        >
          {character}
        </span>
      ))}
    </div>
  );
}

/**
 * The target, set directly on the panel rather than in a card.
 *
 * The boxed treatment belongs to the reveal, where two endpoints face each
 * other and each needs its own edge to sit inside. Here there is only one, and
 * a section label above it — the same shape as Path below — says what it is
 * without drawing a frame around it.
 */
function Target({ title }: { title: string }) {
  const summary = useSummary(title);

  return (
    <div className="flex items-center gap-3">
      <div className="size-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-black/5">
        {summary?.thumbnail ? (
          <img
            src={summary.thumbnail.source}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <BookOpen
              className="size-7 stroke-[1.75] text-[var(--color-backdrop-ink)]/45"
              aria-label="Article image unavailable"
            />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-display line-clamp-2 text-[1.125rem] leading-tight font-bold text-[var(--color-backdrop-ink)]">
          {title}
        </div>
        {summary?.description && (
          <p className="font-display mt-1 line-clamp-2 text-[0.75rem] leading-snug text-muted">
            {summary.description}
          </p>
        )}
      </div>
    </div>
  );
}

export function RunPanelMobile({
  target,
  stageIndex,
  stageCount,
  path,
  currentNodeId,
  elapsedMs,
  running,
  disabled,
  onJumpTo,
  onGiveUp,
}: RunPanelProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="z-30 shrink-0 border-b border-line bg-canvas/90 backdrop-blur-md lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
      >
        <Clock
          ms={elapsedMs}
          className={cn(
            "font-display shrink-0 text-[1.1875rem] leading-none font-medium tracking-[-0.02em]",
            !running && "text-muted",
          )}
        />
        <span className="font-display min-w-0 flex-1 truncate pl-2 text-right text-[0.8125rem] font-semibold tracking-[-0.01em]">
          <span className="mr-1.5 text-faint">
            {stageIndex + 1}/{stageCount}
          </span>
          {target}
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
          <div className="font-display mb-2.5 text-sm font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
            Target
          </div>
          <div className="mb-5">
            <Target title={target} />
          </div>

          <div className="font-display mb-2.5 text-sm font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
            Path
          </div>
          <PathList
            path={path}
            currentNodeId={currentNodeId}
            stage={stageIndex}
            disabled={disabled}
            onJumpTo={(nodeId) => {
              onJumpTo(nodeId);
              setOpen(false);
            }}
            className="-mx-2 max-h-[15rem]"
          />

          <div className="mt-4 flex justify-center">
            <Button
              size="md"
              variant="play"
              className="w-1/2 rounded-full font-display font-bold"
              onClick={onGiveUp}
            >
              <Flag
                className="size-4 stroke-[2.5] [&>path]:fill-white"
                aria-hidden
              />
              Give up
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
