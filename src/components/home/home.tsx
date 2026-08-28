"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, Shuffle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { ArticleSearch } from "@/components/game/article-search";
import { formatClock } from "@/lib/game/format";
import { summarizePairings } from "@/lib/game/storage";
import { useRuns } from "@/lib/game/use-runs";
import { useSummary } from "@/lib/game/use-summary";
import { DIFFICULTIES, DIFFICULTY_META } from "@/lib/game/types";
import type { Difficulty, Puzzle } from "@/lib/game/types";

type Mode = "random" | "daily" | "custom";

const MODES = [
  { value: "random", label: "Random", hint: "A fresh pairing every time" },
  { value: "daily", label: "Daily", hint: "The same pairing for everyone today" },
  { value: "custom", label: "Custom", hint: "Choose both endpoints yourself" },
] as const;

const DIFFICULTY_OPTIONS = DIFFICULTIES.map((id) => ({
  value: id,
  label: DIFFICULTY_META[id].label,
  hint: DIFFICULTY_META[id].blurb,
}));

/**
 * The home screen.
 *
 * Everything here sits on one alignment: a fixed label column, then content,
 * rows separated by hairlines. The pairing, the settings and the history all
 * use it, which is what holds the page together without putting anything in a
 * card — cards would draw four borders around each item and still not line
 * anything up.
 */
