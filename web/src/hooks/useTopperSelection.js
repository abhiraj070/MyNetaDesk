"use client";

import { useCallback, useState } from "react";

import { fetchCmByStateKey, fetchMinisterByName, fetchMpByName } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { rankOf } from "@/lib/ministries";
import { buildMpSubject, useSubjectSelection } from "@/lib/subject";

/**
 * "Open this person" — the one code path behind a leaderboard row and a
 * Today's Highlights tile.
 *
 * Lifted out of `home.jsx` when Today's Highlights moved to the game route:
 * both pages need the same lookup, and a second copy is how two surfaces end
 * up disagreeing about what tapping a name does.
 *
 * Only one lookup runs at a time; a second tap while one is in flight is a
 * no-op rather than racing two fetches. `pendingKey` is the row currently being
 * fetched, in the `tier:name` form both lists already key their spinners on.
 */
export function useTopperSelection({ onSelected, onError } = {}) {
  const { t } = useTranslation();
  const { setLeaderboardSubject } = useSubjectSelection();
  const [pendingKey, setPendingKey] = useState(null);

  const selectTopper = useCallback(
    async (tier, topper) => {
      if (pendingKey) return;

      const toppedName = tier === "minister" ? topper.minister_name : topper.name;
      const key = `${tier}:${toppedName}`;
      setPendingKey(key);

      try {
        if (tier === "cm") {
          const details = await fetchCmByStateKey(topper.state_key);
          if (!details) throw new Error("CM not found");
          setLeaderboardSubject({ tier: "cm", ...details, isHome: false });
        } else if (tier === "mp") {
          // The row already carries everything the MP endpoint returns, but it
          // is re-fetched for the same reason a CM row is: the list is a
          // ranking snapshot, and the profile should open on the record as it
          // stands now — plus the row carries no manifesto `points`.
          const details = await fetchMpByName({
            name: topper.name,
            constituencyKey: topper.constituency_key,
          });
          if (!details) throw new Error("MP not found");
          setLeaderboardSubject(buildMpSubject(details, { isHome: false, t }));
        } else {
          const details = await fetchMinisterByName({
            name: topper.minister_name,
            ministry: topper.ministry,
          });
          if (!details) throw new Error("Union Minister not found");
          const firstFragment = String(details.ministry ?? "")
            .split(";")[0]
            .trim();
          setLeaderboardSubject({
            tier: "minister",
            name: details.minister_name,
            minister_name: details.minister_name,
            party: details.party,
            photo_url: details.photo_url,
            slap_count: details.slap_count,
            rose_count: details.rose_count,
            points: details.manifesto_points,
            manifesto_points: details.manifesto_points,
            ministry: details.ministry,
            portfolio: firstFragment,
            rank_title: rankOf(firstFragment),
            designation: firstFragment,
          });
        }
        onSelected?.();
      } catch {
        onError?.();
      } finally {
        setPendingKey(null);
      }
    },
    [pendingKey, setLeaderboardSubject, t, onSelected, onError],
  );

  return { selectTopper, pendingKey };
}
