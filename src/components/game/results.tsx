"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Splits } from "./splits";
import { formatClock, shareText } from "@/lib/game/format";
import { personalBest } from "@/lib/game/storage";
import type { RunRecord } from "@/lib/game/types";
import type { TrailEntry } from "@/lib/game/use-run";
import type { PathResult } from "@/lib/wiki/pathfinder";
import { cn } from "@/lib/utils";

interface ResultsProps {
  record: RunRecord;
  trail: TrailEntry[];
  startedAt: number;
  onPlayAgain: () => void;
  onRerun: () => void;
}

/**
 * The results screen answers the question the run itself cannot: how good was
 * that? Raw time means little on its own, so the route is scored against the
 * shortest path that existed — computed only now, because computing it any
 * earlier would have meant handing the player the answer.
 */
export function Results({
  record,
  trail,
  startedAt,
  onPlayAgain,
  onRerun,
}: ResultsProps) {
  const par = usePar(record.start, record.target);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  // Compare against earlier attempts, excluding the run that just finished.
  const [best] = useState(() => {
    const previous = personalBest(record.start, record.target)?.elapsedMs;
    return previous !== undefined && previous < record.elapsedMs
      ? previous
      : null;
  });

  const wasted =
    par?.clicks != null ? Math.max(0, record.clicks - par.clicks) : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        shareText(record, par?.clicks ?? null),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-text/25 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 max-h-[88dvh] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[12px] border border-line bg-canvas shadow-[0_16px_48px_rgba(0,0,0,0.16)]"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="border-b border-line px-6 pt-6 pb-5">
            <Dialog.Title className="label">
              {record.daily ? `Daily ${record.daily}` : "Run complete"}
            </Dialog.Title>

            <div className="tnum mt-2 font-mono text-[2.75rem] leading-none font-medium tracking-[-0.03em]">
              {formatClock(record.elapsedMs)}
            </div>

            <Dialog.Description className="mt-2.5 text-[0.9375rem]">
              <span className="font-medium">{record.start}</span>
              <span className="mx-1.5 text-faint">→</span>
              <span className="font-medium">{record.target}</span>
            </Dialog.Description>
          </div>

          <dl className="grid grid-cols-3 border-b border-line">
            <Stat label="Clicks" value={String(record.clicks)} />
            <Stat
              label="Par"
              value={
                par === null
                  ? null
                  : par.clicks === null
                    ? "—"
                    : String(par.clicks)
              }
              bordered
            />
            <Stat
              label="Over par"
              value={
                wasted === null ? null : wasted === 0 ? "None" : `+${wasted}`
              }
              tone={wasted === 0 ? "good" : wasted ? "bad" : undefined}
              bordered
            />
          </dl>

          <div className="px-6 py-5">
            {best !== null && (
              <p className="mb-5 text-[0.8125rem] text-muted">
                Your best on this pairing is{" "}
                <span className="tnum font-mono text-text">
                  {formatClock(best)}
                </span>
                .
              </p>
            )}

            <div className="label mb-2">Splits</div>
            <Splits
              trail={trail}
              startedAt={startedAt}
              par={par?.clicks ?? null}
            />

            {par?.path && (
              <div className="mt-5">
                <div className="label mb-2">
                  {par.optimal ? "Shortest route" : "Best route found"}
                </div>
                <p className="text-[0.8125rem] leading-relaxed">
                  {par.path.map((step, index) => (
                    <span key={`${step}-${index}`}>
                      {index > 0 && <span className="text-faint"> › </span>}
                      <span className={index === 0 ? "text-muted" : undefined}>
                        {step}
                      </span>
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line px-6 py-4">
            <Button variant="primary" onClick={onPlayAgain}>
              New run
            </Button>
            <Button onClick={onRerun}>Retry this one</Button>
            <Button variant="ghost" onClick={copy}>
              {copied ? (
                <Check className="size-3.5" aria-hidden />
              ) : (
                <Copy className="size-3.5" aria-hidden />
              )}
              {copied ? "Copied" : "Copy result"}
            </Button>
            {copyFailed && (
              <span className="text-xs text-bad">
                Clipboard blocked — copy the time manually.
              </span>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Stat({
  label,
  value,
  tone,
  bordered,
}: {
  label: string;
  value: string | null;
  tone?: "good" | "bad";
  bordered?: boolean;
}) {
  return (
    <div className={cn("px-6 py-4", bordered && "border-l border-line")}>
      <dt className="label">{label}</dt>
      <dd
        className={cn(
          "tnum mt-1 font-mono text-lg",
          tone === "good" && "text-good",
          tone === "bad" && "text-bad",
        )}
      >
        {value ?? (
          <Loader2 className="size-4 animate-spin text-faint" aria-hidden />
        )}
      </dd>
    </div>
  );
}

/**
 * Par is fetched after the run rather than before — both because the search
 * takes a few seconds and because knowing it mid-run would spoil the puzzle.
 */
function usePar(start: string, target: string): PathResult | null {
  const [par, setPar] = useState<PathResult | null>(null);

  useEffect(() => {
    let active = true;

    fetch(
      `/api/path?from=${encodeURIComponent(start)}&to=${encodeURIComponent(target)}`,
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data: PathResult | null) => {
        if (active && data) setPar(data);
      })
      .catch(() => {
        // Par is a nice-to-have; the result stands without it.
      });

    return () => {
      active = false;
    };
  }, [start, target]);

  return par;
}
