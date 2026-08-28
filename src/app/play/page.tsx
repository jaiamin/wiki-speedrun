import { Suspense } from "react";
import { PlayClient } from "./play-client";

/**
 * `useSearchParams` opts a route into client-side rendering, so the Suspense
 * boundary is required — without it the whole route would be excluded from
 * static generation.
 */
export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <span className="label">Loading run</span>
        </div>
      }
    >
      <PlayClient />
    </Suspense>
  );
}
