"use client";

import { BottomSheet } from "../BottomSheet";
import { ProfileIdentityCard } from "./ProfileIdentityCard";
import { ProfilePanel } from "./ProfilePanel";

/**
 * The information experience as a bottom sheet.
 *
 * This was how information was reached before it became the main page — the ⓘ
 * button in the bottom bar opened it over the game. Kept, rather than deleted
 * with that button, because it is now a thin wrapper: `BottomSheet` for the
 * chrome and `ProfilePanel` for the content, both of which are live code used
 * elsewhere. Anything that wants a politician's information in a sheet (a
 * comparison view, a leaderboard peek) has it for one import.
 *
 * The identity card is rendered here too, so the sheet shows the same thing in
 * the same order as the page: portrait and name, then the tabs.
 */
export function PoliticianProfileSheet({ open, onClose, subject }) {
  if (!subject) return null;

  const role =
    subject.tier === "minister"
      ? subject.rank_title || subject.designation || "Union Minister"
      : subject.designation || "Chief Minister";

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={subject.name}
      subtitle={role}
      size="tall"
    >
      <div className="mb-5">
        <ProfileIdentityCard subject={subject} />
      </div>

      <ProfilePanel subject={subject} stickyTabs />
    </BottomSheet>
  );
}
