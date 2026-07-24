"use client";

import { motion } from "framer-motion";

import { SPRING_POP, SPRING_PRESS } from "@/lib/motion";

/**
 * Circular icon button — consistent size, hover, and press for anything that
 * needs to sit in a floating context. Icon-only by design: the accessible name
 * comes from `label`, which is also what a tooltip would say.
 *
 * `highlight` turns it into the reward beat for whatever just happened (the
 * Share button once a vote lands): filled accent + a soft looping pulse ring,
 * echoing the ring already used elsewhere rather than introducing a new motion
 * pattern.
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
      /* A one-shot pop the moment it lights up, so the reward beat is felt
         even if the eye was elsewhere on the page. Three keyframes can't run
         on a spring — Motion only supports two — so the pop is a short tween
         with a back-out ease, and hover/press carry their own springs. */
      animate={{ scale: highlight ? [1, 1.22, 1] : 1 }}
      whileHover={{ scale: 1.12, y: -3, transition: SPRING_POP }}
      whileTap={{ scaleX: 1.1, scaleY: 0.9, y: 1, transition: SPRING_PRESS }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      className={`relative ${dimensions} flex shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
        highlight
          ? "bg-slap text-white shadow-card"
          : "bg-surface-2 text-muted ring-1 ring-ink/5 hover:bg-brand-wash hover:text-brand-strong"
      }`}
    >
      {highlight && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border-2 border-slap"
          animate={{ scale: [1, 1.4, 1], opacity: [0.65, 0, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <Icon className={iconSize} strokeWidth={2.25} />
    </motion.button>
  );
}
