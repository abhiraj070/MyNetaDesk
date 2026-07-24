"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchLeaderboard } from "@/lib/api";

const PAGE_SIZE = 10;

/**
 * Lazily (and incrementally) fetches ONE board (slap or rose) for one tier.
 *
 * The endpoint returns both the slap and rose toppers together for a given
 * `limit`/`offset`, but each of the four leaderboards (MP-slap, MP-rose,
 * Minister-slap, Minister-rose) paginates independently — `queryKey` is
 * keyed by `(tier, board)`, so "load more" on one never affects the others.
 *
 * `enabled` lets the caller defer the fetch until this specific board is
 * actually the one on screen.
 *
 * No `staleTime`: standings change every time anyone votes, from any
 * session, so cached data is never a safe stand-in for a fresh read. The
 * leaderboard sheet fully unmounts on close (`BottomSheet` conditionally
 * renders its children), so every open is a fresh mount — leaving this at
 * the default (data considered stale immediately) is what makes every open
 * refetch. `useVote`'s `onSuccess` also invalidates this query key directly,
 * so a vote is reflected the moment the sheet is next opened even if the
 * fetch that's about to run were somehow still in its window.
 */
export function useLeaderboard(tier, board, enabled) {
  const query = useInfiniteQuery({
    queryKey: ["leaderboard", tier, board],
    queryFn: ({ pageParam }) =>
      fetchLeaderboard(tier, { limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const list = board === "slap" ? lastPage.slapToppers : lastPage.roseToppers;
      // Fewer rows than asked for means this board has nothing left to load.
      return list.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined;
    },
    enabled,
    refetchOnMount: "always",
  });

  const pages = query.data?.pages ?? [];
  const toppers = pages.flatMap((page) =>
    board === "slap" ? page.slapToppers : page.roseToppers,
  );

  return { ...query, toppers };
}
