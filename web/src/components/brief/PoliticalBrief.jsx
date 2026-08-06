"use client";

import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BriefCard, BriefCardSkeleton } from "./BriefCard";
import { BriefDetailSheet } from "./BriefDetailSheet";
import { useNews } from "@/hooks/useNews";
import { useTranslation } from "@/lib/i18n";
import { rise } from "@/lib/motion";

/**
 * The Political Brief: the day's political stories, newest first.
 *
 * One card per story, in the order the feed hands them over — the provider
 * already sorts by publication time, so the top card is the latest story and
 * the page needs no ranking of its own.
 *
 * The rest of the app sits on a bright three-colour ambient gradient; here it
 * is covered by a flat near-white so the photographs are the only colour on
 * screen. Nothing dated is shown anywhere except each story's own publication
 * day: no relative times, no counts, nothing that would make the page read
 * differently at midnight than it did at breakfast.
 */
export function PoliticalBrief() {
  const { t } = useTranslation();
  const router = useRouter();
  const { stories, isPending, isError, isFetching, refetch } = useNews();
  const [openStory, setOpenStory] = useState(null);

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pt-2 pb-16 sm:px-6">
      <div aria-hidden className="fixed inset-0 -z-10 bg-brief-page" />

      <motion.header {...rise(0)} className="shrink-0">
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t("nav.back")}
            className="-ml-2 flex size-10 items-center justify-center rounded-full text-brief-meta transition-colors hover:bg-brief-ink/[0.06] hover:text-brief-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brief-accent"
          >
            <ArrowLeft className="size-[19px]" strokeWidth={2} />
          </button>
          <p className="font-display text-[17px] leading-none font-bold tracking-tight text-brief-ink">
            {t("app.name")}
          </p>
        </div>

        <div className="pt-6 pb-5">
          {/* Set in the editorial face, not the app's rounded display one.
              The wordmark above stays Fredoka because that is the brand
              signing the page; this line is the masthead of a newsroom
              surface, and a rounded geometric cut at 34px reads as a game
              logo sitting on top of an otherwise sober page.

              The live mark lives on each story's photograph rather than up
              here: it belongs to the stories, and repeating it in the
              masthead only diluted it. */}
          <h1 className="font-editorial text-[30px] leading-9 font-bold tracking-[-0.032em] text-brief-ink sm:text-[34px] sm:leading-10">
            {t("brief.title")}
          </h1>
          <p className="mt-2 max-w-md font-editorial text-[14.5px] leading-[22px] text-brief-meta">
            {t("brief.subtitle")}
          </p>
        </div>

        {/* A plain hairline separating the masthead from the feed. */}
        <div aria-hidden className="h-px w-full bg-brief-rule" />
      </motion.header>

      <main className="flex-1 pt-7">
        {isPending ? (
          <LoadingCard />
        ) : isError ? (
          <ErrorState onRetry={refetch} isRetrying={isFetching} />
        ) : stories.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Roomier than the card's internal rhythm on purpose: each story
                is its own object, and the gap between them is what stops the
                stack from reading as one long list. */}
            <div className="flex flex-col gap-6 sm:gap-7">
              {stories.map((story) => (
                <BriefCard key={story.id} story={story} onOpen={setOpenStory} />
              ))}
            </div>
            <p className="pt-9 text-center font-editorial text-[11.5px] leading-4 tracking-[0.02em] text-brief-faint">
              {t("brief.footnote")}
            </p>
          </>
        )}
      </main>

      <BriefDetailSheet story={openStory} onClose={() => setOpenStory(null)} />
    </div>
  );
}

/**
 * A spinner would say "wait"; this says "here is what is coming".
 *
 * Three placeholders rather than one, because the feed is a stack — a single
 * skeleton resolving into twenty cards is a bigger jump than the skeleton was
 * meant to smooth over.
 */
function LoadingCard() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-label={t("brief.loading")}
      className="flex flex-col gap-6 sm:gap-7"
    >
      <BriefCardSkeleton />
      <BriefCardSkeleton />
      <BriefCardSkeleton />
    </div>
  );
}

/**
 * Both quiet states borrow the card's own frame, so a page with no story
 * still has the same object on it in the same place.
 */
function StateShell({ title, body, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="rounded-brief bg-surface px-6 py-14 text-center font-editorial shadow-brief ring-1 ring-brief-line"
    >
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brief-chip">
        <svg
          viewBox="0 0 24 24"
          className="size-5 text-brief-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 6H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2Z" />
          <path d="M7 10h6M7 14h6M17 9v6" />
        </svg>
      </span>
      <h2 className="mt-4 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-brief-ink">
        {title}
      </h2>
      <p className="mx-auto mt-1.5 max-w-[15rem] text-[14px] leading-[21px] text-brief-body">
        {body}
      </p>
      {action}
    </motion.div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return <StateShell title={t("brief.empty")} body={t("brief.emptyBody")} />;
}

function ErrorState({ onRetry, isRetrying }) {
  const { t } = useTranslation();
  return (
    <StateShell
      title={t("brief.failed")}
      body={t("brief.failedBody")}
      action={
        <motion.button
          type="button"
          onClick={() => onRetry()}
          disabled={isRetrying}
          whileHover={isRetrying ? undefined : { y: -1 }}
          whileTap={isRetrying ? undefined : { scale: 0.98 }}
          className="mt-6 inline-flex items-center gap-2 rounded-brief-control bg-brief-accent px-5 py-2.5 text-sm font-semibold tracking-[-0.01em] text-white shadow-brief-cta transition-colors hover:bg-brief-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brief-accent disabled:opacity-60"
        >
          <RefreshCw
            className={`size-[15px] ${isRetrying ? "animate-spin" : ""}`}
            strokeWidth={1.75}
          />
          {t("brief.retry")}
        </motion.button>
      }
    />
  );
}
