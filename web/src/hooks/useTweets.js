"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchTweets } from "@/lib/api";

/**
 * Recent X posts about one representative, fetched lazily.
 *
 * `enabled` defers the request until the discussion sheet is actually open, so
 * simply having a representative on screen never hits the X API. Keyed by the
 * subject's tier + name so switching representatives (or reopening the sheet
 * for a different one) fetches fresh rather than showing stale posts.
 */
export function useTweets({ tier, name, enabled }) {
  const query = useQuery({
    queryKey: ["tweets", tier, name],
    queryFn: () => fetchTweets({ tier, name }),
    enabled: Boolean(enabled && tier && name),
    staleTime: 60_000,
    retry: 1,
  });

  return {
    tweets: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
