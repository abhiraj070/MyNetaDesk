"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { castCmVote, castMinistryVote } from "@/lib/api";

/**
 * Records verdicts for one subject. Both sides stay open: you can slap, then
 * rose, then slap again, and every click is its own PATCH. Nothing here locks
 * a side out — the earlier "pick a side and commit to it" rule is gone.
 *
 * `choice` is therefore just the side you hit *last*, kept for the picked-side
 * glow and for the share copy; it no longer gates anything.
 *
 * `casts` counts this session's increments per side, so each tally reads
 * `baseline + casts[side]`. It resets on reload, which is correct — the count
 * the API returns already includes everything recorded earlier.
 *
 * `tier` is "cm" | "minister"; each goes to its own endpoint.
 */
const NO_CASTS = { slap: 0, rose: 0 };

export function useVote(tier, subject) {
  const isMinister = tier === "minister";
  const queryClient = useQueryClient();

  const [choice, setChoice] = useState(null);
  const [casts, setCasts] = useState(NO_CASTS);
  const [isError, setIsError] = useState(false);

  // The server tallies as they stood when this session's first verdict was
  // cast. Every local increment is measured from here rather than from
  // whatever the query currently holds — see `slaps`/`roses` below.
  const [baseline, setBaseline] = useState(null);

  // Mirrors `casts` outside of state so a failure can roll back without
  // reading state inside an updater.
  const countRef = useRef(NO_CASTS);

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
    // remounts (resetting `casts`) whenever the subject changes and changes
    // back — e.g. search someone else, then hit "Back" — and without this, the
    // count displayed after that round trip would silently fall back to
    // whatever `cm-location` fetched on the very first page load,
    // undercounting every vote cast since then even though the server has
    // the right total.
    //
    // `highlights` too: a verdict feeds the same `_today` counters those three
    // endpoints rank on, so the tiles would otherwise sit a minute behind the
    // vote the user just cast.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["cm-location"] });
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
    },
  });

  const vote = useCallback(
    (next) => {
      if (!subject) return;

      countRef.current = {
        ...countRef.current,
        [next]: countRef.current[next] + 1,
      };
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
          countRef.current = {
            ...countRef.current,
            [next]: Math.max(0, countRef.current[next] - 1),
          };
          setCasts(countRef.current);
          setIsError(true);
        },
      });
    },
    [isMinister, mutate, subject, serverSlaps, serverRoses],
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
    baseline ? baseline.slap + casts.slap : 0,
  );
  const roses = Math.max(
    serverRoses,
    baseline ? baseline.rose + casts.rose : 0,
  );

  return { choice, slaps, roses, vote, isPending, isError };
}
