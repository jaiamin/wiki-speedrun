"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { RouteList, ShortestRoute } from "./route-list";
import { formatClock } from "@/lib/game/format";
import { useShortestRoute } from "@/lib/game/use-shortest-route";
import type { RunRecord, RunStageRecord } from "@/lib/game/types";

interface ResultsProps {
  record: RunRecord;
  onPlayAgain: () => void;
  onRerun: () => void;
}

/** The win screen: how long it took, the way you went, and the way you could have. */
export function Results({ record, onPlayAgain, onRerun }: ResultsProps) {
  const multiStage = record.stages.length > 1;

  return (
    <Modal
      open
      eyebrow="Run complete"
      title={
        <>
          <div className="tnum font-mono text-[2.75rem] leading-none font-medium tracking-[-0.04em]">
            {formatClock(record.elapsedMs)}
          </div>
          <p className="mt-2.5 text-[0.9375rem] text-muted">
            <span className="tnum font-mono text-text">{record.clicks}</span>{" "}
            {record.clicks === 1 ? "click" : "clicks"}{" "}
            {multiStage ? (
              <>across {record.stages.length} stages</>
            ) : (
              <>
                from <span className="font-medium text-text">{record.start}</span>{" "}
                to <span className="font-medium text-text">{record.target}</span>
              </>
            )}
          </p>
        </>
      }
      footer={
        <>
          <Button variant="primary" onClick={onPlayAgain}>
            New run
          </Button>
          <Button onClick={onRerun}>Retry this one</Button>
        </>
      }
    >
      {multiStage ? (
        <MarathonResults stages={record.stages} trail={record.trail} />
      ) : (
        <SprintResults record={record} />
      )}
    </Modal>
  );
}

function SprintResults({ record }: { record: RunRecord }) {
  const shortest = useShortestRoute(record.start, record.target);

  return (
    <>
      <div className="label mb-2.5">Your route</div>
      <RouteList steps={record.trail} />

      <div className="label mt-6 mb-2.5">Shortest route</div>
      <ShortestRoute route={shortest} />
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
      <div className="label mb-2.5">Stage splits</div>
      <ol className="divide-y divide-line border-y border-line">
        {stages.map((stage, index) => (
          <li
            key={`${stage.target}-${index}`}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3"
          >
            <span className="tnum font-mono text-xs text-faint">
              {index + 1}/{stages.length}
            </span>
            <span className="min-w-0 text-[0.8125rem]">
              <span className="block truncate text-muted">{stage.start}</span>
              <span className="block truncate font-medium">{stage.target}</span>
            </span>
            <span className="text-right">
              <span className="tnum block font-mono text-[0.8125rem]">
                {formatClock(stage.elapsedMs)}
              </span>
              <span className="tnum block font-mono text-[0.625rem] text-faint">
                {stage.clicks} {stage.clicks === 1 ? "click" : "clicks"}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <div className="label mt-6 mb-2.5">Full route</div>
      <RouteList steps={trail} />
    </>
  );
}
