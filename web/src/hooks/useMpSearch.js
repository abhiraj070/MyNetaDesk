"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { searchMps } from "@/lib/api";

/** How long the typing has to pause before a request goes out. */
const DEBOUNCE_MS = 250;
/** Below this, the result set is too broad to be worth a round trip. */
const MIN_QUERY = 2;

/**
 * Server-side MP search for the Search sheet.
 *
 * Unlike the CM and ministry pickers — which hold their whole list in memory
 * and filter it locally — there are 543 MPs and the full list is ~190KB, so
 * this asks the server per query instead. That means the two things a
 * network-backed search has to get right:
 *
 *   Not firing on every keystroke — the query is debounced, so a request goes
 *   out once the typing pauses rather than once per letter.
 *
 *   Never showing a stale answer — React Query keys the cache by the search
 *   term, so a slow response for "sha" can't overwrite the results for
 *   "sharma"; it resolves into its own cache entry and is ignored.
 *
 * An empty or one-letter query is not a request at all: the hook reports an
 * idle state and the picker shows its prompt.
 */
export function useMpSearch(query) {
  const term = String(query ?? "").trim();
  const [debounced, setDebounced] = useState(term);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  const isSearchable = debounced.length >= MIN_QUERY;

  const query_ = useQuery({
    queryKey: ["mp-search", debounced],
    queryFn: () => searchMps(debounced),
    enabled: isSearchable,
    // Names don't change between keystrokes; re-typing a term the user just
    // backspaced past should come straight from cache.
    staleTime: 5 * 60_000,
  });

  return {
    results: isSearchable ? (query_.data ?? []) : [],
    // True while the debounce is still pending too, so the picker doesn't
    // flash "no results" in the gap between the last keystroke and the fetch.
    isSearching:
      isSearchable && (query_.isPending || query_.isFetching || debounced !== term),
    isError: query_.isError,
    error: query_.error,
    isIdle: !isSearchable,
    minQuery: MIN_QUERY,
  };
}
