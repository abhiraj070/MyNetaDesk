"use client";

import { motion } from "framer-motion";

import { SPRING_POP, SPRING_PRESS } from "@/lib/motion";

/**
 * Circular icon button — consistent size, hover, and press for anything that
 * needs to sit in a floating context. Icon-only by design: the accessible name
 * comes from `label`, which is also what a tooltip would say.
 *
 * `highlight` marks it as active (the Share button once a vote lands) with a
 * filled accent colour only — no extra motion.
 */
export function IconAction({
  label,
  onClick,
  icon: Icon,
  size = "md",
  highlight = false,
}) {
  const dimensions = size === "lg" ? "size-14" : "size-11";
  const iconSize = size === "lg" ? "size-6" : "size-5";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.12, y: -3, transition: SPRING_POP }}
      whileTap={{ scaleX: 1.1, scaleY: 0.9, y: 1, transition: SPRING_PRESS }}
      className={`relative ${dimensions} flex shrink-0 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
        highlight
          ? "bg-slap text-white shadow-card"
          : "bg-surface-2 text-muted ring-1 ring-inset ring-ink/5 hover:bg-brand-wash hover:text-brand-strong hover:ring-brand/20 hover:shadow-sm"
      }`}
    >
      <Icon className={iconSize} strokeWidth={2.25} />
    </motion.button>
  );
}
