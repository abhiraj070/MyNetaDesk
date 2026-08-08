"use client";

import { motion } from "framer-motion";

import {
  AppBarSkeleton,
  BottomActionsSkeleton,
  Skeleton,
  StatusBlock,
} from "./Skeleton";
import { rise } from "@/lib/motion";

/**
 * The main page, one beat before it has anything to say.
 *
 * Every block here is the real page's block with its content removed: the
 * identity card keeps its `size-16` portrait and its three text lines, the tab
 * row keeps four pills at the same widths as "Overview / Manifestos / Political
 * Journey / Performance", and the content below is the Overview tab's own
 * shape — the two At a Glance cards side by side, then the Quick Insights
 * stack. When the data lands almost nothing moves.
 *
 * `status` is optional. It is set while the app is still finding the reader's
 * state, which is a wait worth narrating; on a plain data load the skeleton
 * stands on its own without a line of text explaining that a page is loading.
 *
 * `switcher` is the real Your CM / Your MP control, passed in rather than
 * mimicked. Switching between the two lands here for as long as the second
 * lookup takes, and a skeleton that swallowed the control the reader just
 * pressed would read as the page having thrown their choice away — so the one
 * live thing on this screen is the thing they are steering with.
 */
export function InfoPageSkeleton({ status, switcher }) {
  return (
    <motion.div
      {...rise(0)}
      aria-busy="true"
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-3 px-4 pt-2 sm:px-6 sm:pt-3"
    >
      <AppBarSkeleton />

      {switcher}

      {/* Identity card: portrait, name, designation, party — same padding,
          same radius, same `size-16` photo as `ProfileIdentityCard`. */}
      <div className="flex shrink-0 items-center gap-4 rounded-card bg-surface-2 p-4 ring-1 ring-ink/5">
        <Skeleton className="size-16 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/5 rounded-full" />
          <Skeleton className="h-3 w-3/5 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>

      {/* The tab row, at the widths the four real labels occupy. */}
      <div className="shrink-0 pt-1 pb-3">
        <div className="inline-flex gap-1 rounded-full bg-surface-2 p-1 ring-1 ring-ink/5">
          {["w-16", "w-20", "w-28", "w-24"].map((width) => (
            <Skeleton key={width} className={`h-7 ${width} rounded-full`} />
          ))}
        </div>
      </div>

      {status && <StatusBlock label={status.label} detail={status.detail} />}

      {/* Overview's own content: the At a Glance pair, then Quick Insights. */}
      <div className="flex-1 space-y-7">
        <section>
          <Skeleton className="h-3 w-24 rounded-full" />
          <div className="mt-3 grid grid-cols-2 items-stretch gap-3.5">
            {[0, 1].map((card) => (
              <div
                key={card}
                className="flex flex-col gap-2.5 rounded-card bg-surface p-4 shadow-card ring-1 ring-ink/5"
              >
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-2.5 w-20 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </section>

        <section>
          <Skeleton className="h-3 w-28 rounded-full" />
          <div className="mt-3 space-y-2.5">
            {["w-11/12", "w-4/5", "w-10/12"].map((width) => (
              <div
                key={width}
                className="rounded-card bg-surface-2 px-4 py-3.5 ring-1 ring-ink/5"
              >
                <Skeleton className={`h-3 ${width} rounded-full`} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 z-30">
        <BottomActionsSkeleton />
      </div>
    </motion.div>
  );
}
