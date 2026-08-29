"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Dices,
  Flame,
  Leaf,
  Loader2,
  Milestone,
  Route,
  Shield,
  Zap,
} from "lucide-react";
import { ArticleSearch } from "@/components/game/article-search";
import { Backdrop } from "./backdrop";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import {
  DIFFICULTIES,
  DIFFICULTY_META,
  RUN_LENGTHS,
} from "@/lib/game/types";
import type { Difficulty, Puzzle, RunLength } from "@/lib/game/types";
import { cn } from "@/lib/utils";

type Source = "random" | "custom";
type HomeMode = "solo" | "daily" | "create" | "join";
type ActiveModal = HomeMode | "help";

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
    Icon: Shield,
    fillClass: "[&>path]:fill-white",
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

const MODE_META = {
  solo: {
    label: "Solo Run",
    gradient:
      "linear-gradient(135deg, #3f45c8 0%, #0b91b7 100%)",
    depth: "#1b327f",
    glow: "rgba(34, 92, 172, 0.3)",
  },
  daily: {
    label: "Daily Challenge",
    gradient:
      "linear-gradient(135deg, #c54b22 0%, #b98b0e 100%)",
    depth: "#6e2d0d",
    glow: "rgba(149, 75, 15, 0.3)",
  },
  create: {
    label: "Create Room",
    gradient:
      "linear-gradient(135deg, #087b4d 0%, #078d9e 100%)",
    depth: "#04483e",
    glow: "rgba(5, 102, 93, 0.28)",
  },
  join: {
    label: "Join Room",
    gradient:
      "linear-gradient(135deg, #5b3ec2 0%, #b23877 100%)",
    depth: "#3e216f",
    glow: "rgba(102, 46, 135, 0.28)",
  },
} as const;

