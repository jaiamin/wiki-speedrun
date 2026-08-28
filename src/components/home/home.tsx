"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { ArticleSearch } from "@/components/game/article-search";
import { formatClock } from "@/lib/game/format";
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
 * Everything on this page — the pairing, the settings, the rules, the history —
 * sits on one alignment: a fixed label column on the left, content on the
 * right, rows separated by hairlines. That single structure is what holds the
 * page together, and it is why none of it is in boxes. Cards would draw four
 * borders around each item and still not line anything up.
 */
export function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("random");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [nonce, setNonce] = useState(0);
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

  const begin = useCallback(() => {
    if (!start || !target || start === target) return;

    const params = new URLSearchParams({ start, target });
    if (mode === "random") params.set("difficulty", difficulty);
    if (mode === "daily" && puzzle?.daily) params.set("daily", puzzle.daily);

    router.push(`/play?${params.toString()}`);
  }, [difficulty, mode, puzzle, router, start, target]);

  // Enter starts the run from anywhere that is not a text field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || !ready) return;
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      begin();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [begin, ready]);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <span className="text-[0.9375rem] font-semibold tracking-[-0.015em]">
            Wiki Speedrun
          </span>
          <a
            href="#rules"
            className="text-[0.8125rem] text-muted underline-offset-4 hover:text-text hover:underline"
          >
            Rules
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6">
        <section className="pt-16 pb-12">
          <h1 className="max-w-xl text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.035em] text-balance sm:text-[3rem]">
            Race between two Wikipedia articles.
          </h1>
          <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-muted">
            Links only, no search. The clock starts when the first page loads
            and stops the moment you land on the target.
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

          <span className="ml-1 flex items-center gap-1.5 text-xs text-faint">
            <kbd className="kbd">↵</kbd>
            to start
          </span>
        </div>

        <Rules />
        <History />
      </main>

      <footer className="mx-auto max-w-3xl px-6 py-10 text-xs text-faint">
        Article content from Wikipedia, licensed CC BY-SA 4.0. Not affiliated
        with the Wikimedia Foundation.
      </footer>
    </div>
  );
}

/**
 * One row of the page's grid: label left, content right, hairline beneath.
 * Collapses to stacked on narrow screens, where a 100px label column would
 * leave nothing for the content.
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
    term: "Par",
    detail:
      "When you finish, your route is scored against the shortest one that actually existed, computed from Wikipedia's live link graph.",
  },
];

function Rules() {
  return (
    <section id="rules" className="scroll-mt-6 pt-4">
      <h2 className="label mb-1 border-b border-line pb-4">Rules</h2>
      <dl>
        {RULES.map((rule) => (
          <div
            key={rule.term}
            className="grid gap-x-6 gap-y-1 border-b border-line py-5 sm:grid-cols-[6.5rem_1fr]"
          >
            <dt className="text-[0.9375rem] font-semibold tracking-[-0.015em]">
              {rule.term}
            </dt>
            <dd className="max-w-lg text-[0.8125rem] leading-relaxed text-muted">
              {rule.detail}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Recent runs. Empty on a first visit, so the section removes itself rather
 * than showing a placeholder.
 */
function History() {
  const runs = useRuns();
  if (runs.length === 0) return null;

  const best = runs.reduce((fastest, run) =>
    run.elapsedMs < fastest.elapsedMs ? run : fastest,
  );

  return (
    <section className="pt-10">
      <div className="mb-1 flex items-baseline justify-between border-b border-line pb-4">
        <h2 className="label">Your runs</h2>
        <span className="text-xs text-muted">
          {runs.length} finished · best{" "}
          <span className="tnum font-mono text-text">
            {formatClock(best.elapsedMs)}
          </span>
        </span>
      </div>

      <table className="w-full text-[0.8125rem]">
        <tbody>
          {runs.slice(0, 6).map((run) => (
            <tr key={run.id} className="border-b border-line">
              <td className="py-3 pr-4">
                <span className="text-muted">{run.start}</span>
                <span className="mx-1.5 text-faint">→</span>
                <span>{run.target}</span>
              </td>
              <td className="tnum w-16 py-3 text-right font-mono text-muted">
                {run.clicks}
              </td>
              <td className="tnum w-24 py-3 text-right font-mono">
                {formatClock(run.elapsedMs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
