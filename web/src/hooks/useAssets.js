"use client";

import { useQuery } from "@tanstack/react-query";

import { useTranslation } from "@/lib/i18n";

import { fetchAssets } from "@/lib/api";

/**
 * Declared-wealth records for one politician, fetched lazily.
 *
 * `enabled` is the whole point here: `AssetBreakdownSheet` is always mounted
 * (as a sibling of the profile sheet, so it can position itself correctly), so
 * without this gate the request would fire on page load for every politician
 * on screen. Passing the sheet's `open` flag defers it to the moment the user
 * taps the Declared Assets card.
 */
export function useAssets({ subject, enabled = false }) {
  // Part of the cache key: switching language must refetch, not reuse the
  // previous language's rows.
  const { language } = useTranslation();
  const query = useQuery({
    queryKey: ["assets", language, subject?.tier, subject?.name],
    queryFn: () => fetchAssets(subject),
    enabled: Boolean(enabled && subject?.name),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const records = query.data ?? [];

  return {
    // Records arrive newest-first, so the latest declaration is the head.
    latest: records[0] ?? null,
    records,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
