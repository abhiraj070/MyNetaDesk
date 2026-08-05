"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchNews } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

/**
 * Today's political brief.
 *
 * Keyed by language because the two feeds are separate caches on the server —
 * without the language in the key, switching to Hindi would show the English
 * stories until the cache expired. The feed itself only refreshes every few
 * hours upstream, so a long `staleTime` keeps re-entering the page instant.
 */
export function useNews() {
  const { language } = useTranslation();

  const query = useQuery({
    queryKey: ["news", language],
    queryFn: fetchNews,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return {
    stories: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
