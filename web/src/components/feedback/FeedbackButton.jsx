"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

import { SPRING_POP } from "@/lib/motion";

/**
 * The feedback launcher, sitting in the header immediately left of the
 * location pill — same height, radius, shadow and ring as that pill, just
 * icon-only and circular rather than carrying a label.
 *
 * `size-9` is deliberately the same number as the pill's `h-9` (see
 * `NAV_CONTROL` in home.jsx): a perfect circle whose diameter is the pill's
 * height, so the two line up exactly however the row reflows.
 */
export function FeedbackButton({ onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Send feedback"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.92 }}
      transition={SPRING_POP}
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-muted shadow-card ring-1 ring-ink/5 transition-colors hover:text-ink"
    >
      <MessageCircle className="size-4" strokeWidth={2.2} />
    </motion.button>
  );
}
