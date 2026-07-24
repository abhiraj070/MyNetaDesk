"use client";

import { motion } from "framer-motion";

import { SPRING_POP } from "@/lib/motion";

/**
 * `primary` carries the same chunky pressed-key feel as the verdict discs —
 * a solid edge underneath that compresses on tap — so the two read as one
 * physical language. `secondary` and `quiet` stay flat and out of the way.
 */
const VARIANTS = {
  primary:
    "bg-brand text-white shadow-[0_5px_0_var(--color-brand-strong)] hover:bg-brand-strong hover:shadow-[0_5px_0_#075985] active:translate-y-[3px] active:shadow-[0_2px_0_var(--color-brand-strong)] focus-visible:outline-brand",
  secondary:
    "bg-surface text-ink ring-1 ring-ink/8 shadow-card hover:ring-brand/30 focus-visible:outline-brand",
  quiet:
    "bg-transparent text-muted hover:text-ink focus-visible:outline-brand",
};

export function Button({
  variant = "primary",
  className = "",
  disabled,
  ...props
}) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scaleX: 1.03, scaleY: 0.94, y: 2 }}
      transition={SPRING_POP}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-control px-6 py-3.5 font-display text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
