"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { BottomSheet } from "../BottomSheet";
import { useTranslation } from "@/lib/i18n";
import { useOnboarding } from "@/lib/onboarding";
import { PillTabs } from "../Leaderboard";
import { AssetBreakdownSheet } from "./AssetBreakdownSheet";
import { PerformancePreviewSheet } from "./PerformancePreviewSheet";
import { ProfileOverviewTab } from "./ProfileOverviewTab";
import { ProfileJourneyTab } from "./ProfileJourneyTab";
import { ProfileManifestosTab } from "./ProfileManifestosTab";

// No emoji here (unlike `PillTabs`'s other uses in Leaderboard.jsx): with
// "Political Journey" already the longest label PillTabs has ever carried,
// an icon on all three would push the row wider than a phone screen.
// Keys, not labels — resolved per render so switching language relabels the
// tabs without remounting the sheet.
const TABS = [
  { value: "overview", key: "profile.overview" },
  { value: "manifestos", key: "profile.manifestos" },
  { value: "journey", key: "profile.journey" },
  // Locked: pressing it opens a preview of what Performance will hold rather
  // than switching to an empty section. It stays in the row (rather than
  // waiting until launch) because seeing it is the point — the reader learns
  // the feature exists and is being built.
  { value: "performance", key: "profile.performance", locked: true },
];

/**
 * The Politician Profile bottom sheet — opened from the ⓘ button. Three
 * tabs, all scoped to one `subject`: a fast Overview, the existing
 * Manifestos list (unchanged), and a Political Journey timeline.
 *
 * Occupies most of the viewport (`size="tall"` → ~85-88vh) rather than the
 * shorter `InfoSheet` it replaces, since three tabs' worth of content needs
 * the room. Resets to the Overview tab and clears any expanded cards every
 * time it's reopened or the subject changes, so switching from one
 * politician to another (or closing and reopening) never leaves a stray tab
 * or expanded card from someone else's profile.
 *
 * `AssetBreakdownSheet` is rendered here as a sibling of the main sheet, not
 * nested inside it — `BottomSheet` is `position: fixed`, and framer-motion
 * leaves a `transform` on this sheet's own content wrapper at rest, which
 * would otherwise turn it into the containing block for a `fixed`
 * descendant and mis-position the breakdown sheet entirely.
 */
export function PoliticianProfileSheet({ open, onClose, subject }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("overview");
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);

  // The locked tab is a door to a preview, not a section: pressing it leaves
  // the current tab exactly where it was.
  const handleTabChange = (next) => {
    if (next === "performance") {
      setPerformanceOpen(true);
      return;
    }
    setTab(next);
  };

  // Resets to Overview (and closes the assets sheet) on every open — and if
  // the subject changes while already open — via the React-endorsed "adjust
  // state during render" pattern rather than an effect, so there's no extra
  // render before it applies. `openKey` is `null` while closed, so reopening
  // the same subject still counts as a change.
  const openKey = open && subject ? `${subject.tier}:${subject.name}` : null;
  const [prevOpenKey, setPrevOpenKey] = useState(openKey);
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (openKey !== null) {
      setTab("overview");
      setAssetsOpen(false);
      setPerformanceOpen(false);
    }
  }

  if (!subject) return null;

  const role =
    subject.tier === "minister"
      ? subject.rank_title || subject.designation || "Union Minister"
      : subject.designation || "Chief Minister";

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title={subject.name} subtitle={role} size="tall">
        {/* Four tabs no longer fit across a 375px phone, so the row scrolls
            sideways inside the sticky strip rather than wrapping to two lines
            or squeezing the labels. The negative margin lets it scroll edge to
            edge while the padding keeps the first pill aligned with the
            content; `no-scrollbar` hides the bar the row would otherwise
            introduce on desktop. */}
        <div className="sticky top-0 z-10 -mx-6 mb-5 bg-surface pt-1 pb-3">
          <div className="no-scrollbar overflow-x-auto px-6">
            <PillTabs
              options={TABS.map((entry) => ({ ...entry, label: t(entry.key) }))}
              value={tab}
              onChange={handleTabChange}
              ariaLabel={t("profile.sectionAria")}
            />
          </div>
        </div>

        {tab === "overview" && (
          <ProfileOverviewTab
            subject={subject}
            onOpenAssets={() => setAssetsOpen(true)}
          />
        )}
        {tab === "manifestos" && <ProfileManifestosTab subject={subject} />}
        {tab === "journey" && (
          <ProfileJourneyTab
            subject={subject}
            onOpenAssets={() => setAssetsOpen(true)}
          />
        )}

        <ReplayTutorialRow onClose={onClose} />
      </BottomSheet>

      <AssetBreakdownSheet
        open={assetsOpen}
        onClose={() => setAssetsOpen(false)}
        subject={subject}
      />

      {/* A sibling for the same reason the breakdown sheet is one: this sheet's
          content wrapper keeps a transform at rest, which would otherwise make
          it the containing block for a `fixed` descendant. */}
      <PerformancePreviewSheet
        open={performanceOpen}
        onClose={() => setPerformanceOpen(false)}
      />
    </>
  );
}

/**
 * The way back into the first-run tutorial, below the tab content so it is the
 * last thing in the sheet on every tab rather than an item competing with the
 * profile itself.
 *
 * Closing first and starting after a beat is deliberate: the tour dims the
 * whole screen, and starting it while the sheet is still sliding out would
 * spotlight a nav bar with a panel sliding across it. The delay is the sheet's
 * own exit (220ms) plus a frame.
 */
function ReplayTutorialRow({ onClose }) {
  const { t } = useTranslation();
  const { startTour } = useOnboarding();

  return (
    <div className="mt-8 border-t border-rule pt-4">
      <button
        type="button"
        onClick={() => {
          onClose();
          setTimeout(startTour, 260);
        }}
        className="flex w-full items-center gap-3 rounded-control bg-surface-2 px-4 py-3 text-left ring-1 ring-ink/5 transition-colors hover:bg-brand-wash/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-wash text-brand-strong">
          <Sparkles className="size-4" strokeWidth={2.25} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-bold text-ink">
            {t("onboarding.replay")}
          </span>
          <span className="block text-xs font-medium text-muted">
            {t("onboarding.replayHint")}
          </span>
        </span>
      </button>
    </div>
  );
}
