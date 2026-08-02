"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

import { SPRING_POP } from "@/lib/motion";

/**
 * The feedback launcher, sitting in the header immediately left of the
 * location pill — same height, radius, shadow and ring as that pill (and the
 * back-button chip it swaps with), just icon-only and square rather than
 * carrying a label.
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
      className="flex shrink-0 items-center justify-center rounded-full bg-surface p-1.5 text-muted shadow-card ring-1 ring-ink/5 transition-colors hover:text-ink"
    >
      <MessageCircle className="size-4" strokeWidth={2.2} />
    </motion.button>
  );
}
