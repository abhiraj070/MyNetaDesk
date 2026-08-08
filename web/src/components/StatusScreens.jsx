"use client";

import { motion } from "framer-motion";

import { Button } from "./ui/Button";
import { rise } from "@/lib/motion";
import { useTranslation } from "@/lib/i18n";

const shell = "mx-auto w-full max-w-xl px-5 py-24 sm:px-8";

/*
 * The locating screen that used to live here moved to
 * `components/skeletons/GamePageSkeleton` — it mirrored the hero card, the
 * verdict discs and the highlight row, which is the game page's layout, not
 * the information page's. The main page's own stand-in is
 * `components/skeletons/InfoPageSkeleton`.
 */

export function ErrorScreen({ overline, title, body, onRetry }) {
  const { t } = useTranslation();

  return (
    <motion.div
      {...rise(0)}
      className={shell}
      role="alert"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slap-wash px-3 py-1.5 font-display text-xs font-semibold text-slap-strong ring-1 ring-slap/15 ring-inset">
        <span aria-hidden>😬</span>
        {overline}
      </span>

      <h2 className="mt-3 font-display text-2xl font-bold text-balance sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed font-medium text-muted text-pretty">
        {body}
      </p>

      <Button variant="secondary" className="mt-7" onClick={onRetry}>
        {t("status.tryAgain")}
      </Button>
    </motion.div>
  );
}
