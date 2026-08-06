/**
 * The home screen's tour, as data.
 *
 * Adding a step is one entry here plus a `useOnboardingTarget("<target>")` on
 * the element it points at — `OnboardingTour` needs no changes, and neither
 * does the page. Order in this array is the order the spotlight travels in.
 *
 *   target    — the id the element registered itself under
 *   placement — preferred side for the coach mark; flipped automatically when
 *               that side has no room
 *   padding   — breathing room between the element and the edge of the hole
 *   radius    — the hole's corner radius (9999 = a circle, for icon buttons)
 */
export const HOME_TOUR_STEPS = [
  {
    id: "search",
    target: "nav-search",
    placement: "top",
    padding: 8,
    radius: 9999,
  },
  {
    id: "leaderboard",
    target: "nav-leaderboard",
    placement: "top",
    padding: 8,
    radius: 9999,
  },
  {
    id: "info",
    target: "nav-info",
    placement: "top",
    padding: 8,
    radius: 9999,
  },
  {
    id: "posts",
    target: "nav-x",
    placement: "top",
    padding: 8,
    radius: 9999,
  },
  {
    // Live News lives in the app bar rather than the bottom row, so this is
    // the one step whose bubble hangs below its target.
    id: "news",
    target: "nav-news",
    placement: "bottom",
    padding: 8,
    radius: 9999,
  },
  {
    id: "highlights",
    target: "todays-highlights",
    placement: "top",
    padding: 12,
    radius: 26,
  },
];