export function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("random");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [nonce, setNonce] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [loaded, setLoaded] = useState<{ key: string; puzzle: Puzzle } | null>(
    null,
  );

  const [customStart, setCustomStart] = useState("");
  const [customTarget, setCustomTarget] = useState("");

  const key = `${mode}:${difficulty}:${nonce}`;

  useEffect(() => {
    if (mode === "custom") return;

    let active = true;
    const query = mode === "daily" ? "daily=1" : `difficulty=${difficulty}`;

    fetch(`/api/puzzle?${query}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Puzzle | null) => {
        if (active && data) setLoaded({ key, puzzle: data });
      })
      .catch(() => {
        // Leaves the rows in their loading state; Shuffle retries.
      });

    return () => {
      active = false;
    };
  }, [key, mode, difficulty]);

  // Derived rather than stored, so a stale pairing is never shown as current.
  const puzzle = loaded?.key === key ? loaded.puzzle : null;

  const start = mode === "custom" ? customStart : (puzzle?.start ?? null);
  const target = mode === "custom" ? customTarget : (puzzle?.target ?? null);
  const ready = Boolean(start && target && start !== target);

  const startRun = useCallback(
    (from: string, to: string, meta?: { difficulty?: Difficulty; daily?: string | null }) => {
      const params = new URLSearchParams({ start: from, target: to });
      if (meta?.difficulty) params.set("difficulty", meta.difficulty);
      if (meta?.daily) params.set("daily", meta.daily);
      router.push(`/play?${params.toString()}`);
    },
    [router],
  );

  const begin = useCallback(() => {
    if (!start || !target || start === target) return;
    startRun(start, target, {
      difficulty: mode === "random" ? difficulty : undefined,
      daily: mode === "daily" ? puzzle?.daily : undefined,
    });
  }, [difficulty, mode, puzzle, start, startRun, target]);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <span className="text-[0.9375rem] font-semibold tracking-[-0.015em]">
            Wiki Speedrun
          </span>
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="text-[0.8125rem] text-muted underline-offset-4 hover:text-text hover:underline"
          >
            Rules
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        <section className="pt-16 pb-12">
          <h1 className="max-w-xl text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.035em] text-balance sm:text-[3rem]">
            Race between two Wikipedia articles.
          </h1>
          <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-muted">
            Two articles, one clock, and nothing to navigate with but the links
            in front of you. No search, no address bar, no luck — just how fast
            you can think your way across the encyclopedia.
          </p>
        </section>

        <dl className="border-t border-line">
          {mode === "custom" ? (
            <>
              <Row label="From">
                <ArticleSearch
                  label="From"
                  hideLabel
                  value={customStart}
                  onChange={setCustomStart}
                  placeholder="Search articles…"
                />
              </Row>
              <Row label="To">
                <ArticleSearch
                  label="To"
                  hideLabel
                  value={customTarget}
                  onChange={setCustomTarget}
                  placeholder="Search articles…"
                />
              </Row>
            </>
          ) : (
            <>
              <Row label="From">
                <Endpoint title={start} />
              </Row>
              <Row label="To">
                <Endpoint title={target} />
              </Row>
            </>
          )}

          <Row label="Mode">
            <Segmented
              label="Mode"
              options={MODES}
              value={mode}
              onChange={(value) => setMode(value)}
            />
          </Row>

          {mode === "random" && (
            <Row label="Difficulty">
              <div>
                <Segmented
                  label="Difficulty"
                  options={DIFFICULTY_OPTIONS}
                  value={difficulty}
                  onChange={(value) => {
                    setDifficulty(value);
                    setNonce((count) => count + 1);
                  }}
                />
                <p className="mt-2.5 text-[0.8125rem] text-muted">
                  {DIFFICULTY_META[difficulty].blurb}
                </p>
              </div>
            </Row>
          )}

          {mode === "daily" && puzzle?.daily && (
            <Row label="Date">
              <p className="text-[0.8125rem] text-muted">
                <span className="tnum font-mono text-text">{puzzle.daily}</span>
                . Everyone gets this pairing today.
              </p>
            </Row>
          )}
        </dl>

        <div className="flex flex-wrap items-center gap-2 py-8">
          <Button variant="primary" size="lg" disabled={!ready} onClick={begin}>
            Start run
          </Button>

          {mode === "random" && (
            <Button
              size="lg"
              onClick={() => setNonce((count) => count + 1)}
              disabled={!puzzle}
            >
              <Shuffle className="size-3.5" aria-hidden />
              Shuffle
            </Button>
          )}
        </div>

        <History onRetry={startRun} />
      </main>

      <footer className="mx-auto max-w-3xl px-6 py-10 text-xs text-faint">
        Article content from Wikipedia, licensed CC BY-SA 4.0. Not affiliated
        with the Wikimedia Foundation.
      </footer>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}

/**
 * One row of the page's grid: label left, content right, hairline beneath.
 * Stacks on narrow screens, where a fixed label column would leave nothing
 * for the content.
 */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-x-6 gap-y-2 border-b border-line py-5 sm:grid-cols-[6.5rem_1fr]">
      <dt className="label pt-1">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/**
 * An endpoint, set as type rather than boxed.
 *
 * The blurb earns its place: "Breccia" tells a player nothing about where to
 * aim, and "a rock made of broken fragments" tells them to head for geology.
 */
function Endpoint({ title }: { title: string | null }) {
  const summary = useSummary(title);

  if (!title) {
    return (
      <div className="flex items-center gap-3" aria-hidden>
        <div className="size-10 animate-pulse rounded-[5px] bg-surface" />
        <div className="h-4 w-40 animate-pulse rounded bg-surface" />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      {summary?.thumbnail ? (
        <img
          src={summary.thumbnail.source}
          alt=""
          className="size-10 shrink-0 rounded-[5px] border border-line object-cover"
        />
      ) : (
        <div
          className="size-10 shrink-0 rounded-[5px] border border-line bg-surface"
          aria-hidden
        />
      )}

      <div className="min-w-0">
        <div className="text-[1.0625rem] leading-snug font-semibold tracking-[-0.015em]">
          {title}
        </div>
        <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">
          {summary?.description ?? summary?.extract?.slice(0, 90) ?? ""}
        </p>
      </div>
    </div>
  );
}

const RULES = [
  {
    term: "Links only",
    detail:
      "Move by clicking links inside the article. Categories, files and external sites are stripped out, so every link you can see is a legal move.",
  },
  {
    term: "No search",
    detail:
      "Ctrl+F is disabled and Wikipedia's own search is gone. Finding the target's name on the page would replace the game with a text search.",
  },
  {
    term: "Backtracking",
    detail:
      "Every page on your trail is clickable, so you can return to any of them. Doing so drops the pages after it — the trail always shows the route you actually took.",
  },
  {
    term: "Definitions",
    detail:
      "Hover a link to see what the article is about before you commit to it. It tells you nothing about the route, only what the title means.",
  },
  {
    term: "The clock",
    detail:
      "It starts when the first article finishes loading and stops the instant you land on the target. Redirects count: click USA and you win on United States.",
  },
];

function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <p className="text-[1.25rem] font-semibold tracking-[-0.02em]">Rules</p>
      }
    >
      <dl className="space-y-5">
        {RULES.map((rule) => (
          <div key={rule.term}>
            <dt className="text-[0.9375rem] font-semibold tracking-[-0.015em]">
              {rule.term}
            </dt>
            <dd className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
              {rule.detail}
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}

/**
 * Past runs, one row per pairing rather than per attempt.
 *
 * A pairing can be replayed as often as you like, so listing every attempt is
 * mostly repetition. Grouping lets each row answer the two questions worth
 * asking — did I beat this, and how fast — and gives retry somewhere obvious
 * to live.
 */
function History({
  onRetry,
}: {
  onRetry: (start: string, target: string) => void;
}) {
  const runs = useRuns();
  if (runs.length === 0) return null;

  const pairings = summarizePairings(runs);

  return (
    <section className="pt-4">
      <h2 className="label border-b border-line pb-4">Your runs</h2>

      <ul>
        {pairings.slice(0, 8).map((pairing) => {
          const beaten = pairing.best !== null;

          return (
            <li
              key={pairing.key}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 border-b border-line py-4"
            >
              {beaten ? (
                <Check
                  className="mt-0.5 size-4 text-good"
                  aria-label="Beaten"
                />
              ) : (
                <X className="mt-0.5 size-4 text-bad" aria-label="Not beaten" />
              )}

              <div className="min-w-0">
                <div className="text-[0.875rem]">
                  <span className="text-muted">{pairing.start}</span>
                  <span className="mx-1.5 text-faint">→</span>
                  <span className="font-medium">{pairing.target}</span>
                </div>

                {pairing.best ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {pairing.best.trail.join(" › ")}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted">
                    Not beaten in {pairing.attempts}{" "}
                    {pairing.attempts === 1 ? "attempt" : "attempts"}.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="tnum font-mono text-[0.8125rem]">
                    {pairing.best ? formatClock(pairing.best.elapsedMs) : "—"}
                  </div>
                  {pairing.best && (
                    <div className="tnum font-mono text-[0.625rem] text-faint">
                      {pairing.best.clicks}{" "}
                      {pairing.best.clicks === 1 ? "click" : "clicks"}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => onRetry(pairing.start, pairing.target)}
                  aria-label={`Retry ${pairing.start} to ${pairing.target}`}
                >
                  <RotateCcw className="size-3" aria-hidden />
                  Retry
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
