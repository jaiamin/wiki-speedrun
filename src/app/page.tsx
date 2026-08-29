import { BACKDROP_TERM_COUNT } from "@/components/home/backdrop-layout";
import { Home } from "@/components/home/home";
import { getBackdropTerms } from "@/lib/game/backdrop-terms";

export default function Page() {
  return <Home backdropTerms={getBackdropTerms(BACKDROP_TERM_COUNT)} />;
}
