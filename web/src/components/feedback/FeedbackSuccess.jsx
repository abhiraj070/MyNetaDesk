"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

import { SPRING_ENTRANCE, SPRING_POP } from "@/lib/motion";

/**
 * The payoff. A small celebratory modal that pops after a successful send —
 * confetti, a spring-scaled emoji, and copy that changes with the reaction.
 * Auto-dismisses so the user never has to hunt for a close, but a tap anywhere
 * closes it early.
 *
 * Copy uses "MyNetaji" (the brief's "SYL" was the old repo name) to stay on-brand.
 */
const COPY = {
  slap: {
    emoji: "👋",
    title: "Fair enough!",
    lines: [
      "We deserved that.",
      "Your feedback helps us improve MyNetaji.",
      "We'll probably fix it before the politicians fix the roads. 😄",
    ],
  },
  rose: {
    emoji: "🌹",
    title: "Thanks!",
    lines: [
      "Your feedback helps improve MyNetaji.",
      "We'll probably fix it before the politicians fix the roads. 😄",
    ],
  },
};

const CONFETTI = ["🎉", "✨", "🌹", "⭐", "👋", "💛", "🎊", "✨"];

export function FeedbackSuccess({ reaction, onClose }) {
  const open = Boolean(reaction);
  const copy = reaction ? COPY[reaction] : null;

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 4200);
    return () => clearTimeout(t);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && copy && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={copy.title}
            initial={{ opacity: 0, y: 28, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={SPRING_ENTRANCE}
            className="relative w-full max-w-sm overflow-hidden rounded-card bg-surface p-7 text-center shadow-lift ring-1 ring-ink/5"
          >
            {/* confetti burst */}
            {CONFETTI.map((c, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-8 text-xl"
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  x: (i % 2 === 0 ? -1 : 1) * (40 + (i % 4) * 46),
                  y: [-6, -60 - (i % 3) * 26],
                  scale: 1,
                  rotate: (i % 2 === 0 ? -1 : 1) * 40,
                }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.05 * i }}
              >
                {c}
              </motion.span>
            ))}

            <motion.div
              aria-hidden
              className="text-6xl"
              initial={{ scale: 0.4, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...SPRING_POP, delay: 0.05 }}
            >
              {copy.emoji}
            </motion.div>

            <h2 className="mt-3 font-display text-2xl font-bold text-ink">
              {copy.title}
            </h2>
            <div className="mt-2 space-y-1">
              {copy.lines.map((line, i) => (
                <p key={i} className="text-sm font-medium text-muted">
                  {line}
                </p>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-control bg-surface-2 py-3 font-display text-sm font-bold text-brand-strong ring-1 ring-ink/5 transition-colors hover:bg-brand-wash"
            >
              Done
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
