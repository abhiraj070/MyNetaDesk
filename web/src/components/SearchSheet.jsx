"use client";

import { useState } from "react";

import { BottomSheet } from "./BottomSheet";
import { CmCombobox } from "./CmCombobox";
import { MinistryCombobox } from "./MinistryCombobox";
import { PillTabs } from "./Leaderboard";
import { useChiefMinisters } from "@/hooks/useChiefMinisters";
import { useMinistries } from "@/hooks/useMinistries";
import { toFriendlyError } from "@/lib/api";

const TIERS = [
  { value: "cm", label: "Chief Ministers" },
  { value: "minister", label: "Union Ministers" },
];

/**
 * The Search bottom sheet — a Chief Ministers / Ministers tier switcher over
 * the same picker pattern, in a modal so the main screen stays focused on
 * the current representative.
 *
 * `defaultTier` opens on whichever tier the current representative belongs
 * to. `selectedCm`/`selectedMinistry` highlight that pick in its own
 * combobox; `onSelectCm`/`onSelectMinister` fire (and close the sheet) when
 * a result is chosen.
 */
export function SearchSheet({
  open,
  onClose,
  defaultTier = "cm",
  selectedCm,
  selectedMinistry,
  onSelectCm,
  onSelectMinister,
}) {
  const [tier, setTier] = useState(defaultTier);

  const { cms, isPending: cmsPending, isError: cmsError, error: cmsErrorObj } =
    useChiefMinisters();
  const {
    entries,
    ministryCount,
    isPending: ministriesPending,
    isError: ministriesError,
    error: ministriesErrorObj,
  } = useMinistries();

  const isCm = tier === "cm";
  const isPending = isCm ? cmsPending : ministriesPending;
  const isError = isCm ? cmsError : ministriesError;
  const error = isCm ? cmsErrorObj : ministriesErrorObj;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Search"
      size="tall"
      autoFocus
      subtitle={
        isCm
          ? `All ${cms.length || 31} states of India`
          : ministryCount
            ? `Any of ${ministryCount} ministries in the union council`
            : "India's Union Ministers"
      }
    >
      <div className="mb-4 flex justify-center">
        <PillTabs
          options={TIERS}
          value={tier}
          onChange={setTier}
          ariaLabel="Search tier"
        />
      </div>

      {isPending && (
        <div className="rounded-control border border-rule px-4 py-3 text-sm text-muted">
          {isCm ? "Loading the states…" : "Loading the council…"}
        </div>
      )}

      {isError && (
        <div
          role="alert"
          className="rounded-control border border-rule px-4 py-3 text-sm text-slap"
        >
          {toFriendlyError(error)}
        </div>
      )}

      {!isPending && !isError && isCm && (
        <CmCombobox
          cms={cms}
          selected={selectedCm}
          onSelect={(cm) => {
            onSelectCm(cm);
            onClose();
          }}
          onClear={() => onSelectCm(null)}
        />
      )}

      {!isPending && !isError && !isCm && (
        <MinistryCombobox
          entries={entries}
          selected={selectedMinistry}
          onSelect={(entry) => {
            onSelectMinister(entry);
            onClose();
          }}
          onClear={() => onSelectMinister(null)}
        />
      )}

      <p className="mt-6 text-xs text-muted">
        {isCm
          ? "Pick a state to swap the card to that Chief Minister. Your CM stays a tap away."
          : "Pick a ministry to swap the card to that Union Minister. Your CM stays a tap away."}
      </p>
    </BottomSheet>
  );
}
