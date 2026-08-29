"use client";

import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";
import { useSummary } from "@/lib/game/use-summary";
import type { Puzzle } from "@/lib/game/types";

/** Seconds the pairing is on screen before the clock starts. */
const COUNT_FROM = 3;

interface RevealProps {
  puzzle: Puzzle;
  /** False once the start article has arrived and the run can begin. */
  waiting: boolean;
  onElapsed: () => void;
}

/**
 * The moment the pairing is revealed.
 *
 * The endpoints are deliberately hidden until now — a run you can preview and
 * reshuffle is a different game from one you are dealt. This is also where the
 * start article loads, so the countdown is doing real work rather than
 * manufacturing suspense: by the time it reaches zero the page is usually
 * already fetched, and the clock starts on a warm article.
 */
export function Reveal({ puzzle, waiting, onElapsed }: RevealProps) {
  const [count, setCount] = useState(COUNT_FROM);

  useEffect(() => {
    if (count <= 0) return;

    const timer = setTimeout(() => setCount((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [count]);

  // Announce the end of the countdown once, and let the reducer decide whether
  // that means "start now" or "start as soon as the article lands".
  useEffect(() => {
    if (count > 0) return;
    onElapsed();
  }, [count, onElapsed]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        {puzzle.targets.length > 1 && (
          <div className="font-display mb-8 text-center text-sm font-bold text-[var(--color-play)]">
            {puzzle.targets.length === 3 ? "Relay" : "Marathon"} · {puzzle.targets.length}{" "}
            targets
          </div>
        )}
        <Endpoint label="Start" title={puzzle.start} />

        <div className="flex justify-center py-4" aria-hidden>
          <ArrowDown className="size-4 text-faint" />
        </div>

        <Endpoint
          label={puzzle.targets.length > 1 ? `Target 1 of ${puzzle.targets.length}` : "Target"}
          title={puzzle.targets[0]}
          accent
        />
      </div>

      <div className="mt-12 flex h-16 items-center justify-center">
        {count > 0 ? (
          <span
            key={count}
            className="tnum animate-[reveal-count_1s_ease-out] font-mono text-[3.5rem] leading-none font-medium tracking-[-0.04em] text-[var(--color-play)]"
            aria-live="polite"
          >
            {count}
          </span>
        ) : (
          <span className="text-[0.8125rem] text-muted">
            {waiting ? "Loading the first article…" : "Go"}
          </span>
        )}
      </div>
    </div>
  );
}

function Endpoint({
  label,
  title,
  accent = false,
}: {
  label: string;
  title: string;
  accent?: boolean;
}) {
  const summary = useSummary(title);

  return (
    <div className="text-center">
      <div className="label mb-2">{label}</div>

      <div className="flex flex-col items-center gap-2.5">
        {summary?.thumbnail && (
          <img
            src={summary.thumbnail.source}
            alt=""
            className="size-14 rounded-[8px] border border-line object-cover"
          />
        )}
        <div>
          <div
            className={`text-[1.375rem] leading-tight font-bold tracking-[-0.02em] ${accent ? "text-[var(--color-play)]" : ""}`}
          >
            {title}
          </div>
          {summary?.description && (
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
              {summary.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
