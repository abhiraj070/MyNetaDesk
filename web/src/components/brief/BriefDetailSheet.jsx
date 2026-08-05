"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import { useEffect } from "react";

import { useTranslation } from "@/lib/i18n";
import { SPRING_ENTRANCE, SPRING_POP, SPRING_SHEET } from "@/lib/motion";

/**
 * The story in full, on a sheet that covers 90% of the viewport.
 *
 * Deliberately a separate surface rather than an expanding card: expanding in
 * place would push the page around under the reader and turn the preview into
 * the article, which it is not. This is still a summary — the source's own
 * page is one tap below it, pinned so it never scrolls out of reach.
 *
 * The open story is the prop, not internal state, so closing is a single
 * `null` upstream; AnimatePresence holds the last rendered element on screen
 * while the sheet slides away, so the text doesn't blank out mid-exit.
 */
export function BriefDetailSheet({ story, onClose }) {
  const { t } = useTranslation();
  const open = Boolean(story);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {story && (
        <div className="fixed inset-0 z-50 font-editorial">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-brief-ink/40 backdrop-blur-[2px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={story.title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            /* Tweens out, like every other sheet in the app: a spring on exit
               drags the tail of the close past the point where it still reads
               as responsive. */
            exit={{ y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={SPRING_SHEET}
            className="absolute inset-x-0 bottom-0 flex h-[90vh] flex-col rounded-t-[22px] bg-surface sm:mx-auto sm:max-w-xl"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 px-[18px] pt-3.5 pb-3">
              <span className="truncate text-[12.5px] leading-4 font-medium text-brief-source">
                {story.source}
              </span>
              <motion.button
                type="button"
                onClick={onClose}
                aria-label={t("common.close")}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                transition={SPRING_POP}
                className="-mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-full text-brief-meta transition-colors hover:bg-brief-chip hover:text-brief-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <X className="size-[18px]" strokeWidth={1.75} />
              </motion.button>
            </header>

            <div aria-hidden className="h-px shrink-0 bg-brief-rule" />

            {/* The article arrives a beat behind the panel, so the sheet lands
                first and its contents settle into it. */}
            <motion.article
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_ENTRANCE, delay: 0.08 }}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[18px] pt-5 pb-8"
            >
              <h2 className="text-[26px] leading-[32px] font-semibold tracking-[-0.022em] text-balance text-brief-ink">
                {story.title}
              </h2>

              <p className="mt-4 text-[16px] leading-[26px] tracking-[-0.006em] whitespace-pre-line text-brief-body">
                {story.summary || story.preview}
              </p>
            </motion.article>

            {story.url && (
              <div className="shrink-0 border-t border-brief-rule px-[18px] pt-3.5 pb-[max(1.125rem,env(safe-area-inset-bottom))]">
                <motion.a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  transition={SPRING_POP}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brief-ink px-6 py-3.5 text-[15px] font-semibold tracking-[-0.01em] text-white transition-colors hover:bg-[#26262f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {t("brief.readOriginal")}
                  <ArrowUpRight className="size-4" strokeWidth={2} />
                </motion.a>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
