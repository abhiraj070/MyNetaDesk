"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * The reader's resolved coordinates, held for the lifetime of the tab.
 *
 * This lives in a provider mounted by the root layout rather than in the page
 * that uses it, because a page is unmounted the moment the router leaves it:
 * `/` -> `/brief` -> back threw the coordinates away and dropped the reader
 * back onto the landing screen, having to ask for location all over again.
 * Layouts survive navigation, so state parked here survives with them.
 *
 * Deliberately in memory only — no `localStorage`, no `sessionStorage`. The
 * landing screen promises the reader that their location is read once and
 * never stored, and writing the coordinates to disk would quietly break that
 * promise to save a permission prompt on a hard reload.
 */
const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  // `null` means "not located yet", which is what the landing screen keys off.
  const [coords, setCoords] = useState(null);

  const value = useMemo(() => ({ coords, setCoords }), [coords]);

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export function useLocationState() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocationState must be used inside <LocationProvider>");
  }
  return context;
}
