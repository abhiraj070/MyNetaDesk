"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchCms } from "@/lib/api";

/**
 * The full roster of 31 Chief Ministers -- much simpler than `useMinistries`
 * since there's no portfolio splitting to do; the raw rows are already
 * exactly what the picker needs.
 */
export function useChiefMinisters() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["chief-ministers"],
    queryFn: fetchCms,
    staleTime: 5 * 60_000,
  });

  return { cms: data ?? [], isPending, isError, error };
}
