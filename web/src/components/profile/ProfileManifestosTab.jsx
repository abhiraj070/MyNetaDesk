"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { Badge, BADGES } from "../ui/Badge";
import { manifestoPoints } from "@/lib/manifesto";

const INITIAL_POINTS = 3;

/**
 * The Manifestos tab — unchanged from what `InfoSheet` used to show: the
 * same party-level commitments list, the same "show N more" toggle. Only
 * the surrounding chrome (this used to be the whole sheet; now it's one tab
 * of three) changed, per the brief to leave this functionality alone until
 * it's expanded post-auth.
 */
export function ProfileManifestosTab({ subject }) {
  const [showAll, setShowAll] = useState(false);

  const isMinister = subject.tier === "minister";
  const points = manifestoPoints(subject);
  const visiblePoints = showAll ? points : points.slice(0, INITIAL_POINTS);

  return (
    <div className="pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge {...BADGES.record} size="sm" />
        <h3 className="font-display text-sm font-bold text-ink">
          {isMinister
            ? "Union Minister's commitments"
            : "Chief Minister's commitments"}
        </h3>
      </div>

      {points.length > 0 ? (
        <>
          <ul className="mt-3 space-y-2.5">
            <AnimatePresence initial={false}>
              {visiblePoints.map((point) => (
                <motion.li
                  key={point}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                  className="flex items-start gap-3 rounded-card bg-surface-2 px-4 py-3.5 ring-1 ring-ink/5"
                >
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-laurel"
                    strokeWidth={2.5}
                  />
                  <span className="text-sm leading-relaxed font-medium text-ink">
                    {point}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {points.length > INITIAL_POINTS && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-4 py-2 font-display text-xs font-semibold text-brand-strong ring-1 ring-ink/5 transition-colors hover:bg-brand-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {showAll
                ? "Show less"
                : `Show ${points.length - INITIAL_POINTS} more`}
              <motion.span
                animate={{ rotate: showAll ? 180 : 0 }}
                transition={{ duration: 0.18 }}
                className="inline-flex"
              >
                <ChevronDown className="size-3.5" strokeWidth={2.5} />
              </motion.span>
            </button>
          )}
        </>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-faint">
          No manifesto commitments on record for {subject.party || "this party"} yet.
        </p>
      )}
    </div>
  );
}
