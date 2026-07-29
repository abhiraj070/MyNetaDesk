"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

import { SPRING_POP } from "@/lib/motion";

/**
 * The globally-floating feedback launcher. A frosted-glass disc, bottom-right,
 * parked above the bottom action bar and clear of the safe area. Discord/
 * Duolingo energy: a soft idle bob, a lift on hover, a squish on tap.
 *
 * The idle float lives on the wrapper and the press/hover on the button, so
 * the two never fight over the same transform (the trap that froze the hero's
 * CSS float — see globals.css). Reduced-motion drops the bob via `MotionConfig`.
 */
export function FeedbackButton({ onClick }) {
  return (
    <motion.div
      className="fixed z-30"
      style={{
        right: "max(env(safe-area-inset-right, 0px) + 16px, 16px)",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)",
      }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
      transition={{
        opacity: { duration: 0.3 },
        scale: SPRING_POP,
        y: { repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.6 },
      }}
    >
      <motion.button
        type="button"
        onClick={onClick}
        aria-label="Send feedback"
        whileHover={{ scale: 1.09, y: -2 }}
        whileTap={{ scale: 0.9 }}
        transition={SPRING_POP}
        className="relative flex size-12 items-center justify-center rounded-full bg-white/90 text-brand-strong shadow-lift ring-1 ring-ink/5 backdrop-blur-xl transition-colors hover:bg-brand-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {/* hairline top rim — reads as frosted glass, matching the action bar */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-3 top-px h-px rounded-full bg-white/80"
        />
        <MessageCircle className="size-5" strokeWidth={2.2} />
      </motion.button>
    </motion.div>
  );
}
