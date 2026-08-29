"use client";

import { useEffect } from "react";
import { ArrowRight, Dices } from "lucide-react";
import { Backdrop } from "@/components/home/backdrop";
import { EndpointCard } from "@/components/game/endpoint-card";
import { Button } from "@/components/ui/button";
import type { Puzzle } from "@/lib/game/types";

const REVEAL_DURATION_MS = 3000;

interface RevealProps {
  puzzle: Puzzle;
  backdropTerms: string[];
  onElapsed: () => void;
  onReroll?: () => void;
  rerolling?: boolean;
  rerollError?: string | null;
}

/**
 * Show the dealt pairing only while the source article loads. The backdrop is
 * decorative here, so its Wikipedia words are deliberately not links.
 */
export function Reveal({
  puzzle,
  backdropTerms,
  onElapsed,
  onReroll,
  rerolling = false,
  rerollError,
}: RevealProps) {
  const pairingKey = [puzzle.start, ...puzzle.targets].join("→");

  useEffect(() => {
    if (rerolling) return;
    const timer = window.setTimeout(onElapsed, REVEAL_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onElapsed, pairingKey, rerolling]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-5 sm:py-16">
      <Backdrop terms={backdropTerms} interactive={false} />

      <div className="relative z-10 w-full max-w-[56rem] rounded-[22px] bg-canvas px-6 py-14 shadow-[-5px_7px_0_rgba(11,26,74,0.1),-16px_30px_70px_-26px_rgba(10,24,80,0.62),-5px_12px_26px_-14px_rgba(10,24,80,0.34),0_2px_8px_rgba(10,24,80,0.14)] sm:px-16 sm:py-16">
        <h1 className="font-display text-center text-[clamp(2.5rem,8vw,4rem)] leading-[0.95] font-semibold tracking-[-0.025em]">
          wiki<span className="text-link underline decoration-[0.11em] underline-offset-[0.13em]">dash</span>.io
        </h1>

        <p className="font-display mt-5 text-center text-lg font-medium text-muted">
          Two articles. One clock. Links only.
        </p>

        <div className="mx-auto mt-9 max-w-[34rem]">
          <div className="flex h-[24.75rem] flex-col justify-center sm:h-[22.5rem]">
            <div className="relative grid grid-cols-2 gap-16 sm:gap-20">
              <EndpointCard label="Source" title={puzzle.start} />
              <div
                className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                aria-hidden
              >
                <ArrowRight className="h-7 w-16 stroke-[3.5] text-black sm:w-20" />
              </div>
              <EndpointCard label="Target" title={puzzle.targets[0]} />
            </div>

            <div
              className="relative mx-auto mt-8 flex h-7 w-full max-w-[22rem] items-center justify-center overflow-hidden rounded-full bg-black/10"
              role="progressbar"
              aria-label="Preparing run"
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                key={pairingKey}
                className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-[var(--color-play-button)]"
                style={{
                  animation: `pairing-progress ${REVEAL_DURATION_MS}ms linear forwards`,
                }}
              />
              <span className="font-display relative z-10 text-sm font-bold tracking-[0.08em] text-black uppercase">
                Get ready
              </span>
            </div>
          </div>

          <div className="mt-8 flex h-[3.25rem] justify-center">
            {onReroll && (
              <Button
                variant="play"
                size="lg"
                className="font-display h-[3.25rem] min-w-[12.5rem] rounded-full px-8 text-base font-bold tracking-[0.12em] uppercase"
                disabled={rerolling}
                onClick={onReroll}
                aria-busy={rerolling}
              >
                <Dices
                  className={`size-5 ${rerolling ? "animate-spin" : ""}`}
                  aria-hidden
                />
                Reroll
              </Button>
            )}
          </div>

          {rerollError && (
            <span className="sr-only" role="alert">
              {rerollError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
