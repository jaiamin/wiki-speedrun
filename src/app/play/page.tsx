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
      fallback={<div className="min-h-dvh bg-canvas" />}
    >
      <PlayClient backdropTerms={backdropTerms} />
    </Suspense>
  );
}
