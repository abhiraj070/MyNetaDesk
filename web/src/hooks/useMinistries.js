"use client";

import { useQuery } from "@tanstack/react-query";

import { useTranslation } from "@/lib/i18n";
import { useMemo } from "react";

import { fetchMinisters } from "@/lib/api";
import { buildMinistryEntries } from "@/lib/ministries";

/**
 * The council of ministers, parsed into searchable ministry entries.
 *
 * Called from both the section switcher (which previews the ministry count)
 * and the section itself. React Query dedupes on the key, so the roster is
 * still fetched exactly once.
 */
export function useMinistries() {
  // Part of the cache key: switching language must refetch, not reuse the
  // previous language's rows.
  const { language } = useTranslation();
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["ministers", language],
    queryFn: fetchMinisters,
    staleTime: 5 * 60_000,
  });

  const entries = useMemo(() => buildMinistryEntries(data), [data]);

  const ministryCount = useMemo(
    () => new Set(entries.map((entry) => entry.label)).size,
    [entries],
  );

  return { entries, ministryCount, isPending, isError, error };
}
