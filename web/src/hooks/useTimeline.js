"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchTimeline } from "@/lib/api";

/**
 * One politician's career timeline for the Political Journey tab.
 *
 * `enabled` keeps this off the page-load path: the Journey tab is only mounted
 * while it is the selected tab, so the request fires when the user opens it and
 * not before. Keyed by tier + name so switching politicians refetches rather
 * than showing the previous one's history.
 */
export function useTimeline({ subject, enabled = true }) {
  const query = useQuery({
    queryKey: ["timeline", subject?.tier, subject?.name],
    queryFn: () => fetchTimeline(subject),
    enabled: Boolean(enabled && subject?.name),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return {
    entries: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
