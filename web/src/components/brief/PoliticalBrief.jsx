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
 * The Political Brief: one story, chosen for the day.
 *
 * Deliberately a single card and nothing else — no rail of runners-up, no
 * counter, no rest of the feed. The whole point of the surface is that the
 * reader knows what today's biggest political story is before they have
 * decided whether to scroll.
 *
 * The rest of the app sits on a bright three-colour ambient gradient; here it
 * is covered by a flat near-white so the photograph is the only colour on
 * screen. Nothing dated is shown anywhere except the story's own publication
 * day: no relative times, no counts, nothing that would make the page read
 * differently at midnight than it did at breakfast.
 */
export function PoliticalBrief() {
  const { t } = useTranslation();
  const router = useRouter();
  const { stories, isPending, isError, isFetching, refetch } = useNews();
  const [openStory, setOpenStory] = useState(null);

  const story = stories[0] ?? null;

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-2 pb-12 sm:px-6">
      <div aria-hidden className="fixed inset-0 -z-10 bg-brief-page" />

      <motion.header {...rise(0)} className="shrink-0">
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t("nav.back")}
            className="-ml-2 flex size-10 items-center justify-center rounded-full text-[#3a3a46] transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <ArrowLeft className="size-[19px]" strokeWidth={2} />
          </button>
          <p className="font-display text-[17px] leading-none font-bold tracking-tight text-brief-ink">
            {t("app.name")}
          </p>
        </div>

        <div className="pt-[18px] pb-[18px]">
          {/* The one place on this screen still set in the app's own face —
              the brief belongs to MyNetaji; the story inside it does not. */}
          <h1 className="font-display text-2xl leading-7 font-bold tracking-[-0.01em] text-brief-ink">
            {t("brief.title")}
          </h1>
          <p className="mt-[5px] font-editorial text-[13px] leading-[18px] text-brief-meta">
            {t("brief.subtitle")}
          </p>
        </div>
      </motion.header>

      <main className="flex-1">
        {isPending ? (
          <LoadingCard />
        ) : isError ? (
          <ErrorState onRetry={refetch} isRetrying={isFetching} />
        ) : !story ? (
          <EmptyState />
        ) : (
          <>
            <BriefCard story={story} onOpen={setOpenStory} />
            <p className="pt-4 text-center font-editorial text-[11px] leading-[14px] tracking-[0.02em] text-brief-faint">
              {t("brief.footnote")}
            </p>
          </>
        )}
      </main>

      <BriefDetailSheet story={openStory} onClose={() => setOpenStory(null)} />
    </div>
  );
}

/** A spinner would say "wait"; this says "here is what is coming". */
function LoadingCard() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t("brief.loading")}>
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
      className="rounded-[18px] bg-surface px-6 py-12 text-center font-editorial shadow-brief ring-1 ring-brief-line"
    >
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-brief-chip">
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
          className="mt-5 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold tracking-[-0.01em] text-[#1b1b24] ring-1 ring-brief-line transition-colors hover:bg-brief-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
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
