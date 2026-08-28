"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { RouteList, ShortestRoute } from "./route-list";
import { formatClock } from "@/lib/game/format";
import { useShortestRoute } from "@/lib/game/use-shortest-route";
import type { RunRecord } from "@/lib/game/types";

interface ResultsProps {
  record: RunRecord;
  onPlayAgain: () => void;
  onRerun: () => void;
}

/** The win screen: how long it took, the way you went, and the way you could have. */
export function Results({ record, onPlayAgain, onRerun }: ResultsProps) {
  const shortest = useShortestRoute(record.start, record.target);

  return (
    <Modal
      open
      eyebrow={record.daily ? `Daily ${record.daily}` : "Run complete"}
      title={
        <>
          <div className="tnum font-mono text-[2.75rem] leading-none font-medium tracking-[-0.04em]">
            {formatClock(record.elapsedMs)}
          </div>
          <p className="mt-2.5 text-[0.9375rem] text-muted">
            <span className="tnum font-mono text-text">{record.clicks}</span>{" "}
            {record.clicks === 1 ? "click" : "clicks"} from{" "}
            <span className="font-medium text-text">{record.start}</span> to{" "}
            <span className="font-medium text-text">{record.target}</span>
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
      <div className="label mb-2.5">Your route</div>
      <RouteList steps={record.trail} />

      <div className="label mt-6 mb-2.5">Shortest route</div>
      <ShortestRoute route={shortest} />
    </Modal>
  );
}
