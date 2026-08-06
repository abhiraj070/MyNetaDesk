"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Heart, MessageCircle, Repeat2 } from "lucide-react";

import {
  enter,
  LookingForwardButton,
  PreviewHero,
  PreviewNote,
  RoadmapList,
} from "@/components/comingsoon/ComingSoon";
import { XLogo } from "./XLogo";
import { useTranslation } from "@/lib/i18n";

/**
 * What the X section shows until live X data is wired up.
 *
 * The three shimmering cards are the point of the screen: they are the shape of
 * a real post — avatar, handle line, two lines of text, the reaction row — so
 * the reader can see what will land here rather than read a promise about it.
 * They use the same `skeleton-sweep` as the app's genuine loading states, which
 * is what makes them read as "arriving" rather than "missing".
 */

const FEATURES = [
  "discussions",
  "trending",
  "accounts",
  "moments",
  "sentiment",
];

/** Widths for the two text lines of each placeholder, so no two cards match. */
const POST_SHAPES = [
  ["w-[92%]", "w-[64%]"],
  ["w-[85%]", "w-[47%]"],
  ["w-[95%]", "w-[72%]"],
];

export function XPulsePreview({ onClose }) {
  const { t } = useTranslation();

  const features = FEATURES.map((key) => ({
    key,
    label: t(`comingSoon.x.feature.${key}`),
  }));

  return (
    <div className="pb-2">
      <PreviewHero
        icon={<XLogo className="size-7 text-ink" />}
        title={t("comingSoon.x.title")}
        body={t("comingSoon.x.body")}
        order={0}
      />

      <div className="space-y-3 px-5 pt-7">
        {POST_SHAPES.map((shape, index) => (
          <PostPlaceholder key={index} shape={shape} order={1 + index} />
        ))}
      </div>

      <RoadmapList title={t("comingSoon.roadmap")} items={features} order={4} />

      <PreviewNote
        title={t("comingSoon.x.noteTitle")}
        body={t("comingSoon.x.noteBody")}
        order={10}
      />

      <LookingForwardButton onClick={onClose} order={11} />
    </div>
  );
}

/**
 * One post-shaped placeholder. Everything inside is inert and `aria-hidden`
 * except the "Verified Account" line, which is the one piece of real
 * information here: it names what these cards will hold.
 */
function PostPlaceholder({ shape, order }) {
  const { t } = useTranslation();

  return (
    <motion.div
      {...enter(order)}
      className="rounded-[24px] bg-surface p-4 shadow-card ring-1 ring-ink/5"
    >
      <div className="flex items-center gap-3">
        <Shimmer className="size-10 shrink-0 rounded-full" />
        <span className="inline-flex items-center gap-1.5 font-display text-[13px] font-semibold text-muted">
          {t("comingSoon.x.verified")}
          <BadgeCheck className="size-3.5 text-brand" strokeWidth={2.5} />
        </span>
      </div>

      <div aria-hidden className="mt-3.5 space-y-2">
        <Shimmer className={`h-3 ${shape[0]} rounded-full`} />
        <Shimmer className={`h-3 ${shape[1]} rounded-full`} />
      </div>

      <div
        aria-hidden
        className="mt-4 flex items-center gap-6 text-faint"
      >
        <Heart className="size-4" strokeWidth={2} />
        <Repeat2 className="size-4" strokeWidth={2} />
        <MessageCircle className="size-4" strokeWidth={2} />
      </div>
    </motion.div>
  );
}

/** A bar of the app's own loading sweep (keyframes live in globals.css). */
function Shimmer({ className = "" }) {
  return (
    <span
      aria-hidden
      className={`relative block overflow-hidden bg-rule/70 ${className}`}
    >
      <span className="skeleton-sweep" />
    </span>
  );
}
