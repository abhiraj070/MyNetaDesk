"use client";

import { useState } from "react";

import { BottomSheet } from "../BottomSheet";
import { useTranslation } from "@/lib/i18n";
import { PillTabs } from "../Leaderboard";
import { AssetBreakdownSheet } from "./AssetBreakdownSheet";
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
        <div className="sticky top-0 z-10 -mx-6 mb-5 bg-surface px-6 pt-1 pb-3">
          <PillTabs
            options={TABS.map((entry) => ({ ...entry, label: t(entry.key) }))}
            value={tab}
            onChange={setTab}
            ariaLabel={t("profile.sectionAria")}
          />
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
      </BottomSheet>

      <AssetBreakdownSheet
        open={assetsOpen}
        onClose={() => setAssetsOpen(false)}
        subject={subject}
      />
    </>
  );
}
