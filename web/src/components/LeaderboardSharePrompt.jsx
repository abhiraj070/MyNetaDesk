"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { leaderboardShareUrl } from "@/lib/share";
import { SPRING_ENTRANCE } from "@/lib/motion";

import { ShareButton } from "./ShareButton";

/**
 * A playful, once-per-session nudge to share the leaderboard — Duolingo-style,
 * not a browser alert. Appears ~1s after the leaderboard opens, springs in, and
 * never returns this session once shared or dismissed (close button, "Maybe
 * later", or tapping the backdrop all count as dismissal).
 */
const SESSION_KEY = "mnd:lb-share-prompt";

function alreadySeen() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* private mode / storage blocked — worst case it shows once more */
  }
}

export function LeaderboardSharePrompt({ open, tier = "cm", showToast }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open || alreadySeen()) return undefined;
    // Let the leaderboard settle first, then invite.
    const timer = setTimeout(() => {
      if (!alreadySeen()) setVisible(true);
    }, 1000);
    // Cleanup runs when the sheet closes — cancel a pending invite and reset so
    // a fresh open re-arms the 1s delay rather than flashing instantly.
    return () => {
      clearTimeout(timer);
      setVisible(false);
    };
  }, [open]);

  function dismiss() {
    markSeen();
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={dismiss}
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lb-share-title"
            initial={{ opacity: 0, y: 26, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={SPRING_ENTRANCE}
            className="relative w-full max-w-sm overflow-hidden rounded-card bg-surface p-6 text-center shadow-lift ring-1 ring-ink/5"
          >
            {/* confetti accents */}
            <span aria-hidden className="pointer-events-none absolute left-5 top-4 text-lg">🎉</span>
            <span aria-hidden className="pointer-events-none absolute right-8 top-6 text-sm">✨</span>
            <span aria-hidden className="pointer-events-none absolute bottom-4 left-8 text-sm">🌹</span>

            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-4" />
            </button>

            <div aria-hidden className="text-4xl">🏆</div>
            <h2
              id="lb-share-title"
              className="mt-2 font-display text-xl font-bold text-ink"
            >
              Your leaderboard is ready!
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
              Think your friends support different leaders? Share the leaderboard
              and settle the debate.
            </p>

            <div className="mt-5 flex flex-col items-stretch gap-2">
              <ShareButton
                url={leaderboardShareUrl(tier)}
                title="MyNetaji Leaderboard"
                text="Think your friends back different leaders? Settle the debate 👇"
                label="Share Leaderboard 🚀"
                variant="primary"
                showToast={showToast}
                onShared={dismiss}
                className="w-full py-3 text-base"
              />
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full py-2 font-display text-sm font-semibold text-muted transition-colors hover:text-ink"
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
