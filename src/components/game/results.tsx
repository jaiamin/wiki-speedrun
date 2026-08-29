"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { RouteList, ShortestRoute } from "./route-list";
import { formatClock } from "@/lib/game/format";
import { useShortestRoute } from "@/lib/game/use-shortest-route";
import type { RunRecord, RunStageRecord } from "@/lib/game/types";

interface EndRunModalProps {
  open?: boolean;
  eyebrow: string;
  title: React.ReactNode;
  children: React.ReactNode;
  onRetry: () => void;
  onHome: () => void;
}

/**
 * Shared modal base for both win and give-up screens.
 *
 * Keeps action buttons, card shell, and bubbly typography identical between
 * the two end-of-run outcomes.
 */
export function EndRunModal({
  open = true,
  eyebrow,
  title,
  children,
  onRetry,
  onHome,
}: EndRunModalProps) {
  return (
    <Modal
      open={open}
      eyebrow={eyebrow}
      title={title}
      footer={
        <div className="grid w-full grid-cols-2 gap-3">
          <Button
            variant="play"
            size="md"
            className="font-display h-11 rounded-full px-5 text-sm font-bold tracking-[0.06em] text-black uppercase"
            onClick={onRetry}
          >
            Try again
          </Button>
          <Button
            type="button"
            size="md"
            className="font-display h-11 rounded-full border-2 border-black/35 bg-white px-5 text-sm font-bold tracking-[0.06em] text-black uppercase hover:border-black/70 hover:bg-[#eef3ff]"
            onClick={onHome}
          >
            New run
          </Button>
        </div>
      }
    >
      {children}
    </Modal>
  );
}

export interface ResultsProps {
  record: RunRecord;
  onPlayAgain: () => void;
  onRerun: () => void;
}

/** The win screen: how long it took, the way you went, and the shortest route. */
export function Results({ record, onPlayAgain, onRerun }: ResultsProps) {
  const multiStage = record.stages.length > 1;

  return (
    <EndRunModal
      eyebrow="Run complete"
      title={
        <>
          <div className="font-display text-[2.5rem] leading-none font-bold tracking-[-0.02em] text-[var(--color-backdrop-ink)]">
            {formatClock(record.elapsedMs)}
          </div>
          <p className="font-display mt-2 text-sm font-medium text-muted">
            {multiStage ? (
              <>{record.stages.length} stages completed</>
            ) : (
              <>
                From{" "}
                <span className="font-bold text-[var(--color-backdrop-ink)]">
                  {record.start}
                </span>{" "}
                to{" "}
                <span className="font-bold text-[var(--color-backdrop-ink)]">
                  {record.target}
                </span>
              </>
            )}
          </p>
        </>
      }
      onRetry={onRerun}
      onHome={onPlayAgain}
    >
      {multiStage ? (
        <MarathonResults stages={record.stages} trail={record.trail} />
      ) : (
        <SprintResults record={record} />
      )}
    </EndRunModal>
  );
}

export interface GaveUpProps {
  stageStart: string;
  target: string;
  stageIndex: number;
  stageCount: number;
  trail: string[];
  onHome: () => void;
  onRetry: () => void;
}

/**
 * The give-up screen shows the route that existed.
 */
export function GaveUp({
  stageStart,
  target,
  stageIndex,
  stageCount,
  trail,
  onHome,
  onRetry,
}: GaveUpProps) {
  const shortest = useShortestRoute(stageStart, target);

  return (
    <EndRunModal
      eyebrow="Run abandoned"
      title={
        <>
          <p className="font-display text-[1.625rem] leading-snug font-bold tracking-[-0.02em] text-[var(--color-backdrop-ink)]">
            {target} stays unbeaten.
          </p>
          {stageCount > 1 ? (
            <p className="font-display mt-1.5 text-sm font-medium text-muted">
              Abandoned on stage {stageIndex + 1} of {stageCount}.
            </p>
          ) : (
            <p className="font-display mt-1.5 text-sm font-medium text-muted">
              From{" "}
              <span className="font-bold text-[var(--color-backdrop-ink)]">
                {stageStart}
              </span>{" "}
              to{" "}
              <span className="font-bold text-[var(--color-backdrop-ink)]">
                {target}
              </span>
            </p>
          )}
        </>
      }
      onRetry={onRetry}
      onHome={onHome}
    >
      {trail.length > 1 && (
        <div className="mb-5">
          <div className="font-display mb-2 text-sm font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
            How far you got
          </div>
          <RouteList steps={trail} />
        </div>
      )}

      <div>
        <div className="font-display mb-2 text-sm font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
          Shortest route
        </div>
        <ShortestRoute route={shortest} />
      </div>
    </EndRunModal>
  );
}

function SprintResults({ record }: { record: RunRecord }) {
  const shortest = useShortestRoute(record.start, record.target);

  return (
    <>
      <div className="mb-5">
        <div className="font-display mb-2 text-sm font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
          Your route
        </div>
        <RouteList steps={record.trail} />
      </div>

      <div>
        <div className="font-display mb-2 text-sm font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
          Shortest route
        </div>
        <ShortestRoute route={shortest} />
      </div>
    </>
  );
}

function MarathonResults({
  stages,
  trail,
}: {
  stages: RunStageRecord[];
  trail: string[];
}) {
  return (
    <>
      <div className="font-display mb-2 text-sm font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
        Stage splits
      </div>
      <ol className="divide-y divide-black/10 rounded-2xl border-2 border-black/10 bg-black/[0.02] px-3 py-1 font-display">
        {stages.map((stage, index) => (
          <li
            key={`${stage.target}-${index}`}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2.5 text-sm"
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-black/5 text-[0.6875rem] font-bold text-[var(--color-backdrop-ink)]">
              {index + 1}
            </span>
            <span className="min-w-0 text-sm">
              <span className="block truncate text-xs text-muted">
                {stage.start}
              </span>
              <span className="block truncate font-bold text-[var(--color-backdrop-ink)]">
                {stage.target}
              </span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-bold text-[var(--color-backdrop-ink)]">
                {formatClock(stage.elapsedMs)}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <div className="font-display mt-5 mb-2 text-sm font-bold tracking-[0.08em] text-[var(--color-backdrop-ink)] uppercase">
        Full route
      </div>
      <RouteList steps={trail} />
    </>
  );
}
