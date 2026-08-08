"use client";

import { ArrowLeft } from "lucide-react";

import { Skeleton, StatusBlock } from "./Skeleton";
import { TodaysHighlight } from "../TodaysHighlight";
import { NAV_MENU_BUTTON, NAV_SURFACE } from "@/lib/navStyles";

/**
 * The game page, one beat before the card lands.
 *
 * This is the old `LocatingScreen` layout, which mirrored the game screen back
 * when the game *was* the home page — the hero card, the two verdict discs and
 * the highlight row, in the same footprint. It moved here rather than being
 * rewritten: it was already an accurate stand-in for exactly this page.
 *
 * `TodaysHighlight` is the real component, not a mimic: it fetches
 * independently of the subject this screen is waiting on and renders its own
 * per-tile shimmer while its own data is in flight, so reusing it is both more
 * accurate than a hand-built placeholder and one less thing to keep in sync.
 *
 * No `"use client"`-only APIs beyond that, so a `loading.js` boundary can
 * render it during the route transition.
 */
export function GamePageSkeleton({ status }) {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-3 px-4 pt-2 sm:px-6 sm:pt-3"
    >
      {/* The game's own header shape: back control, then the title block. */}
      <header className="flex shrink-0 items-center gap-2.5 pt-1 pb-3 sm:pb-4">
        <div className={`${NAV_MENU_BUTTON} ${NAV_SURFACE}`}>
          <ArrowLeft className="size-5 text-faint" strokeWidth={2.25} />
        </div>
        <div
          className={`flex min-w-0 flex-1 items-center gap-3 py-2 pr-2 pl-4 ${NAV_SURFACE}`}
        >
          <Skeleton className="h-4 w-28 rounded-full" />
          <div className="ml-auto">
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>
      </header>

      <div className="relative flex min-h-[56dvh] flex-1 flex-col items-center justify-center gap-5 rounded-card bg-surface px-5 py-6 shadow-hero ring-1 ring-inset ring-ink/5 sm:px-8 sm:py-8">
        {/* Mirrors the real card's "Featured" sticker — absolutely positioned
            there too, so it never nudges the content below it. */}
        <Skeleton className="absolute -top-2.5 left-4 h-6 w-20 rounded-full sm:left-6" />

        <Skeleton className="aspect-[3/4] w-[46vw] max-w-[12.5rem] rounded-photo sm:w-52" />

        {status ? (
          <StatusBlock label={status.label} detail={status.detail} />
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-6 w-44 rounded-full" />
            <Skeleton className="h-3 w-52 rounded-full" />
          </div>
        )}
      </div>

      {/* The two verdict discs, at their real size. */}
      <div className="mx-auto flex w-full max-w-md shrink-0 items-center justify-center gap-8 sm:gap-12">
        <Skeleton className="size-28 rounded-full sm:size-32" />
        <Skeleton className="size-28 rounded-full sm:size-32" />
      </div>

      <div className="pb-4">
        <TodaysHighlight onSelectSubject={undefined} pendingKey={null} />
      </div>
    </div>
  );
}
