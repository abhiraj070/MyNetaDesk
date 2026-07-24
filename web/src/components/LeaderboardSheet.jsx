"use client";

import { BottomSheet } from "./BottomSheet";
import { Leaderboard } from "./Leaderboard";
import { Badge, BADGES } from "./ui/Badge";

export function LeaderboardSheet({
  open,
  onClose,
  tier,
  currentIdentity,
  onSelectTopper,
  pendingKey,
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Leaderboard"
      subtitle="How they stack up nationally"
    >
      <div className="mb-4">
        <Badge {...BADGES.hallOfFame} size="sm" tilt />
      </div>

      <Leaderboard
        defaultTier={tier}
        highlightName={currentIdentity}
        onSelectTopper={onSelectTopper}
        pendingKey={pendingKey}
      />
    </BottomSheet>
  );
}
