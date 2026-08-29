"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import { ArticleView } from "@/components/game/article-view";
import { Results } from "@/components/game/results";
import { Reveal } from "@/components/game/reveal";
import { RouteList, ShortestRoute } from "@/components/game/route-list";
import {
  RunPanelDesktop,
  RunPanelMobile,
} from "@/components/game/run-panel";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { buildRunRecord, useElapsed, useRun } from "@/lib/game/use-run";
import { useShortestRoute } from "@/lib/game/use-shortest-route";
import { DIFFICULTIES, type Difficulty, type Puzzle } from "@/lib/game/types";

/**
 * The run, driven entirely by the URL.
 *
 * Putting the pairing in query params rather than in memory means a run is
 * shareable, survives a refresh, and can be linked to directly — none of which
 * would work if the home screen handed the puzzle over as component state.
 */
export function PlayClient({ backdropTerms }: { backdropTerms: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const { state, begin, restart, go, jumpToNode, revealElapsed, giveUp } =
    useRun();
  const elapsed = useElapsed(state.startedAt, state.finishedAt);
  const [rerolling, setRerolling] = useState(false);
  const [rerollError, setRerollError] = useState<string | null>(null);
  const [rerollPending, startRerollTransition] = useTransition();
  const rerollBusy = rerolling || rerollPending;

  const start = params.get("start");
  const targetsKey = params.getAll("target").filter(Boolean).join("\u001f");
  const rawDifficulty = params.get("difficulty") ?? "medium";
  const isRandomRun = params.get("mode") === "random";
  // Keep the transition intent stable after its one-use URL flag is removed.
  // Otherwise useSearchParams briefly rerenders the route as a refresh and
  // flashes the blank refresh fallback before the reveal state commits.
  const [showIntro] = useState(() => params.get("reveal") === "1");

  const puzzle: Puzzle | null = useMemo(() => {
    const targets = targetsKey ? targetsKey.split("\u001f") : [];
    if (!start || targets.length === 0) return null;
    return {
      start,
      targets,
      difficulty: DIFFICULTIES.includes(rawDifficulty as Difficulty)
        ? (rawDifficulty as Difficulty)
        : "medium",
    };
  }, [rawDifficulty, start, targetsKey]);

  // Start the run once the URL has been read, and again if the pairing changes.
  const pairing = puzzle
    ? [puzzle.start, ...puzzle.targets].join("→")
    : null;
  useEffect(() => {
    if (!puzzle) return;
    begin(puzzle, showIntro);

    // The reveal belongs to the transition from Home, not to the game URL.
    // Remove the one-use flag so refreshes and shared links start directly.
    if (showIntro) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("reveal");
      window.history.replaceState(
        null,
        "",
        `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`,
      );
    }
    // Keyed on the pairing rather than the puzzle object, which is rebuilt on
    // every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairing]);

  const reroll = useCallback(async () => {
    if (!puzzle || !isRandomRun || rerollBusy) return;

    setRerolling(true);
    setRerollError(null);

    try {
      let nextPuzzle: Puzzle | null = null;

      // A new pairing is what restarts the keyed reveal. Retry the extremely
      // unlikely duplicate draw instead of showing a full progress bar again.
      for (let attempt = 0; attempt < 3 && !nextPuzzle; attempt += 1) {
        const response = await fetch(
          `/api/puzzle?difficulty=${puzzle.difficulty}&stages=${puzzle.targets.length}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("no puzzle");

        const candidate = (await response.json()) as Puzzle;
        const candidatePairing = [candidate.start, ...candidate.targets].join("→");
        if (candidatePairing !== pairing) nextPuzzle = candidate;
      }

      if (!nextPuzzle) throw new Error("duplicate puzzle");

      const nextParams = new URLSearchParams({
        mode: "random",
        start: nextPuzzle.start,
        difficulty: nextPuzzle.difficulty,
        reveal: "1",
      });
      for (const target of nextPuzzle.targets) {
        nextParams.append("target", target);
      }
      setRerolling(false);
      startRerollTransition(() => {
        router.replace(`/play?${nextParams.toString()}`, { scroll: false });
      });
    } catch {
      setRerolling(false);
      setRerollError("Could not draw a new pairing. Try again.");
    }
  }, [isRandomRun, pairing, puzzle, rerollBusy, router]);

  /**
   * Build the record for a finished run — won or abandoned. Pure: persisting
   * happens in the effect below, because writing from inside a memo saves once
   * per render pass rather than once per run.
   */
  const finished = useMemo(() => {
    const over = state.status === "won" || state.status === "abandoned";
    if (!over) return null;
    if (!state.puzzle || state.startedAt === null || state.finishedAt === null) {
      return null;
    }

    return buildRunRecord({
      puzzle: state.puzzle,
      trail: state.trail,
      moves: state.moves,
      completedStages: state.completedStages,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
    });
    // Keyed on finishedAt so the record is rebuilt only when a run ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.finishedAt, state.status]);

  const goHome = useCallback(() => router.push("/"), [router]);

  const retry = useCallback(() => restart(), [restart]);

  useEffect(() => {
    if (
      state.status !== "playing" ||
      state.stageIndex === 0 ||
      !state.puzzle
    ) {
      return;
    }

    toast.success(`Stage ${state.stageIndex} complete`, {
      description: `Next target: ${state.puzzle.targets[state.stageIndex]}`,
    });
  }, [state.puzzle, state.stageIndex, state.status]);

  if (!puzzle) return <MissingPairing onHome={goHome} />;
  if (!state.puzzle) {
    return showIntro ? (
      <Reveal
        puzzle={puzzle}
        backdropTerms={backdropTerms}
        onElapsed={revealElapsed}
        onReroll={isRandomRun ? reroll : undefined}
        rerolling={rerollBusy}
        rerollError={rerollError}
      />
    ) : (
      <StartingGame />
    );
  }

  // The pairing is shown only while the source article loads.
  if (state.status === "revealing") {
    return state.showReveal ? (
      <Reveal
        puzzle={state.puzzle}
        backdropTerms={backdropTerms}
        onElapsed={revealElapsed}
        onReroll={isRandomRun ? reroll : undefined}
        rerolling={rerollBusy}
        rerollError={rerollError}
      />
    ) : (
      <StartingGame />
    );
  }

  const visited = state.trail.map((entry) => entry.title);
  const currentTarget = state.puzzle.targets[state.stageIndex];
  const stageStartIndex =
    state.stageStarts[state.stageStarts.length - 1] ?? 0;

  const panelProps = {
    target: currentTarget,
    stageIndex: state.stageIndex,
    stageCount: state.puzzle.targets.length,
    path: state.path,
    currentNodeId: state.currentNodeId,
    elapsedMs: elapsed,
    running: state.status === "playing" && state.startedAt !== null,
    disabled: state.loading || state.status !== "playing",
    onJumpTo: jumpToNode,
    onGiveUp: giveUp,
  };

  return (
    <div className="h-dvh overflow-hidden bg-[var(--color-backdrop)] p-2">
      <div className="relative flex h-[calc(100dvh-1rem)] flex-col overflow-clip rounded-[18px] bg-canvas shadow-[0_4px_0_rgba(11,26,74,0.12)] lg:flex-row">
        {state.loading && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-0.5 overflow-hidden">
            <div className="h-full w-1/3 animate-[slide_1s_ease-in-out_infinite] bg-link" />
          </div>
        )}

        {/*
          Document order is load-bearing: the bar renders before the article so
          it stacks at the top on a phone, the panel after it so it becomes the
          right-hand column on a wide screen. Each is hidden at the other size.
        */}
        <RunPanelMobile {...panelProps} />

        {/* The article takes every pixel the run panel does not. */}
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
          {state.error ? (
            <ErrorPanel message={state.error} onHome={goHome} onRetry={retry} />
          ) : (
            <ArticleView
              article={state.article}
              visited={visited}
              onNavigate={go}
              blockFind
              onExit={giveUp}
              onBlockedFind={() =>
                toast("Find is disabled", {
                  description:
                    "Read the page and pick a link — that is the game.",
                })
              }
            />
          )}
        </main>

        <RunPanelDesktop {...panelProps} />

        {state.status === "won" && finished && (
          <Results record={finished} onPlayAgain={goHome} onRerun={retry} />
        )}

        {state.status === "abandoned" && (
          <GaveUp
            stageStart={
              state.trail[stageStartIndex]?.title ?? state.puzzle.start
            }
            target={currentTarget}
            stageIndex={state.stageIndex}
            stageCount={state.puzzle.targets.length}
            trail={visited}
            onHome={goHome}
            onRetry={retry}
          />
        )}

        <Toaster position="top-center" />
      </div>
    </div>
  );
}

function StartingGame() {
  return (
    <div
      className="h-dvh overflow-hidden bg-[var(--color-backdrop)] p-2"
      aria-label="Preparing run"
    >
      <div className="h-[calc(100dvh-1rem)] rounded-[18px] bg-canvas" />
    </div>
  );
}

/**
 * The give-up screen shows the route that existed.
 *
 * Abandoning a run is the moment a player most wants to know what they missed,
 * and seeing that the answer was three clicks away is what makes the next run
 * tempting rather than the last one annoying.
 */
function GaveUp({
  stageStart,
  target,
  stageIndex,
  stageCount,
  trail,
  onHome,
  onRetry,
}: {
  stageStart: string;
  target: string;
  stageIndex: number;
  stageCount: number;
  trail: string[];
  onHome: () => void;
  onRetry: () => void;
}) {
  const shortest = useShortestRoute(stageStart, target);

  return (
    <Modal
      open
      eyebrow="Run abandoned"
      title={
        <p className="text-[1.25rem] leading-snug font-semibold tracking-[-0.02em]">
          {target} stays unbeaten.
        </p>
      }
      footer={
        <>
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
          <Button onClick={onHome}>New run</Button>
        </>
      }
    >
      {stageCount > 1 && (
        <p className="mb-5 text-[0.8125rem] text-muted">
          Abandoned on stage {stageIndex + 1} of {stageCount}.
        </p>
      )}
      {trail.length > 1 && (
        <>
          <div className="label mb-2.5">How far you got</div>
          <RouteList steps={trail} />
        </>
      )}

      <div className={trail.length > 1 ? "label mt-6 mb-2.5" : "label mb-2.5"}>
        Shortest route
      </div>
      <ShortestRoute route={shortest} />
    </Modal>
  );
}

function MissingPairing({ onHome }: { onHome: () => void }) {
  return (
    <Centered
      title="No pairing in this link"
      body="A run needs a start and a target. Pick one from the home page."
    >
      <Button variant="primary" onClick={onHome}>
        Go to home
      </Button>
    </Centered>
  );
}

function ErrorPanel({
  message,
  onHome,
  onRetry,
}: {
  message: string;
  onHome: () => void;
  onRetry: () => void;
}) {
  return (
    <Centered
      title={message}
      body="That page could not be loaded. Take another link from the trail, or start the run over."
    >
      <Button variant="primary" onClick={onRetry}>
        Restart run
      </Button>
      <Button onClick={onHome}>Go to home</Button>
    </Centered>
  );
}

function Centered({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[70dvh] items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <p className="text-[1.0625rem] font-semibold tracking-[-0.015em]">
          {title}
        </p>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
          {body}
        </p>
        <div className="mt-5 flex justify-center gap-2">{children}</div>
      </div>
    </div>
  );
}
