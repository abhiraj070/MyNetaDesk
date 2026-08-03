"use client";

import { useQuery } from "@tanstack/react-query";

import { useTranslation } from "@/lib/i18n";

import { fetchHighlights } from "@/lib/api";

/**
 * Today's three highlight slots.
 *
 * One query covers all three endpoints: they render as a single row and are
 * read together, so a shared pending state avoids three tiles popping in at
 * different moments. Per-endpoint failures survive inside the payload instead
 * of failing the query — see `fetchHighlights`.
 *
 * `useVote` invalidates this key once a verdict lands, so the tiles follow
 * your own votes without polling.
 */
export function useHighlights() {
  // Part of the cache key: switching language must refetch, not reuse the
  // previous language's rows.
  const { language } = useTranslation();
  const query = useQuery({
    queryKey: ["highlights", language],
    queryFn: fetchHighlights,
    staleTime: 60_000,
  });

  return {
    slots: query.data ?? null,
    isPending: query.isPending,
    // True only when the request could not be made at all; a single endpoint
    // failing is reported per slot rather than here.
    isError: query.isError,
  };
}
