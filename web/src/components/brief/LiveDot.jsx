"use client";

/**
 * The recording light: a solid core with a halo breathing out of it.
 *
 * Shared by the masthead and by the badge on each photograph so the two pulse
 * on identical timing — two indicators drifting against each other is the
 * fastest way to make a page feel unresolved. The animation itself lives in
 * `globals.css` (`.live-core` / `.live-halo`) because a compositor-only CSS
 * loop cannot be interrupted by a hover claiming the same transform, and it
 * costs nothing while twenty cards are on screen.
 *
 * `tone` picks the two places it appears: `accent` is the red dot on a light
 * plate, `onAccent` the white dot inside the red badge. The halo is
 * `aria-hidden` and absolutely positioned, so it never enlarges the layout box
 * of whatever is carrying it.
 */
export function LiveDot({ tone = "accent" }) {
  const colour = tone === "onAccent" ? "bg-white" : "bg-brief-accent";

  return (
    <span aria-hidden className="relative flex size-[7px] shrink-0">
      <span
        className={`live-halo absolute inset-0 rounded-full ${colour}`}
      />
      <span className={`live-core relative size-[7px] rounded-full ${colour}`} />
    </span>
  );
}
