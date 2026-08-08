"use client";

import { useQuery } from "@tanstack/react-query";

import { useTranslation } from "@/lib/i18n";

import { fetchMpTimeline, fetchTimeline } from "@/lib/api";

/**
 * One politician's career timeline for the Political Journey tab.
 *
 * `enabled` keeps this off the page-load path: the Journey tab is only mounted
 * while it is the selected tab, so the request fires when the user opens it and
 * not before. Keyed by tier + name so switching politicians refetches rather
 * than showing the previous one's history.
 *
 * MPs come from their own table and their own endpoint, keyed on the MP's id
 * rather than on (name, subject_type, party) — but both normalise to the same
 * entry shape, so everything downstream of this hook is unaware of the split.
 */
export function useTimeline({ subject, enabled = true }) {
  // Part of the cache key: switching language must refetch, not reuse the
  // previous language's rows.
  const { language } = useTranslation();
  const isMp = subject?.tier === "mp";

  const query = useQuery({
    queryKey: isMp
      ? ["timeline", "mp", subject?.id]
      : ["timeline", language, subject?.tier, subject?.name],
    queryFn: () => (isMp ? fetchMpTimeline(subject.id) : fetchTimeline(subject)),
    // An MP is identified by id; everyone else by name.
    enabled: Boolean(enabled && (isMp ? subject?.id : subject?.name)),
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