function ModeButton({
  mode,
  onSelect,
  disabled = false,
}: {
  mode: HomeMode;
  onSelect: (mode: HomeMode) => void;
  disabled?: boolean;
}) {
  const meta = MODE_META[mode];

  return (
    <Button
      type="button"
      variant="secondary"
      size="xl"
      onClick={() => onSelect(mode)}
      disabled={disabled}
      className="font-display relative min-h-[6rem] w-full rounded-[22px] border-0 text-[1.15rem] font-bold tracking-[0.06em] text-white transition-[transform,filter,box-shadow] duration-150 hover:brightness-[1.06] active:translate-y-0.5 active:brightness-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-play)] disabled:opacity-70 disabled:hover:brightness-100"
      style={{
        background: meta.gradient,
        boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 4px 7px -2px rgba(0, 0, 0, 0.55), 0 8px 18px ${meta.glow}`,
        textShadow: `0 1px 2px ${meta.depth}`,
      }}
    >
      {meta.label}
      {disabled && (
        <span className="absolute top-2.5 right-2.5 rounded-full border border-white/35 bg-white/15 px-1.5 py-0.5 text-[0.5625rem] leading-none font-bold tracking-[0.1em] text-white/90 uppercase">
          Coming soon
        </span>
      )}
    </Button>
  );
}

/**
 * The front door: everything needed to start a run, on one screen.
 *
 * The pairing is deliberately not shown here. The endpoints appear on the
 * reveal after the player commits, where a random run can be rerolled before
 * the clock begins.
 */
export function Home({ backdropTerms }: { backdropTerms: string[] }) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<ActiveModal | null>(null);
  const [source, setSource] = useState<Source>("random");
  const [runLength, setRunLength] = useState<RunLength>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customStart, setCustomStart] = useState("");
  const [customTarget, setCustomTarget] = useState("");

  const closeSolo = useCallback(() => {
    setSource("random");
    setRunLength(1);
    setDifficulty("medium");
    setCustomStart("");
    setCustomTarget("");
    setStarting(false);
    setError(null);
    setActiveMode(null);
  }, []);

  const customReady = Boolean(
    customStart && customTarget && customStart !== customTarget,
  );
  const soloReady = source === "random" ? !starting : customReady && !starting;

  const swapCustomEndpoints = useCallback(() => {
    if (!customReady) return;
    setCustomStart(customTarget);
    setCustomTarget(customStart);
  }, [customReady, customStart, customTarget]);

  const startSolo = useCallback(async () => {
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

  const startDaily = useCallback(async () => {
    if (starting) return;

    setStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/puzzle?difficulty=medium&stages=3");
      if (!response.ok) throw new Error("no puzzle");
      const puzzle = (await response.json()) as Puzzle;

      const playParams = new URLSearchParams({
        mode: "daily",
        start: puzzle.start,
        difficulty: "medium",
        reveal: "1",
      });
      for (const target of puzzle.targets) {
        playParams.append("target", target);
      }
      router.push(`/play?${playParams.toString()}`);
    } catch {
      setError("Could not load the daily challenge. Try again.");
      setStarting(false);
    }
  }, [router, starting]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-5 sm:py-16">
      <Backdrop terms={backdropTerms} />

      <div className="relative z-10 w-full max-w-[56rem] rounded-[22px] border-2 border-black bg-canvas px-4 pt-14 pb-12 shadow-[-5px_7px_0_rgba(11,26,74,0.1),-16px_30px_70px_-26px_rgba(10,24,80,0.62),-5px_12px_26px_-14px_rgba(10,24,80,0.34),0_2px_8px_rgba(10,24,80,0.14)] sm:px-10 sm:pt-16 sm:pb-20">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => setActiveMode("help")}
          aria-label="How to play"
          title="How to play"
          className="font-display absolute top-4 right-4 size-9 rounded-full border border-black/20 bg-white p-0 text-base font-bold text-[var(--color-backdrop-ink)]/60 shadow-none hover:border-black/35 hover:bg-black/[0.035] hover:text-[var(--color-backdrop-ink)] sm:top-5 sm:right-5"
        >
          ?
        </Button>

        <h1 className="font-display text-center text-[clamp(2.5rem,8vw,4rem)] leading-[0.95] font-semibold tracking-[-0.025em]">
          wiki<span className="logo-dash">dash</span>.io
        </h1>

        <p className="font-display mt-5 text-center text-lg font-medium text-muted">
          Race through Wikipedia. Beat the clock. Links only.
        </p>

        <div className="mx-auto mt-14 max-w-[44rem]">
          <div className="sm:hidden">
            <div className="font-display text-center text-base font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
              Singleplayer
            </div>
            <div className="mt-6 space-y-3">
              <ModeButton mode="solo" onSelect={setActiveMode} />
              <ModeButton mode="daily" onSelect={setActiveMode} />
            </div>

            <div className="my-7 flex items-center gap-3" aria-hidden>
              <div className="h-0.5 flex-1 rounded-full bg-black/18" />
              <div className="font-display flex size-12 items-center justify-center rounded-full bg-canvas text-sm font-bold tracking-[0.08em] text-black/28 uppercase">
                Or
              </div>
              <div className="h-0.5 flex-1 rounded-full bg-black/18" />
            </div>

            <div className="font-display text-center text-base font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
              Party
            </div>
            <div className="mt-6 space-y-3">
              <ModeButton mode="create" onSelect={setActiveMode} disabled />
              <ModeButton mode="join" onSelect={setActiveMode} disabled />
            </div>
          </div>

          <div className="hidden grid-cols-2 gap-x-28 gap-y-6 sm:grid">
            <div className="font-display text-center text-base font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
              Singleplayer
            </div>
            <div className="font-display text-center text-base font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
              Party
            </div>

            <div className="relative col-span-2 grid grid-cols-2 gap-x-28">
              <div
                className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-black/14"
                aria-hidden
              />
              <div
                className="font-display absolute top-1/2 left-1/2 z-10 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-canvas text-sm font-bold tracking-[0.08em] text-black/28 uppercase"
                aria-hidden
              >
                Or
              </div>

              <div className="space-y-3">
                <ModeButton mode="solo" onSelect={setActiveMode} />
                <ModeButton mode="daily" onSelect={setActiveMode} />
              </div>

              <div className="space-y-3">
                <ModeButton mode="create" onSelect={setActiveMode} disabled />
                <ModeButton mode="join" onSelect={setActiveMode} disabled />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-center text-[0.8125rem] text-bad">{error}</p>
        )}
      </div>

      <p className="font-display relative z-10 mt-5 w-full max-w-[56rem] px-4 text-center text-[0.8125rem] leading-relaxed font-medium text-white/85 md:whitespace-nowrap">
        Wikidash uses{" "}
        <a
          href="https://www.wikipedia.org/"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-white/55 underline-offset-2 transition-colors hover:text-white"
        >
          Wikipedia
        </a>{" "}
        content and is not affiliated with the{" "}
        <a
          href="https://wikimediafoundation.org/"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-white/55 underline-offset-2 transition-colors hover:text-white"
        >
          Wikimedia Foundation
        </a>
        .
      </p>

      <Modal
        open={activeMode === "help"}
        onClose={() => setActiveMode(null)}
        title={<span className="text-lg font-semibold">How to play</span>}
        className="w-[min(34rem,calc(100vw-2rem))]"
      >
        <ol className="space-y-4 pb-4">
          <li className="flex items-start gap-3">
            <span className="font-display flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e7efff] text-sm font-bold text-[var(--color-backdrop-ink)]">
              1
            </span>
            <p className="font-display pt-1 text-sm leading-relaxed text-[var(--color-backdrop-ink)]/75">
              Start at the source Wikipedia article.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-display flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e7efff] text-sm font-bold text-[var(--color-backdrop-ink)]">
              2
            </span>
            <p className="font-display pt-1 text-sm leading-relaxed text-[var(--color-backdrop-ink)]/75">
              Navigate using only links inside each article.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-display flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e7efff] text-sm font-bold text-[var(--color-backdrop-ink)]">
              3
            </span>
            <p className="font-display pt-1 text-sm leading-relaxed text-[var(--color-backdrop-ink)]/75">
              Reach every target as quickly as you can.
            </p>
          </li>
        </ol>
      </Modal>

      <Modal
        open={activeMode === "solo"}
        onClose={closeSolo}
        title={<span className="text-lg font-semibold">Solo run</span>}
        className="h-[30rem] w-[min(42rem,calc(100vw-2rem))]"
        footer={
          <Button
            variant="play"
            size="lg"
            className="font-display h-[3.25rem] w-full rounded-full px-8 text-base font-bold tracking-[0.12em] uppercase"
            disabled={!soloReady}
            onClick={startSolo}
          >
            {starting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Drawing…
              </>
            ) : (
              "Play!"
            )}
          </Button>
        }
      >
        <div className="space-y-5">
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
                          className={cn("size-4 stroke-[2.5]", style.fillClass)}
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
            <div className="mt-1 flex flex-col gap-2.5">
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
                <ArrowUpDown className="size-4 stroke-[2.5]" aria-hidden />
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
      </Modal>

      <Modal
        open={activeMode === "daily"}
        onClose={() => setActiveMode(null)}
        title={<span className="text-lg font-semibold">Daily challenge</span>}
        className="w-[min(38rem,calc(100vw-2rem))]"
        footer={
          <Button
            variant="play"
            size="lg"
            className="font-display h-[3.25rem] w-full rounded-full px-8 text-base font-bold tracking-[0.12em] uppercase"
            disabled={starting}
            onClick={startDaily}
          >
            {starting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Drawing…
              </>
            ) : (
              "Play!"
            )}
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="font-display text-sm leading-snug text-[var(--color-backdrop-ink)]/70">
            A single daily pairing keeps the homepage simple and gives players a
            reason to return.
          </p>
        </div>
      </Modal>
    </div>
  );
}
