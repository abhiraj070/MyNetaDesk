"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Globe, MessageCircle, X } from "lucide-react";
import { useEffect } from "react";

import { useTranslation } from "@/lib/i18n";
import { SPRING_SHEET } from "@/lib/motion";

/**
 * The app drawer, slid in from the left by the hamburger that sits outside the
 * nav bar.
 *
 * Two entries today — Language and Feedback — but built as a list of rows
 * rather than two bespoke buttons, so adding an item later is one array entry.
 * Feedback lives here now rather than in the header, where Live News took its
 * place.
 */
export function Sidebar({ open, onClose, onOpenLanguage, onOpenFeedback }) {
  const { t, language, languages } = useTranslation();

  // Lock body scroll and wire Escape while open — mirrors BottomSheet so every
  // overlay in the app behaves the same way.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const activeLanguage =
    languages.find((l) => l.code === language)?.label ?? language;

  const items = [
    {
      key: "language",
      icon: Globe,
      label: t("nav.language"),
      // The current choice reads as a value, so the row states what it is set
      // to rather than only what it does.
      value: activeLanguage,
      onClick: onOpenLanguage,
    },
    {
      key: "feedback",
      icon: MessageCircle,
      label: t("nav.feedback"),
      value: null,
      onClick: onOpenFeedback,
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/45 backdrop-blur-sm"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.menu")}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={SPRING_SHEET}
            className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col rounded-r-card bg-surface shadow-lift"
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <p className="font-display text-lg leading-none font-bold tracking-tight text-ink">
                {t("app.name")}
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("nav.closeMenu")}
                className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-muted ring-1 ring-ink/5 transition-colors hover:text-ink"
              >
                <X className="size-4" strokeWidth={2.5} />
              </button>
            </div>

            <nav className="px-4">
              <ul className="space-y-2">
                {items.map(({ key, icon: Icon, label, value, onClick }) => (
                  <li key={key}>
                    <motion.button
                      type="button"
                      onClick={onClick}
                      whileTap={{ scale: 0.98 }}
                      className="flex w-full items-center gap-3 rounded-control bg-surface-2 px-4 py-3.5 text-left ring-1 ring-ink/5 transition-colors hover:bg-brand-wash/40"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-wash text-brand-strong">
                        <Icon className="size-4" strokeWidth={2.25} />
                      </span>
                      <span className="min-w-0 flex-1 font-display text-sm font-bold text-ink">
                        {label}
                      </span>
                      {value && (
                        <span className="shrink-0 text-xs font-semibold text-muted">
                          {value}
                        </span>
                      )}
                      <ChevronRight
                        className="size-4 shrink-0 text-faint"
                        strokeWidth={2.5}
                      />
                    </motion.button>
                  </li>
                ))}
              </ul>
            </nav>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
