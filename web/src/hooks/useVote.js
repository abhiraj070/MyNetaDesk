"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { castCmVote, castMinistryVote } from "@/lib/api";

/**
 * Picks a side for one subject, then lets you keep hitting it.
 *
 * The chosen side stays live and can be clicked repeatedly — each click is its
 * own PATCH. The opposite side locks only for as long as the card is mounted:
 * nothing is persisted, so a reload hands both buttons back.
 *
 * `casts` counts this session's increments so the tally reads `base + casts`.
 * It resets on reload, which is correct — the count the API returns already
 * includes everything recorded earlier.
 *
 * `tier` is "cm" | "minister"; each goes to its own endpoint.
 */
export function useVote(tier, subject) {
  const isMinister = tier === "minister";
  const queryClient = useQueryClient();

  const [choice, setChoice] = useState(null);
  const [casts, setCasts] = useState(0);
  const [isError, setIsError] = useState(false);

  // The server tallies as they stood when this session's first verdict was
  // cast. Every local increment is measured from here rather than from
  // whatever the query currently holds — see `slaps`/`roses` below.
  const [baseline, setBaseline] = useState(null);

  // Mirrors `casts` outside of state so a failure can roll back without
  // reading state inside an updater.
  const countRef = useRef(0);

  const serverSlaps = subject?.slap_count ?? 0;
  const serverRoses = subject?.rose_count ?? 0;

  const { mutate, isPending } = useMutation({
    mutationFn: isMinister ? castMinistryVote : castCmVote,
    // A vote changes standings — invalidate every leaderboard query (all
    // tiers/boards share the `["leaderboard", ...]` prefix) so a currently
    // mounted board refetches immediately, and any not currently mounted is
    // marked stale for the moment it's next opened. Belt-and-suspenders
    // alongside `useLeaderboard`'s `refetchOnMount: "always"` — that alone
    // covers "reopen the sheet," this covers "sheet already open elsewhere."
    //
    // Also invalidate the home CM's own location query: `RepresentativeCard`
    // remounts (resetting `casts` to 0) whenever the subject changes and
    // changes back — e.g. search someone else, then hit "Back" — and without
    // this, the count displayed after that round trip would silently fall
    // back to whatever `cm-location` fetched on the very first page load,
    // undercounting every vote cast since then even though the server has
    // the right total.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["cm-location"] });
    },
  });

  const vote = useCallback(
    (next) => {
      if (!subject) return;
      // You can hit your own side as often as you like, but never cross over.
      if (choice && next !== choice) return;

      countRef.current += 1;
      setChoice(next);
      setCasts(countRef.current);
      setIsError(false);
      setBaseline(
        (previous) => previous ?? { slap: serverSlaps, rose: serverRoses },
      );

      const payload = isMinister
        ? {
            name: subject.minister_name,
            ministryName: subject.ministry,
            choice: next,
          }
        : {
            name: subject.name,
            stateKey: subject.state_key,
            choice: next,
          };

      mutate(payload, {
        onError: () => {
          countRef.current = Math.max(0, countRef.current - 1);
          setCasts(countRef.current);
          setIsError(true);
          // Hand the other side back only if nothing landed at all.
          if (countRef.current === 0) setChoice(null);
        },
      });
    },
    [choice, isMinister, mutate, subject, serverSlaps, serverRoses],
  );

  /**
   * The displayed tallies.
   *
   * `max(server, baseline + casts)` rather than `server + casts`: the success
   * handler above invalidates `cm-location`, so for the home CM the refetched
   * `slap_count` already contains the vote that `casts` is also counting —
   * adding them showed one more than the server actually held (ministers were
   * unaffected, since nothing invalidates their query). Taking the larger of
   * the two keeps the optimistic number up while the request is in flight,
   * absorbs it the moment the server catches up, and still moves if someone
   * else's votes push the server total past ours — with no dip in between.
   */
  const slaps = Math.max(
    serverSlaps,
    baseline && choice === "slap" ? baseline.slap + casts : 0,
  );
  const roses = Math.max(
    serverRoses,
    baseline && choice === "rose" ? baseline.rose + casts : 0,
  );

  return { choice, slaps, roses, vote, isPending, isError };
}
