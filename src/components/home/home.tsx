"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Dices,
  Flame,
  Gauge,
  Leaf,
  Loader2,
  Milestone,
  Route,
  Zap,
} from "lucide-react";
import { ArticleSearch } from "@/components/game/article-search";
import { Backdrop } from "./backdrop";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import {
  DIFFICULTIES,
  DIFFICULTY_META,
  RUN_LENGTHS,
} from "@/lib/game/types";
import type { Difficulty, Puzzle, RunLength } from "@/lib/game/types";
import { cn } from "@/lib/utils";

type Source = "random" | "custom";

const SOURCES = [
  {
    value: "random",
    label: "Random Run",
  },
  { value: "custom", label: "Custom Run" },
] as const;

const DIFFICULTY_STYLE = {
  easy: {
    Icon: Leaf,
    fillClass: "[&>path:first-child]:fill-white",
    selected: "border-black bg-[#a9edb9]",
    idle: "border-black/35 bg-white hover:border-black/70",
  },
  medium: {
    Icon: Gauge,
    fillClass: "",
    selected: "border-black bg-[#73a4ff]",
    idle: "border-black/35 bg-white hover:border-black/70",
  },
  hard: {
    Icon: Flame,
    fillClass: "[&>path]:fill-white",
    selected: "border-black bg-[#ffc566]",
    idle: "border-black/35 bg-white hover:border-black/70",
  },
  chaos: {
    Icon: Dices,
    fillClass: "[&>rect]:fill-white",
    selected: "border-black bg-[#ff8fb3]",
    idle: "border-black/35 bg-white hover:border-black/70",
  },
} as const;

const RUN_LENGTH_META = {
  1: {
    label: "Sprint",
    detail: "1 target",
    Icon: Zap,
    fillClass: "[&>path]:fill-white",
  },
  3: {
    label: "Relay",
    detail: "3 targets",
    Icon: Milestone,
    fillClass: "[&>path:last-child]:fill-white",
  },
  5: {
    label: "Marathon",
    detail: "5 targets",
    Icon: Route,
    fillClass: "[&>circle]:fill-white",
  },
} as const;

/**
 * The front door: everything needed to start a run, on one screen.
 *
 * The pairing is deliberately not shown here. The endpoints appear on the
 * reveal after the player commits, where a random run can be rerolled before
 * the clock begins.
 */
