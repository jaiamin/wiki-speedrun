import { Suspense } from "react";
import { BACKDROP_TERM_COUNT } from "@/components/home/backdrop-layout";
import { getBackdropTerms } from "@/lib/game/backdrop-terms";
import { PlayClient } from "./play-client";

/**
 * `useSearchParams` opts a route into client-side rendering, so the Suspense
 * boundary is required — without it the whole route would be excluded from
 * static generation.
 */
export default function PlayPage() {
  const backdropTerms = getBackdropTerms(BACKDROP_TERM_COUNT);

  return (
    <Suspense
      fallback={
        <div className="h-dvh overflow-hidden bg-[var(--color-backdrop)] p-2">
          <div className="h-[calc(100dvh-1rem)] rounded-[18px] bg-canvas" />
        </div>
      }
    >
      <PlayClient backdropTerms={backdropTerms} />
    </Suspense>
  );
}
