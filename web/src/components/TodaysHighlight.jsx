"use client";

import { motion } from "framer-motion";

import { Badge, BADGES } from "./ui/Badge";
import { useHighlights } from "@/hooks/useHighlights";
import { SPRING_POP, SPRING_PRESS } from "@/lib/motion";

/**
 * Today's three leaders, one tile each, fed by `/most-slapped`,
 * `/most-roasted` and `/most-judged`.
 *
 * A tile holding a person is a real `<button>` that opens their full profile —
 * the same card, fetched the same way, as tapping their leaderboard row.
 * `onSelectSubject` is the leaderboard's own handler passed straight through,
 * so there is one code path for "open this person" rather than two. Tiles that
 * are loading, empty or failed stay inert: there is nothing to open.
 *
 * Every tile reserves the same height in all four of its states — loading,
 * loaded, empty, failed — so the row never reflows as data arrives or an
 * endpoint drops out. The states are kept distinct on purpose: "no verdicts
 * yet today" is a real answer about a quiet morning, while "unavailable" is
 * the app admitting it couldn't ask.
 */
const HIGHLIGHTS = [
  { slot: "slapped", emoji: "👋", label: "Most Slapped", tone: "slap" },
  { slot: "loved", emoji: "🌹", label: "Most Loved", tone: "laurel" },
  { slot: "judged", emoji: "🏆", label: "Most Judged", tone: "sun" },
];

const TILE_ICON_TONE = {
  slap: "bg-slap-wash",
  laurel: "bg-laurel-wash",
  sun: "bg-sun-wash",
};

const TILE_CLASS =
  "flex h-full w-full flex-col items-center gap-1.5 rounded-card bg-surface px-2 py-3 text-center shadow-card ring-1 ring-ink/5";

/** CM rows carry `name`, Union Minister rows carry `minister_name`. */
function displayName(row) {
  return row?.name ?? row?.minister_name ?? null;
}

export function TodaysHighlight({ onSelectSubject, pendingKey }) {
  const { slots, isPending } = useHighlights();

  return (
    <section aria-label="Today's Highlight" className="shrink-0">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-sm font-bold text-ink">
          Today&apos;s Highlight
        </h2>
        <Badge {...BADGES.trending} size="sm" />
      </div>

      <ul className="mt-2 grid grid-cols-3 gap-2">
        {HIGHLIGHTS.map((item, index) => {
          const slot = slots?.[item.slot];
          const row = slot?.data ?? null;
          const name = displayName(row);
          // Same key format the leaderboard uses, so the two share one
          // in-flight marker and can't both fetch at once.
          const isOpening = Boolean(name) && pendingKey === `${row.tier}:${name}`;
          const canOpen = Boolean(name) && Boolean(onSelectSubject);

          const inner = (
            <>
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

              <TileValue
                isPending={isPending}
                slot={slot}
                emoji={item.emoji}
              />
            </>
          );

          return (
            <motion.li
              key={item.slot}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...SPRING_POP, delay: 0.22 + index * 0.05 }}
            >
              {canOpen ? (
                <motion.button
                  type="button"
                  onClick={() => onSelectSubject(row.tier, row)}
                  disabled={isOpening}
                  aria-label={`View ${name}'s profile`}
                  whileHover={{ y: -4, transition: SPRING_POP }}
                  whileTap={{
                    scaleX: 1.04,
                    scaleY: 0.94,
                    transition: SPRING_PRESS,
                  }}
                  className={`${TILE_CLASS} transition-shadow hover:shadow-lift hover:ring-brand/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait ${
                    isOpening ? "opacity-60" : ""
                  }`}
                >
                  {inner}
                </motion.button>
              ) : (
                // Nothing to open, so it stays a plain surface — no pointer
                // cursor promising an interaction that isn't there.
                <motion.div
                  whileHover={{ y: -4, transition: SPRING_POP }}
                  className={TILE_CLASS}
                >
                  {inner}
                </motion.div>
              )}
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * The one line that changes. `min-h-8` is what holds the row steady: the
 * skeleton, a name and a dash all occupy the same two lines.
 */
function TileValue({ isPending, slot, emoji }) {
  if (isPending) {
    return (
      <span
        aria-hidden
        className="flex min-h-8 w-full animate-pulse flex-col items-center justify-center gap-1"
      >
        <span className="block h-2.5 w-4/5 rounded-full bg-rule" />
        <span className="block h-2 w-1/2 rounded-full bg-rule/70" />
      </span>
    );
  }

  if (slot?.failed) {
    return (
      <span className="flex min-h-8 items-center text-[11px] leading-tight font-semibold text-faint">
        Unavailable
      </span>
    );
  }

  const name = displayName(slot?.data);

  if (!name) {
    return (
      <span className="flex min-h-8 items-center text-[11px] leading-tight font-medium text-faint">
        No verdicts yet
      </span>
    );
  }

  return (
    <span className="flex min-h-8 w-full flex-col items-center justify-center gap-0.5">
      <span
        title={name}
        className="w-full truncate text-[11px] leading-tight font-bold text-ink"
      >
        {name}
      </span>
      <span className="text-[11px] leading-none font-bold text-muted tabular-nums">
        {Number(slot.data.count ?? 0).toLocaleString("en-IN")}{" "}
        <span aria-hidden>{emoji}</span>
      </span>
    </span>
  );
}
