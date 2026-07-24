/**
 * The app's motion vocabulary, in one place so every surface springs with the
 * same physics instead of each component inventing its own curve.
 *
 * Everything here animates transform and opacity only — no width, height, top
 * or margin — so the compositor does the work and nothing reflows mid-flight.
 * Reduced-motion is handled globally by `<MotionConfig reducedMotion="user">`
 * in `providers.jsx`; these values need no guard of their own.
 */

/** Snappy, near-critically damped: presses and releases. */
export const SPRING_PRESS = { type: "spring", stiffness: 700, damping: 30 };

/** A touch of overshoot: pops, badges, counter ticks. */
export const SPRING_POP = { type: "spring", stiffness: 520, damping: 20 };

/** Soft arrival with the barest overshoot: page and section entrances. */
export const SPRING_ENTRANCE = { type: "spring", stiffness: 340, damping: 26 };

/** No visible overshoot — the sheet is edge-anchored, so any bounce past 0
 *  would open a gap under it. */
export const SPRING_SHEET = { type: "spring", stiffness: 400, damping: 38 };

/**
 * Section entrance. Sections are staggered by passing increasing delays rather
 * than by variant inheritance, so a child that re-animates on its own key (the
 * representative card) keeps doing so without fighting a parent's orchestration.
 */
export function rise(delay = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { ...SPRING_ENTRANCE, delay },
  };
}

/*
 * The hero's idle drift deliberately lives in CSS (`.hero-float` in
 * globals.css), not here: a JS keyframe loop stops whenever a hover or a
 * verdict claims the same transform and does not reliably restart afterwards.
 */
