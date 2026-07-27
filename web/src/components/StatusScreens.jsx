"use client";

import { motion } from "framer-motion";

import { Button } from "./ui/Button";
import { rise } from "@/lib/motion";

const shell = "mx-auto w-full max-w-xl px-5 py-24 sm:px-8";

/** A shimmering placeholder block — the sweep lives in globals.css. */
function Skeleton({ className = "" }) {
  return (
    <span className={`relative block overflow-hidden bg-rule/70 ${className}`}>
      <span className="skeleton-sweep" />
    </span>
  );
}

/**
 * Rather than a lonely spinner over empty space, the locating state renders the
 * skeleton of the page it's about to become — the same app-bar row, hero card
 * and verdict discs, in the same footprint — with the live status sitting
 * inside the card. When the real data lands the layout barely shifts, so the
 * wait reads as the page assembling itself rather than a blank interstitial.
 */
export function LocatingScreen({ label, detail }) {
  return (
    <motion.div
      {...rise(0)}
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-3 px-4 pt-2 sm:px-6 sm:pt-3"
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 font-display text-base font-bold tracking-tight text-ink">
          <span aria-hidden>👋</span>
          MyNetaDesk
        </p>
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>

      <div className="flex min-h-[56dvh] flex-1 flex-col items-center justify-center gap-5 rounded-card bg-surface px-5 py-6 shadow-hero ring-1 ring-inset ring-ink/5 sm:px-8 sm:py-8">
        <Skeleton className="aspect-[3/4] w-[46vw] max-w-[12.5rem] rounded-photo sm:w-52" />

        <div className="flex flex-col items-center gap-2.5 text-center">
          <motion.p
            aria-hidden
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="text-3xl"
          >
            📍
          </motion.p>
          <h2
            aria-live="polite"
            className="font-display text-lg font-bold text-ink sm:text-xl"
          >
            {label}
          </h2>
          <p className="max-w-xs text-xs leading-relaxed font-medium text-muted">
            {detail}
          </p>
          {/* An indeterminate sweep — the quietest possible progress cue. */}
          <div
            role="presentation"
            className="mt-1 h-1.5 w-44 overflow-hidden rounded-full bg-rule"
          >
            <motion.div
              className="h-full w-1/3 rounded-full bg-linear-to-r from-brand to-slap"
              animate={{ x: ["-100%", "320%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md shrink-0 items-center justify-center gap-8 sm:gap-12">
        <Skeleton className="size-28 rounded-full sm:size-32" />
        <Skeleton className="size-28 rounded-full sm:size-32" />
      </div>
    </motion.div>
  );
}

export function ErrorScreen({ overline, title, body, onRetry }) {
  return (
    <motion.div
      {...rise(0)}
      className={shell}
      role="alert"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slap-wash px-3 py-1.5 font-display text-xs font-semibold text-slap-strong ring-1 ring-slap/15 ring-inset">
        <span aria-hidden>😬</span>
        {overline}
      </span>

      <h2 className="mt-3 font-display text-2xl font-bold text-balance sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed font-medium text-muted text-pretty">
        {body}
      </p>

      <Button variant="secondary" className="mt-7" onClick={onRetry}>
        Try again
      </Button>
    </motion.div>
  );
}
