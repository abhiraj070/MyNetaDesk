"use client";

import {
  LookingForwardButton,
  PreviewHero,
  PreviewNote,
  RoadmapList,
} from "@/components/comingsoon/ComingSoon";
import { PreviewSheet } from "@/components/comingsoon/PreviewSheet";
import { useTranslation } from "@/lib/i18n";

/**
 * What the locked Performance tab opens.
 *
 * The roadmap leads with the one thing already in the reader's hands — the
 * basic profile they are looking at — so the list reads as a feature growing
 * outward from what exists, rather than nine things they don't have.
 */

const METRICS = [
  "fundsAllocated",
  "fundsUtilized",
  "utilizationRate",
  "projectsInitiated",
  "projectsCompleted",
  "projectsOngoing",
  "developmentProgress",
  "spendingInsights",
  "analytics",
];

const FUTURE = [
  "projects",
  "funds",
  "timelines",
  "transparency",
  "analytics",
  "visualisations",
];

export function PerformancePreviewSheet({ open, onClose }) {
  const { t } = useTranslation();

  const items = [
    {
      key: "basicProfile",
      label: t("comingSoon.performance.basicProfile"),
      unlocked: true,
      badge: t("comingSoon.live"),
    },
    ...METRICS.map((key) => ({
      key,
      label: t(`comingSoon.performance.metric.${key}`),
    })),
  ];

  const bullets = FUTURE.map((key) => ({
    key,
    label: t(`comingSoon.performance.future.${key}`),
  }));

  return (
    <PreviewSheet
      open={open}
      onClose={onClose}
      label={t("profile.performance")}
      header={
        <>
          <h2 className="font-display text-2xl leading-tight font-bold text-ink">
            {t("profile.performance")}
          </h2>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-wash px-2.5 py-1 font-display text-[11px] font-semibold text-brand-strong ring-1 ring-brand/15 ring-inset">
            <span aria-hidden>✨</span>
            {t("comingSoon.badge")}
          </span>
        </>
      }
    >
      <div className="pb-2">
        <PreviewHero
          icon="🚀"
          title={t("comingSoon.performance.title")}
          body={t("comingSoon.performance.body")}
          order={0}
        />

        <RoadmapList title={t("comingSoon.roadmap")} items={items} order={1} />

        <PreviewNote
          title={t("comingSoon.performance.noteTitle")}
          bullets={bullets}
          order={13}
        />

        <LookingForwardButton onClick={onClose} order={14} />
      </div>
    </PreviewSheet>
  );
}
