"use client";

import { Info, Search, Share2, Trophy } from "lucide-react";

import { IconAction } from "./ui/IconAction";

/**
 * The four secondary actions, gathered into one bar at the foot of the page —
 * previously they were split across three places (Leaderboard in the top bar,
 * Information and Share in the card's corners, Search in a floating button).
 *
 * Icon-only, equal weight: none of these competes with the verdict buttons.
 * Sticky so they stay reachable once the page scrolls, and translucent so the
 * content passing underneath still reads as one page.
 */
export function BottomActions({
  onOpenSearch,
  onOpenLeaderboard,
  onOpenInfo,
  onShare,
  shareHighlight = false,
}) {
  return (
    // Not sticky itself — the page wraps this in the sticky, entrance-animated
    // container so the two concerns don't nest.
    <nav aria-label="Actions" className="shrink-0 pt-1.5 pb-2.5">
      <div className="relative flex items-center justify-around gap-2 rounded-full bg-linear-to-b from-white/92 to-surface/80 px-3 py-2 shadow-lift ring-1 ring-ink/5 backdrop-blur-xl">
        {/* A hairline top rim catches the light and reads the bar as a piece of
            frosted glass floating over the page rather than a flat pill. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-px h-px rounded-full bg-white/70"
        />
        <IconAction label="Search" onClick={onOpenSearch} icon={Search} />
        <IconAction
          label="Leaderboard"
          onClick={onOpenLeaderboard}
          icon={Trophy}
        />
        <IconAction label="Information" onClick={onOpenInfo} icon={Info} />
        <IconAction
          label="Share"
          onClick={onShare}
          icon={Share2}
          highlight={shareHighlight}
        />
      </div>
    </nav>
  );
}
