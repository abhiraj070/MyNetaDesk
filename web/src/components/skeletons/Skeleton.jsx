"use client";

import { Menu } from "lucide-react";

import { NAV_MENU_BUTTON, NAV_SURFACE } from "@/lib/navStyles";

/**
 * The pieces every page skeleton is built from.
 *
 * Pulled out of `StatusScreens` when the app grew a second route: the app bar
 * and the action bar are the same on both pages, so their stand-ins should be
 * one implementation rather than one per skeleton — that is what stops a
 * skeleton drifting out of shape from the thing it stands in for.
 */

/** A shimmering placeholder block — the sweep itself lives in globals.css. */
export function Skeleton({ className = "" }) {
  return (
    <span className={`relative block overflow-hidden bg-rule/70 ${className}`}>
      <span className="skeleton-sweep" />
    </span>
  );
}

/**
 * The app bar's stand-in: hamburger outside the bar, floating glass bar with
 * the wordmark, then the two controls. Both pull from `navStyles`, so the bar
 * cannot change shape at the moment the real screen replaces this one.
 *
 * The wordmark is real text, not a skeleton — it is known before any request
 * resolves, and shimmering something we can already show reads as slower.
 */
export function AppBarSkeleton() {
  return (
    <header className="flex shrink-0 items-center gap-2.5 pt-1 pb-3 sm:pb-4">
      <div className={`${NAV_MENU_BUTTON} ${NAV_SURFACE}`}>
        <Menu className="size-5 text-faint" strokeWidth={2.25} />
      </div>

      <div
        className={`flex min-w-0 flex-1 items-center gap-3 py-2 pr-2 pl-4 ${NAV_SURFACE}`}
      >
        <p className="shrink-0 font-display text-lg leading-none font-bold tracking-tight text-ink">
          MyNetaji
        </p>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-9 w-[5.5rem] rounded-full" />
        </div>
      </div>
    </header>
  );
}

/**
 * A static, disabled stand-in for `BottomActions` — same pill, same five icon
 * slots, same spacing, so nothing reflows when the real bar (with its live
 * Share state) swaps in. `aria-hidden`: there's nothing here to press.
 */
export function BottomActionsSkeleton() {
  return (
    <nav aria-hidden className="shrink-0 pt-1.5 pb-2.5">
      <div className="relative flex items-center justify-around gap-2 rounded-full bg-linear-to-b from-white/92 to-surface/80 px-3 py-2 shadow-lift ring-1 ring-ink/5 backdrop-blur-xl">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-px h-px rounded-full bg-white/70"
        />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="size-11 rounded-full" />
        ))}
      </div>
    </nav>
  );
}

/**
 * The quietest possible progress cue: an indeterminate sweep under a line of
 * status. Only shown where there is something real to say about the wait — a
 * skeleton that also explains itself beats a skeleton that just sits there.
 *
 * CSS rather than a framer loop, so a `loading.js` boundary can render it as a
 * server component without pulling motion into the bundle for a bar.
 */
export function StatusBlock({ label, detail }) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-1 text-center">
      <h2 aria-live="polite" className="font-display text-sm font-bold text-ink">
        {label}
      </h2>
      {detail && (
        <p className="max-w-xs text-xs leading-relaxed font-medium text-muted">
          {detail}
        </p>
      )}
      <div
        role="presentation"
        className="mt-1 h-1.5 w-44 overflow-hidden rounded-full bg-rule"
      >
        <span className="progress-sweep block h-full w-1/3 rounded-full bg-linear-to-r from-brand to-slap" />
      </div>
    </div>
  );
}
