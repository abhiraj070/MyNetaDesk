"use client";

import { Newspaper } from "lucide-react";

import { BottomSheet } from "@/components/BottomSheet";
import { useTranslation } from "@/lib/i18n";

/**
 * Live News for the representative on screen.
 *
 * There is no news source wired up yet — no endpoint, no feed — so this
 * renders its empty state rather than inventing headlines. The sheet, its
 * copy and its translation keys are in place, so connecting a feed later is a
 * matter of filling `items`, not building the surface.
 */
export function LiveNewsSheet({ open, onClose, subject, items = [] }) {
  const { t } = useTranslation();

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("news.title")}
      subtitle={subject?.name}
    >
      {items.length === 0 ? (
        <div className="flex items-start gap-3 rounded-card bg-surface-2 px-4 py-3.5 ring-1 ring-ink/5">
          <Newspaper className="mt-0.5 size-4 shrink-0 text-faint" strokeWidth={2} />
          <p className="text-xs leading-relaxed font-medium text-muted">
            {t("news.empty")}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={item.url ?? index}
              className="rounded-card bg-surface p-4 shadow-card ring-1 ring-ink/5"
            >
              <p className="font-display text-sm font-bold text-ink">{item.title}</p>
              {item.source && (
                <p className="mt-1 text-xs font-semibold text-muted">{item.source}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
