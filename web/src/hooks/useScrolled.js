"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the page has been scrolled past a few pixels.
 *
 * Read through `useSyncExternalStore` rather than a `useState` + effect pair,
 * the same way the language preference is (see `lib/i18n`): scroll position is
 * browser state, not React state. The practical win is that React compares the
 * boolean this returns and bails out when it hasn't changed — so a flick that
 * fires a hundred scroll events causes exactly one render, at the moment the
 * header actually changes appearance.
 *
 * `getServerSnapshot` returns false so the server and the hydrating client
 * both render the resting header; a mismatch here would throw away the tree on
 * first paint for a purely cosmetic difference.
 *
 * The threshold is deliberately not zero. iOS rubber-banding reports small
 * negative and positive offsets at rest, and a zero threshold makes the header
 * flicker between its two states while the page is sitting still.
 */
const THRESHOLD = 8;

function subscribe(onChange) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

const getSnapshot = () => window.scrollY > THRESHOLD;
const getServerSnapshot = () => false;

export function useScrolled() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
