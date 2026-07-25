"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { RefreshCw, X } from "lucide-react";
import { useEffect } from "react";

import { TweetCard, TweetSkeleton } from "./TweetCard";
import { XLogo } from "./XLogo";
import { useTweets } from "@/hooks/useTweets";
import { SPRING_SHEET } from "@/lib/motion";

/**
 * The X discussion bottom sheet: a premium, app-styled surface that slides up
 * to ~88% height and shows recent X posts about the current representative.
 *
 * The chrome (backdrop blur, spring, rounded top, sticky draggable header) is
 * ours; each post inside is wrapped in one of our elevated cards but recreates
 * the native X tweet layout (see `TweetCard`). Only the list scrolls — the
 * header stays put — and the sheet can be flung down to dismiss.
 *
 * A dedicated sheet rather than the shared `BottomSheet` because this one needs
 * drag-to-dismiss, a bespoke multi-line header and a virtualised list; keeping
 * it separate leaves the other sheets untouched.
 */
export function XDiscussionSheet({ open, onClose, subject }) {
  const dragControls = useDragControls();

  const { tweets, isPending, isError, refetch, isFetching } = useTweets({
    tier: subject?.tier,
    name: subject?.name,
    enabled: open,
  });

  // Lock body scroll and wire Escape while open — mirrors BottomSheet so the
  // two sheets behave identically to the user.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const name = subject?.name ?? "this leader";
  const shownCount = tweets.length || 30;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="X Live Discussion"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={SPRING_SHEET}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="absolute inset-x-0 bottom-0 flex h-[88vh] flex-col rounded-t-[32px] bg-surface shadow-lift sm:mx-auto sm:max-w-[760px]"
          >
            {/* Sticky header — the drag zone. Only this initiates the flick-to-
                dismiss; the list below scrolls independently. */}
            <header
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: "none" }}
              className="shrink-0 cursor-grab rounded-t-[32px] active:cursor-grabbing"
            >
              <div
                aria-hidden
                className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-rule"
              />

              <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 font-display text-2xl leading-tight font-bold text-ink">
                    <XLogo className="size-5" />
                    Live Discussion
                  </h2>
                  <p className="mt-0.5 text-sm font-semibold text-muted">
                    See what people are saying
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-2.5 py-1 font-display text-[11px] font-semibold text-brand-strong ring-1 ring-brand/15 ring-inset">
                      <span className="relative flex size-1.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
                      </span>
                      Trending about {name}
                    </span>
                    <span className="text-[11px] font-bold text-faint">
                      Top {shownCount} Posts
                    </span>
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={onClose}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Close"
                  whileHover={{ scale: 1.08, rotate: 90 }}
                  whileTap={{ scale: 0.92 }}
                  className="shrink-0 rounded-full bg-surface-2 p-2.5 text-muted ring-1 ring-ink/5 transition-colors hover:bg-brand-wash hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <X className="size-4" strokeWidth={2} />
                </motion.button>
              </div>

              <div className="h-px bg-rule" />
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-paper">
              {isPending ? (
                <SkeletonList />
              ) : isError ? (
                <ErrorState onRetry={refetch} isRetrying={isFetching} />
              ) : tweets.length === 0 ? (
                <EmptyState name={name} onRefresh={refetch} isRetrying={isFetching} />
              ) : (
                <ul className="space-y-3 px-3 py-3 sm:px-4">
                  {tweets.map((tweet) => (
                    // `content-visibility` skips rendering off-screen posts —
                    // dependency-free virtualisation; `contain-intrinsic-size`
                    // reserves height so the scrollbar stays stable.
                    <li
                      key={tweet.id}
                      style={{
                        contentVisibility: "auto",
                        containIntrinsicSize: "auto 280px",
                      }}
                    >
                      <div className="rounded-[24px] bg-surface shadow-card ring-1 ring-ink/5">
                        <TweetCard tweet={tweet} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-3 px-3 py-3 sm:px-4">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i}>
          <div className="rounded-[24px] bg-surface shadow-card ring-1 ring-ink/5">
            <TweetSkeleton />
          </div>
        </li>
      ))}
    </ul>
  );
}

function StateShell({ emoji, title, body, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
      className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center"
    >
      <span className="text-5xl">{emoji}</span>
      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
      <p className="max-w-xs text-sm leading-relaxed font-medium text-muted">
        {body}
      </p>
      {action}
    </motion.div>
  );
}

function RetryButton({ onClick, label, isRetrying }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isRetrying}
      whileTap={{ scale: 0.96 }}
      className="mt-1 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-display text-sm font-semibold text-white shadow-card disabled:opacity-60"
    >
      <RefreshCw className={`size-4 ${isRetrying ? "animate-spin" : ""}`} />
      {label}
    </motion.button>
  );
}

function EmptyState({ name, onRefresh, isRetrying }) {
  return (
    <StateShell
      emoji="🕊️"
      title="No posts yet"
      body={`Nobody's talking about ${name} on X right now. Check back in a bit.`}
      action={<RetryButton onClick={onRefresh} label="Refresh" isRetrying={isRetrying} />}
    />
  );
}

function ErrorState({ onRetry, isRetrying }) {
  return (
    <StateShell
      emoji="😵‍💫"
      title="Couldn't load the discussion"
      body="Something went wrong reaching X. Give it another go."
      action={<RetryButton onClick={onRetry} label="Try again" isRetrying={isRetrying} />}
    />
  );
}
