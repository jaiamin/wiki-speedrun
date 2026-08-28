"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";
import { ArticleView } from "@/components/game/article-view";
import { RunPanel } from "@/components/game/run-panel";
import { Results } from "@/components/game/results";
import { Button } from "@/components/ui/button";
import { buildRunRecord, useElapsed, useRun } from "@/lib/game/use-run";
import { saveRun } from "@/lib/game/storage";
import { DIFFICULTIES, type Difficulty, type Puzzle } from "@/lib/game/types";

/**
 * The run, driven entirely by the URL.
 *
 * Putting the pairing in query params rather than in memory means a run is
 * shareable, survives a refresh, and can be linked to directly — none of which
 * would work if the home screen handed the puzzle over as component state.
 */
export function PlayClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { state, begin, go, back, giveUp } = useRun();
  const elapsed = useElapsed(state.startedAt, state.finishedAt);

  const start = params.get("start");
  const target = params.get("target");
  const rawDifficulty = params.get("difficulty") ?? "medium";
  const daily = params.get("daily");

  const puzzle: Puzzle | null = useMemo(() => {
    if (!start || !target) return null;
    return {
      start,
      target,
      difficulty: DIFFICULTIES.includes(rawDifficulty as Difficulty)
        ? (rawDifficulty as Difficulty)
        : "medium",
      daily,
    };
  }, [daily, rawDifficulty, start, target]);

  // Start the run once the URL has been read, and again if the pairing changes.
  const pairing = puzzle ? `${puzzle.start}→${puzzle.target}` : null;
  useEffect(() => {
    if (!puzzle) return;
    begin(puzzle);
    // `begin` is keyed on the pairing rather than the puzzle object, which is
    // rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairing]);

  // Build the finished record. Pure: persisting happens in the effect below.
  const finished = useMemo(() => {
    if (state.status !== "won") return null;
    if (!state.puzzle || state.startedAt === null || state.finishedAt === null) {
      return null;
    }

    return buildRunRecord({
      puzzle: state.puzzle,
      trail: state.trail,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
    });
    // Keyed on finishedAt so the record is rebuilt only when a run ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.finishedAt, state.status]);

  // Writing to storage is an external-system effect, not a render concern.
  useEffect(() => {
    if (finished) saveRun(finished);
  }, [finished]);

  const goHome = useCallback(() => router.push("/"), [router]);

  const retry = useCallback(() => {
    if (!state.puzzle) return;
    begin(state.puzzle);
  }, [begin, state.puzzle]);

  // Backspace steps back a page, the way it would in a browser.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key !== "Backspace") return;
      event.preventDefault();
      back();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [back]);

  if (!puzzle) return <MissingPairing onHome={goHome} />;
  if (!state.puzzle) return <Booting />;

  const visited = state.trail.map((entry) => entry.title);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {state.loading && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-0.5 overflow-hidden">
          <div className="h-full w-1/3 animate-[slide_1s_ease-in-out_infinite] bg-link" />
        </div>
      )}

      {/* The article takes every pixel the run panel does not. */}
      <main className="min-w-0 flex-1">
        {state.error ? (
          <ErrorPanel message={state.error} onBack={back} onHome={goHome} />
        ) : (
          <ArticleView
            article={state.article}
            visited={visited}
            onNavigate={go}
            blockFind
            onBlockedFind={() =>
              toast("Find is disabled", {
                description: "Read the page and pick a link — that is the game.",
              })
            }
          />
        )}
      </main>

      <RunPanel
        puzzle={state.puzzle}
        trail={state.trail}
        startedAt={state.startedAt}
        elapsedMs={elapsed}
        running={state.status === "playing" && state.startedAt !== null}
        canGoBack={state.trail.length > 1 && !state.loading}
        onBack={back}
        onGiveUp={giveUp}
      />

      {state.status === "won" &&
        finished &&
        state.startedAt !== null && (
          <Results
            record={finished}
            trail={state.trail}
            startedAt={state.startedAt}
            onPlayAgain={goHome}
            onRerun={retry}
          />
        )}

      {state.status === "abandoned" && (
        <GaveUp target={puzzle.target} onHome={goHome} onRetry={retry} />
      )}

      <Toaster position="top-center" />
    </div>
  );
}

function Booting() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <span className="label">Loading run</span>
    </div>
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
  onBack,
  onHome,
}: {
  message: string;
  onBack: () => void;
  onHome: () => void;
}) {
  return (
    <Centered
      title={message}
      body="That page could not be loaded. Step back and take another link."
    >
      <Button variant="primary" onClick={onBack}>
        Go back
      </Button>
      <Button onClick={onHome}>End run</Button>
    </Centered>
  );
}

function GaveUp({
  target,
  onHome,
  onRetry,
}: {
  target: string;
  onHome: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text/25 p-6 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-[12px] border border-line bg-canvas p-6 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
        <div className="label">Run abandoned</div>
        <p className="mt-2 text-[1.0625rem] font-semibold tracking-[-0.011em]">
          {target} stays unbeaten.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
          <Button onClick={onHome}>New run</Button>
        </div>
      </div>
    </div>
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
        <p className="text-[1.0625rem] font-semibold tracking-[-0.011em]">
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
