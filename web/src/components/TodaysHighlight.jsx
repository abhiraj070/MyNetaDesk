"use client";

import { motion } from "framer-motion";

import { Badge, BADGES } from "./ui/Badge";
import { SPRING_POP } from "@/lib/motion";

/**
 * Placeholder only — there is no backend for this yet.
 *
 * Nothing here is time-scoped in the database: the `cm` and `ministers` tables
 * hold cumulative `slap_count`/`rose_count` with no timestamps, and no endpoint
 * is scoped to a day. So these three slots deliberately render a dash rather
 * than borrowing all-time leaderboard numbers and labelling them "today" —
 * that would be wrong the moment anyone read it. Wire them up once the API can
 * answer the question.
 *
 * Laid out as a fixed three-up so it holds its exact height when real values
 * land, keeping the section from reflowing the page around it.
 */
const HIGHLIGHTS = [
  { emoji: "🔥", label: "Most Slapped", tone: "slap" },
  { emoji: "🌹", label: "Most Loved", tone: "laurel" },
  { emoji: "🏆", label: "Most Judged", tone: "sun" },
];

const TILE_ICON_TONE = {
  slap: "bg-slap-wash",
  laurel: "bg-laurel-wash",
  sun: "bg-sun-wash",
};

export function TodaysHighlight() {
  return (
    <section aria-label="Today's Highlight" className="shrink-0">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-sm font-bold text-ink">
          Today&apos;s Highlight
        </h2>
        <Badge {...BADGES.trending} size="sm" />
      </div>

      <ul className="mt-2 grid grid-cols-3 gap-2">
        {HIGHLIGHTS.map((item, index) => (
          <motion.li
            key={item.label}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...SPRING_POP, delay: 0.22 + index * 0.05 }}
            whileHover={{ y: -4, transition: SPRING_POP }}
            className="flex flex-col items-center gap-1.5 rounded-card bg-surface px-2 py-3 text-center shadow-card ring-1 ring-ink/5"
          >
            <motion.span
              aria-hidden
              whileHover={{ scale: 1.15, rotate: -8 }}
              transition={SPRING_POP}
              className={`flex size-8 items-center justify-center rounded-full text-base leading-none ${TILE_ICON_TONE[item.tone]}`}
            >
              {item.emoji}
            </motion.span>
            <p className="font-display text-[11px] leading-tight font-semibold text-ink">
              {item.label}
            </p>
            <p className="text-[11px] leading-none font-bold text-faint">—</p>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
