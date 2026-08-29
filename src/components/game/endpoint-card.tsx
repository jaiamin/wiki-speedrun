"use client";

import { BookOpen } from "lucide-react";
import type { ArticleSummary } from "@/lib/wiki/article";
import { useSummary } from "@/lib/game/use-summary";

interface EndpointCardProps {
  label: string;
  title: string;
}

/**
 * One end of a pairing, as a card.
 *
 * The boxed treatment exists for the reveal, where two endpoints face each
 * other and each needs its own edge to sit inside. The run panel shows only
 * the target and labels it the way it labels Path, so it needs no card.
 */
export function EndpointCard({ label, title }: EndpointCardProps) {
  const summary = useSummary(title);

  return (
    <div className="rounded-2xl border-2 border-black bg-white p-3 text-center sm:p-4">
      <div className="font-display mb-3 text-xs font-bold tracking-[0.12em] text-[var(--color-backdrop-ink)]/65 uppercase">
        {label}
      </div>

      <Thumbnail
        summary={summary}
        className="mx-auto mb-3 size-20 rounded-xl sm:size-24"
        iconClassName="size-8 sm:size-9"
      />

      <div className="font-display line-clamp-2 text-base leading-tight font-bold text-[var(--color-backdrop-ink)] sm:text-lg">
        {title}
      </div>
      {summary?.description && (
        <p className="font-display mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
          {summary.description}
        </p>
      )}
    </div>
  );
}

/** The article image, or a book mark when Wikipedia has no thumbnail for it. */
function Thumbnail({
  summary,
  className,
  iconClassName,
}: {
  summary: ArticleSummary | null;
  className: string;
  iconClassName: string;
}) {
  return (
    <div className={`shrink-0 overflow-hidden bg-black/5 ${className}`}>
      {summary?.thumbnail ? (
        <img
          src={summary.thumbnail.source}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <BookOpen
            className={`stroke-[1.75] text-[var(--color-backdrop-ink)]/45 ${iconClassName}`}
            aria-label="Article image unavailable"
          />
        </div>
      )}
    </div>
  );
}
