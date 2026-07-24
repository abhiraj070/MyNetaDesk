"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { SPRING_POP, SPRING_PRESS } from "@/lib/motion";

/**
 * The two verdict controls — the loudest thing on the page after the
 * representative themselves.
 *
 * Each is a solid colour disc with a chunky same-hue edge underneath it
 * (`0 Npx 0` rather than a blur) so it reads as a physical key sitting proud
 * of the page; pressing drives the disc down onto its edge instead of just
 * shrinking it. The running tally now lives *inside* the disc, on a
 * translucent chip below the glyph, so the button is one object rather than a
 * control with a caption.
 *
 * Once a side is picked it stays live; the opposite side dims and locks.
 * Both lock for the length of the send animation; that beat is announced by
 * the centred banner rather than inline.
 */
const OPTIONS = [
  {
    choice: "slap",
    emoji: "👋",
    label: "Slap",
    face: "bg-[linear-gradient(160deg,#ff7a5c_0%,#ff4e3a_58%,#ef3320_100%)]",
    edge: "#c22b19",
    auraRgb: "255 78 58",
  },
  {
    choice: "rose",
    emoji: "🌹",
    label: "Rose",
    face: "bg-[linear-gradient(160deg,#34d99b_0%,#12b981_58%,#0a9c69_100%)]",
    edge: "#0a7d55",
    auraRgb: "18 185 129",
  },
];

const EDGE_REST = 8;
const EDGE_PRESSED = 3;

export function VoteButtons({
  choice,
  slapCount = 0,
  roseCount = 0,
  onVote,
  isError,
  busy = false,
  buttonsRef,
}) {
  const counts = { slap: slapCount, rose: roseCount };

  return (
    <div>
      <div className="flex items-start justify-center gap-8 sm:gap-12">
        {OPTIONS.map((option) => {
          const isPicked = choice === option.choice;
          const isLockedOut = Boolean(choice) && !isPicked;
          const isDisabled = isLockedOut || busy;

          return (
            <VoteButton
              key={option.choice}
              option={option}
              count={counts[option.choice]}
              isPicked={isPicked}
              isLockedOut={isLockedOut}
              isDisabled={isDisabled}
              isBusy={busy}
              onVote={onVote}
              buttonsRef={buttonsRef}
            />
          );
        })}
      </div>

      <p
        className="mt-3 min-h-4 text-center text-xs font-semibold"
        aria-live="polite"
      >
        {isError ? (
          <span className="text-slap-strong">That didn&apos;t save. Try again.</span>
        ) : slapCount === 0 && roseCount === 0 && !choice ? (
          <span className="text-muted">No verdicts yet — be the first.</span>
        ) : null}
      </p>
    </div>
  );
}

/**
 * One disc, with its own ripple state — each tap spawns a short-lived ripple
 * that expands and fades, clipped to the disc by `overflow-hidden`. Kept local
 * to the button rather than lifted to `VoteButtons` since neither side needs
 * to know about the other's ripples.
 */
function VoteButton({
  option,
  count,
  isPicked,
  isLockedOut,
  isDisabled,
  isBusy,
  onVote,
  buttonsRef,
}) {
  const [ripples, setRipples] = useState([]);

  const handleClick = () => {
    setRipples((prev) => [...prev, Date.now() + Math.random()]);
    onVote(option.choice);
  };

  const edgeShadow = (depth) =>
    `0 ${depth}px 0 ${option.edge}, 0 ${depth + 6}px 18px -6px rgb(23 22 51 / 0.28)`;

  return (
    <div className="relative flex flex-col items-center">
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-[-10px] rounded-full blur-lg"
        style={{ backgroundColor: `rgb(${option.auraRgb})` }}
        animate={{ opacity: isPicked ? 0.3 : 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
      />

      <motion.button
        ref={(element) => {
          if (buttonsRef) buttonsRef.current[option.choice] = element;
        }}
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        aria-pressed={isPicked}
        aria-label={`${option.label} this representative`}
        initial={false}
        /*
         * Three resting states, all transform-only:
         *  - locked out (the side you didn't pick): shrinks back and drains of
         *    colour, so it reads as out of play rather than merely faded
         *  - busy (a verdict already in flight): eases down a hair, so a second
         *    tap visibly does nothing
         *  - idle: full size, sitting on its full edge
         */
        animate={{
          opacity: isLockedOut ? 0.4 : 1,
          scaleX: isLockedOut ? 0.9 : isBusy ? 0.97 : 1,
          scaleY: isLockedOut ? 0.9 : isBusy ? 0.97 : 1,
          filter: isLockedOut ? "grayscale(0.55)" : "grayscale(0)",
          y: 0,
          boxShadow: edgeShadow(isLockedOut ? EDGE_PRESSED : EDGE_REST),
        }}
        whileHover={
          isDisabled
            ? undefined
            : {
                y: -4,
                scaleX: 1.03,
                scaleY: 1.03,
                boxShadow: edgeShadow(EDGE_REST + 4),
                transition: SPRING_POP,
              }
        }
        /* The squish: the disc flattens as it drives down onto its edge, then
           springs back through a slight overshoot on release. */
        whileTap={
          isDisabled
            ? undefined
            : {
                y: EDGE_REST - EDGE_PRESSED,
                scaleX: 1.06,
                scaleY: 0.92,
                boxShadow: edgeShadow(EDGE_PRESSED),
                transition: SPRING_PRESS,
              }
        }
        transition={SPRING_POP}
        className={`relative flex size-28 flex-col items-center justify-center gap-1 overflow-hidden rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink disabled:cursor-not-allowed sm:size-32 ${option.face}`}
      >
        <AnimatePresence>
          {ripples.map((id) => (
            <motion.span
              key={id}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full bg-white/35"
              initial={{ scale: 0.3, opacity: 0.4 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
              onAnimationComplete={() =>
                setRipples((prev) => prev.filter((r) => r !== id))
              }
            />
          ))}
        </AnimatePresence>

        {/* Top-edge sheen: sells the disc as domed without a glossy highlight. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-linear-to-b from-white/25 to-transparent"
        />

        <span aria-hidden className="relative text-4xl leading-none sm:text-5xl">
          {option.emoji}
        </span>

        {/* The chip itself gives a single squash-and-pop on every tick, while
            the digits swap underneath it — so a rising tally reads as the
            counter reacting, not just text changing. `min-w` keeps its width
            stable so nothing beside it shifts. */}
        <motion.span
          key={`chip-${count}`}
          initial={{ scale: 0.82 }}
          animate={{ scale: 1 }}
          transition={SPRING_POP}
          className="relative flex min-w-11 items-center justify-center rounded-full bg-black/18 px-2 py-0.5"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={count}
              initial={{ opacity: 0, y: -10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              transition={SPRING_POP}
              className="font-display text-sm leading-none font-bold tabular-nums"
            >
              {Number(count).toLocaleString("en-IN")}
            </motion.span>
          </AnimatePresence>
        </motion.span>
      </motion.button>
    </div>
  );
}
