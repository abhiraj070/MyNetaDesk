"use client";

import { useQuery } from "@tanstack/react-query";

import { useTranslation } from "@/lib/i18n";

import { fetchCms } from "@/lib/api";

/**
 * The full roster of 31 Chief Ministers -- much simpler than `useMinistries`
 * since there's no portfolio splitting to do; the raw rows are already
 * exactly what the picker needs.
 */
export function useChiefMinisters() {
  // Part of the cache key: switching language must refetch, not reuse the
  // previous language's rows.
  const { language } = useTranslation();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["chief-ministers", language],
    queryFn: fetchCms,
    staleTime: 5 * 60_000,
  });

  return { cms: data ?? [], isPending, isError, error };
}