export function Home({ backdropTerms }: { backdropTerms: string[] }) {
  const router = useRouter();
  const [source, setSource] = useState<Source>("random");
  const [runLength, setRunLength] = useState<RunLength>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customStart, setCustomStart] = useState("");
  const [customTarget, setCustomTarget] = useState("");

  const customReady = Boolean(
    customStart && customTarget && customStart !== customTarget,
  );
  const ready = source === "random" ? !starting : customReady && !starting;

  const swapCustomEndpoints = useCallback(() => {
    if (!customReady) return;
    setCustomStart(customTarget);
    setCustomTarget(customStart);
  }, [customReady, customStart, customTarget]);

  const start = useCallback(async () => {
    if (source === "custom") {
      if (!customReady) return;
      router.push(
        `/play?mode=custom&start=${encodeURIComponent(customStart)}&target=${encodeURIComponent(customTarget)}&reveal=1`,
      );
      return;
    }

    // The puzzle is drawn on click rather than on load, so nothing about the
    // pairing exists on this screen before you commit to it.
    setStarting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/puzzle?difficulty=${difficulty}&stages=${runLength}`,
      );
      if (!response.ok) throw new Error("no puzzle");
      const puzzle = (await response.json()) as Puzzle;

      const playParams = new URLSearchParams({
        mode: "random",
        start: puzzle.start,
        difficulty,
        reveal: "1",
      });
      for (const target of puzzle.targets) {
        playParams.append("target", target);
      }
      router.push(`/play?${playParams.toString()}`);
    } catch {
      setError("Could not draw a pairing. Try again.");
      setStarting(false);
    }
  }, [
    customReady,
    customStart,
    customTarget,
    difficulty,
    router,
    runLength,
    source,
  ]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-5 sm:py-16">
      <Backdrop terms={backdropTerms} />

      <div className="relative z-10 w-full max-w-[56rem] rounded-[22px] bg-canvas px-6 py-14 shadow-[-5px_7px_0_rgba(11,26,74,0.1),-16px_30px_70px_-26px_rgba(10,24,80,0.62),-5px_12px_26px_-14px_rgba(10,24,80,0.34),0_2px_8px_rgba(10,24,80,0.14)] sm:px-16 sm:py-16">
        <h1 className="font-display text-center text-[clamp(2.5rem,8vw,4rem)] leading-[0.95] font-semibold tracking-[-0.025em]">
          wiki<span className="text-link underline decoration-[0.11em] underline-offset-[0.13em]">dash</span>.io
        </h1>

        <p className="font-display mt-5 text-center text-lg font-medium text-muted">
          Two articles. One clock. Links only.
        </p>

        <div className="mx-auto mt-9 max-w-[34rem]">
          <div className="h-[24.75rem] rounded-[20px] p-4 sm:h-[22.5rem] sm:p-5">
            <div className="font-display mb-2.5 text-center text-xs font-bold tracking-[0.12em] text-[var(--color-backdrop-ink)] uppercase">
              Game mode
            </div>
            <Segmented
              label="Pairing source"
              options={SOURCES}
              value={source}
              onChange={(value) => setSource(value)}
            />

            {source === "random" ? (
              <>
                <fieldset className="mt-5">
                  <legend className="font-display mb-2.5 w-full text-center text-xs font-bold tracking-[0.12em] text-[var(--color-backdrop-ink)] uppercase">
                    Run length
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {RUN_LENGTHS.map((length) => {
                      const active = length === runLength;
                      const meta = RUN_LENGTH_META[length];
                      const Icon = meta.Icon;

                      return (
                        <button
                          key={length}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setRunLength(length)}
                          className={cn(
                            "font-display flex min-h-[3.25rem] items-center justify-center gap-1.5 rounded-xl border-2 px-1.5 py-2 text-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-play)]",
                            active
                              ? "border-black bg-[#ffad4a]"
                              : "border-black/35 bg-white hover:border-black/70 hover:bg-[#eef3ff]",
                          )}
                        >
                          <Icon
                            className={cn(
                              "hidden size-5 shrink-0 stroke-[2.5] sm:block",
                              meta.fillClass,
                            )}
                            aria-hidden
                          />
                          <span className="leading-none">
                            <span className="block text-sm leading-[1.05] font-bold">
                              {meta.label}
                            </span>
                            <span className="mt-0.5 block text-[0.625rem] leading-none font-medium opacity-65">
                              {meta.detail}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="mt-6">
                  <legend className="font-display mb-2.5 w-full text-center text-xs font-bold tracking-[0.12em] text-[var(--color-backdrop-ink)] uppercase">
                    Difficulty
                  </legend>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {DIFFICULTIES.map((id) => {
                      const active = id === difficulty;
                      const style = DIFFICULTY_STYLE[id];
                      const Icon = style.Icon;

                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setDifficulty(id)}
                          className={cn(
                            "font-display flex min-h-10 items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2 text-sm font-bold text-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-play)]",
                            active ? style.selected : style.idle,
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-4 stroke-[2.5]",
                              style.fillClass,
                            )}
                            aria-hidden
                          />
                          <span>{DIFFICULTY_META[id].label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="font-display mt-4 min-h-5 text-center text-sm font-medium text-[var(--color-backdrop-ink)]/70">
                    {DIFFICULTY_META[difficulty].blurb}
                  </p>
                </fieldset>
              </>
            ) : (
              <div className="mt-5 flex h-[15rem] flex-col justify-center gap-2.5 sm:h-[13rem]">
                <ArticleSearch
                  label="From"
                  value={customStart}
                  onChange={setCustomStart}
                  placeholder="Search articles…"
                />
                <Button
                  type="button"
                  variant="play"
                  size="md"
                  disabled={!customReady}
                  onClick={swapCustomEndpoints}
                  aria-label="Swap starting and target articles"
                  title="Swap From and To"
                  className="mx-auto size-9 shrink-0 translate-y-2 rounded-full p-0"
                >
                  <ArrowUpDown
                    className="size-4 stroke-[2.5]"
                    aria-hidden
                  />
                </Button>
                <div className="-mt-1.5">
                  <ArticleSearch
                    label="To"
                    value={customTarget}
                    onChange={setCustomTarget}
                    placeholder="Search articles…"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <Button
              variant="play"
              size="lg"
              className="font-display h-[3.25rem] min-w-[12.5rem] rounded-full px-8 text-base font-bold tracking-[0.12em] uppercase"
              disabled={!ready}
              onClick={start}
            >
              {starting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Drawing…
                </>
              ) : (
                "Play"
              )}
            </Button>
          </div>

          {error && (
            <p className="mt-3 text-center text-[0.8125rem] text-bad">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
