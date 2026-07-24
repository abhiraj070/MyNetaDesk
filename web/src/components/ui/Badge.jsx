"use client";

import { motion } from "framer-motion";

import { SPRING_POP } from "@/lib/motion";

/**
 * Sticker-style label: an emoji, a short phrase, a colour wash and a hairline
 * ring, optionally tilted a degree or two so it reads as something stuck onto
 * the surface rather than printed on it.
 *
 * Used for section headers, the hero's role line, and the highlight tiles.
 * `BADGES` holds the recurring ones so the same wording and colour turn up
 * everywhere that concept does — pass one through with `{...BADGES.record}`.
 */
const TONES = {
  brand: "bg-brand-wash text-brand-strong ring-brand/15",
  slap: "bg-slap-wash text-slap-strong ring-slap/15",
  laurel: "bg-laurel-wash text-laurel-strong ring-laurel/15",
  sun: "bg-sun-wash text-sun-strong ring-sun/20",
  neutral: "bg-surface-2 text-muted ring-ink/8",
};

const SIZES = {
  sm: "gap-1 px-2.5 py-1 text-[11px]",
  md: "gap-1.5 px-3 py-1.5 text-xs",
  lg: "gap-1.5 px-3.5 py-2 text-sm",
};

export const BADGES = {
  hotSeat: { emoji: "🔥", label: "Today's Hot Seat", tone: "slap" },
  hallOfFame: { emoji: "🏆", label: "Hall of Fame", tone: "sun" },
  featured: { emoji: "⭐", label: "Featured", tone: "sun" },
  trending: { emoji: "⚡", label: "Trending", tone: "brand" },
  record: { emoji: "📜", label: "The Record", tone: "brand" },
};

/**
 * Stickers get pressed on rather than faded in: a spring from slightly small
 * and slightly over-rotated, settling into place. Purely transform + opacity,
 * and it replays whenever the badge remounts — which is exactly when the card
 * swaps or a sheet opens.
 */
export function Badge({
  emoji,
  label,
  children,
  tone = "neutral",
  size = "md",
  tilt = false,
  shimmer = false,
  className = "",
}) {
  return (
    <motion.span
      initial={{ scale: 0.7, opacity: 0, rotate: tilt ? -8 : 0 }}
      animate={{ scale: 1, opacity: 1, rotate: tilt ? -2 : 0 }}
      whileHover={{ scale: 1.06, rotate: tilt ? -4 : 0 }}
      transition={SPRING_POP}
      className={`relative inline-flex max-w-full items-center overflow-hidden rounded-full font-display font-semibold ring-1 ring-inset ${
        TONES[tone] ?? TONES.neutral
      } ${SIZES[size] ?? SIZES.md} ${shimmer ? "badge-shimmer" : ""} ${className}`}
    >
      {emoji && (
        <span aria-hidden className="relative leading-none">
          {emoji}
        </span>
      )}
      <span className="relative truncate">{children ?? label}</span>
    </motion.span>
  );
}
