/**
 * Share-URL builders that live outside `home.jsx` so leaf components (the
 * leaderboard, its share prompt) can import them without pulling in — and
 * cycling through — the whole `Home` module.
 */

/**
 * `?share=leaderboard&tier=` is what the homepage's `generateMetadata` reads to
 * serve the live top-3 preview card for a shared leaderboard link.
 */
export function leaderboardShareUrl(tier = "cm") {
  if (typeof window === "undefined") return "";
  const t = tier === "minister" ? "minister" : "cm";
  return `${window.location.origin}/?share=leaderboard&tier=${t}`;
}
