import { GamePageSkeleton } from "@/components/skeletons/GamePageSkeleton";

/**
 * The route-level loading state for `/game`, shown by the router the moment the
 * navigation starts and swapped out when the page's own code and data arrive.
 *
 * It is the game's own shape — card, verdict discs, highlights — not the main
 * page's, so the transition reads as the game assembling itself rather than as
 * one page being replaced by a stand-in for another.
 */
export default function Loading() {
  return <GamePageSkeleton />;
}
