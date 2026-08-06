"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { useTranslation } from "@/lib/i18n";
import { SPRING_POP } from "@/lib/motion";
import { useOnboarding } from "@/lib/onboarding";

/**
 * The coach-mark tour: one dim layer with a hole punched in it, and a small
 * anchored bubble that walks from element to element.
 *
 * The dim and the hole are the same element — a rounded box carrying a
 * `0 0 0 9999px` shadow, so everything outside it is covered and the target
 * shows through at full brightness with no z-index games and nothing painted
 * on top of the real UI. Moving the spotlight is then a single box animating
 * its own rect, which is what lets the light glide between steps instead of
 * cross-fading.
 *
 * Everything under the overlay is inert: the root swallows pointer events, so
 * the politician card stays visible but untouchable and a step can only be
 * advanced by its own button.
 */

const OVERLAY_TINT = "rgb(23 22 51 / 0.78)";
const SPOT_RING = "rgb(14 165 233 / 0.55)";

const BUBBLE_MAX_WIDTH = 320;
/** Viewport margin the bubble never crosses. */
const EDGE = 16;
/** Distance from the edge of the spotlight to the tip of the arrow. */
const GAP = 16;
/** Half the rotated square that forms the arrow. */
const ARROW = 7;
/** How long a target must hold still before measuring stops. */
const STABLE_FRAMES = 24;

/** Keys that would otherwise scroll the frozen page under the overlay. */
const SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function OnboardingTour({ steps }) {
  const { t } = useTranslation();
  const { isTourOpen, endTour, getTarget } = useOnboarding();
  const reduceMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [frame, setFrame] = useState(null);
  const [bubbleHeight, setBubbleHeight] = useState(160);

  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);
  // A guarded callback ref rather than the ref object itself: an exiting coach
  // mark and its replacement are briefly mounted together, and React nulls a
  // shared ref object when the *older* one finally unmounts — which would
  // otherwise blank the pointer to the panel that is actually on screen.
  const setPanel = useCallback((node) => {
    if (node) panelRef.current = node;
  }, []);
  const labelId = useId();
  const descriptionId = useId();

  // `index === steps.length` is the finale card rather than a step.
  const step = index < steps.length ? steps[index] : null;
  const isFinale = step === null;

  // Every open starts from the top, including a replay from the Info sheet.
  // The measured box is dropped along with the index: it still holds the last
  // target of the previous run, and keeping it would open the replay with the
  // light on Today's Highlights for a frame before it slid up to Search.
  const [wasOpen, setWasOpen] = useState(isTourOpen);
  if (isTourOpen !== wasOpen) {
    setWasOpen(isTourOpen);
    if (isTourOpen) {
      setIndex(0);
      setFrame(null);
    }
  }

  const advance = useCallback(() => setIndex((current) => current + 1), []);

  /*
   * Position tracking.
   *
   * Frame-by-frame while anything is moving, then nothing at all. A step
   * begins with a burst of measurements — the target may still be arriving on
   * its entrance spring, a smooth scroll may be under way, a web font may not
   * have landed — and the burst ends once the box has held still for
   * `STABLE_FRAMES`. Scrolling, resizing and any layout change restart it.
   *
   * The alternative (a listener-only approach) misses all of the above; a
   * permanent loop would keep the page awake for the whole tour to watch
   * something that stops moving after a third of a second.
   */
  useEffect(() => {
    if (!isTourOpen || !step) return;

    let raf = 0;
    let stableFrames = 0;
    let last = null;

    const measure = () => {
      raf = 0;
      const element = getTarget(step.target);
      const next = element
        ? {
            rect: inflate(element.getBoundingClientRect(), step.padding ?? 8),
            vw: window.innerWidth,
            vh: window.innerHeight,
          }
        : null;

      if (sameFrame(last, next)) {
        stableFrames += 1;
      } else {
        stableFrames = 0;
        last = next;
        setFrame(next);
      }
      if (stableFrames < STABLE_FRAMES) raf = requestAnimationFrame(measure);
    };

    const restart = () => {
      stableFrames = 0;
      if (!raf) raf = requestAnimationFrame(measure);
    };

    restart();
    // `true` for scroll: a scroll inside any container counts, not just the
    // document's own.
    window.addEventListener("scroll", restart, { passive: true, capture: true });
    window.addEventListener("resize", restart, { passive: true });
    const observer = new ResizeObserver(restart);
    observer.observe(document.documentElement);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", restart, { capture: true });
      window.removeEventListener("resize", restart);
      observer.disconnect();
    };
  }, [isTourOpen, step, getTarget]);

  // Bring a target that is off-screen (Today's Highlights, on a short phone)
  // into view before the light lands on it.
  //
  // Pinned targets are left alone: the app bar and the action bar are already
  // on screen by definition, and scrolling to "reveal" one only drags the page
  // out from under a bar that hasn't moved — which is exactly the jolt the
  // brief's "background remains static" rules out.
  useEffect(() => {
    if (!isTourOpen || !step) return;
    const element = getTarget(step.target);
    if (!element || isPinned(element)) return;
    const rect = element.getBoundingClientRect();
    const clearance = 24;
    if (rect.top < clearance || rect.bottom > window.innerHeight - clearance) {
      element.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
    }
  }, [isTourOpen, step, getTarget, reduceMotion]);

  // A step whose element never appears (an experiment turned off, a control
  // that only exists on some screens) is skipped rather than stalling the tour.
  useEffect(() => {
    if (!isTourOpen || !step || frame) return;
    const timer = setTimeout(advance, 900);
    return () => clearTimeout(timer);
  }, [isTourOpen, step, frame, advance]);

  // The page is frozen while the tour runs — the spec's "background remains
  // static". Non-passive native listeners, because React's own wheel/touchmove
  // handlers are passive and `preventDefault` there does nothing.
  useEffect(() => {
    if (!isTourOpen) return;
    const root = rootRef.current;
    if (!root) return;
    const block = (event) => event.preventDefault();
    root.addEventListener("wheel", block, { passive: false });
    root.addEventListener("touchmove", block, { passive: false });
    return () => {
      root.removeEventListener("wheel", block);
      root.removeEventListener("touchmove", block);
    };
  }, [isTourOpen]);

  // Focus lands on the current step's button (so Enter and Space advance) and
  // returns to whatever had it when the tour ends.
  useEffect(() => {
    if (!isTourOpen) return;
    restoreFocusRef.current = document.activeElement;
    return () => {
      const previous = restoreFocusRef.current;
      if (previous instanceof HTMLElement && document.contains(previous)) {
        previous.focus();
      }
    };
  }, [isTourOpen]);

  useEffect(() => {
    if (!isTourOpen) return;
    const timer = setTimeout(() => {
      panelRef.current?.querySelector("[data-tour-primary]")?.focus();
    }, 60);
    return () => clearTimeout(timer);
  }, [isTourOpen, index]);

  // Focus trap + keyboard handling for the whole overlay.
  useEffect(() => {
    if (!isTourOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        endTour();
        return;
      }
      if (SCROLL_KEYS.has(event.key)) {
        event.preventDefault();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inside = panel.contains(active);
      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [isTourOpen, endTour]);

  // The bubble's own height decides whether it fits above its target, so it is
  // measured before paint and fed back into the placement below. `t` is a
  // dependency because switching language rewrites the copy — and a two-line
  // description where there had been three moves the whole bubble.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || !isTourOpen || isFinale) return;
    // `offsetHeight`, not `getBoundingClientRect`: the bubble is mid-entrance
    // when this runs and the rect would report its scaled-down height.
    const height = panel.offsetHeight;
    setBubbleHeight((current) => (Math.abs(current - height) < 1 ? current : height));
  }, [isTourOpen, index, isFinale, frame?.vw, t]);

  const viewportWidth = frame?.vw ?? 0;
  const bubbleWidth = Math.min(BUBBLE_MAX_WIDTH, Math.max(240, viewportWidth - EDGE * 2));
  const placement =
    frame && step
      ? place({
          rect: frame.rect,
          bubble: { width: bubbleWidth, height: bubbleHeight },
          viewport: { width: frame.vw, height: frame.vh },
          prefer: step.placement ?? "auto",
        })
      : null;

  const spotTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 320, damping: 34, mass: 0.9 };

  return (
    <AnimatePresence>
      {isTourOpen && (
        <motion.div
          key="tour"
          ref={rootRef}
          // Above the app's sheets (z-40) and modals (z-50): the tour is the
          // topmost layer the product has.
          className="fixed inset-0 z-[70] touch-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
        >
          <AnimatePresence>
            {step && frame && (
              <motion.div
                key="spotlight"
                aria-hidden
                className="pointer-events-none fixed"
                // No entrance transform: the light is already where it belongs
                // when the overlay fades up, and only its rect animates after.
                initial={false}
                animate={{
                  top: frame.rect.top,
                  left: frame.rect.left,
                  width: frame.rect.width,
                  height: frame.rect.height,
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: reduceMotion ? 0 : 0.25 },
                }}
                transition={spotTransition}
                style={{
                  borderRadius: step.radius ?? 20,
                  boxShadow: `0 0 0 3px ${SPOT_RING}, 0 0 0 9999px ${OVERLAY_TINT}`,
                }}
              >
                {!reduceMotion && (
                  // The gentle breath every few seconds. Transform and opacity
                  // only, so it never repaints the dim behind it.
                  <motion.span
                    className="absolute inset-0 rounded-[inherit] ring-2 ring-brand"
                    animate={{ scale: [1, 1.16, 1], opacity: [0.6, 0, 0] }}
                    transition={{
                      duration: 1.6,
                      times: [0, 0.55, 1],
                      repeat: Infinity,
                      repeatDelay: 1.4,
                      ease: "easeOut",
                    }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {step && placement && (
              <CoachMark
                key={step.id}
                ref={setPanel}
                step={step}
                index={index}
                total={steps.length}
                placement={placement}
                width={bubbleWidth}
                labelId={labelId}
                descriptionId={descriptionId}
                reduceMotion={reduceMotion}
                onAdvance={advance}
                onSkip={endTour}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isFinale && (
              <FinaleCard
                key="finale"
                ref={setPanel}
                labelId={labelId}
                descriptionId={descriptionId}
                reduceMotion={reduceMotion}
                onDone={endTour}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * One anchored bubble. `placement` arrives fully resolved — this only draws.
 */
function CoachMark({
  ref,
  step,
  index,
  total,
  placement,
  width,
  labelId,
  descriptionId,
  reduceMotion,
  onAdvance,
  onSkip,
}) {
  const { t } = useTranslation();
  const fromBelow = placement.side === "top";

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      className="fixed"
      style={{ top: placement.top, left: placement.left, width }}
      initial={{ opacity: 0, y: fromBelow ? 10 : -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.98,
        transition: { duration: reduceMotion ? 0 : 0.14 },
      }}
      transition={
        reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30 }
      }
    >
      {/* Drawn before the body so the body's own surface covers its inner
          half — that is what hides the ring where the two meet. */}
      <span
        aria-hidden
        className="absolute size-3.5 rotate-45 rounded-[3px] bg-surface ring-1 ring-ink/5"
        style={{
          left: placement.arrowX - ARROW,
          [fromBelow ? "bottom" : "top"]: -ARROW,
        }}
      />

      <div className="relative rounded-[22px] bg-surface p-4 shadow-lift ring-1 ring-ink/5">
        <p
          id={labelId}
          className="font-display text-base leading-tight font-bold text-ink"
        >
          {t(`onboarding.steps.${step.id}.title`)}
        </p>
        <p id={descriptionId} className="mt-1.5 text-sm leading-relaxed text-muted">
          {t(`onboarding.steps.${step.id}.body`)}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span aria-hidden className="flex items-center gap-1.5">
            {Array.from({ length: total }, (_, dot) => (
              <span
                key={dot}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  dot === index ? "w-4 bg-brand" : "w-1.5 bg-rule"
                }`}
              />
            ))}
          </span>
          <span className="sr-only">
            {t("onboarding.progress", { current: index + 1, total })}
          </span>

          <span className="flex shrink-0 items-center gap-1">
            {/* The way out, deliberately quiet: plain text against the filled
                primary, so leaving is always available but never the thing the
                eye lands on first. */}
            <button
              type="button"
              onClick={onSkip}
              className="rounded-full px-2.5 py-2 font-display text-xs font-semibold text-faint transition-colors hover:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {t("onboarding.skip")}
            </button>

            <motion.button
              data-tour-primary
              type="button"
              onClick={onAdvance}
              whileTap={{ scale: 0.96 }}
              transition={SPRING_POP}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 py-2 font-display text-sm font-bold text-white shadow-card transition-colors hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {t("onboarding.gotIt")}
              <ArrowRight className="size-4" strokeWidth={2.5} />
            </motion.button>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * The sign-off. The dim is gone by the time this lands (the spotlight fades
 * out as the index passes the last step), so it floats over the live screen.
 */
function FinaleCard({ ref, labelId, descriptionId, reduceMotion, onDone }) {
  const { t } = useTranslation();

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      className="fixed top-1/2 left-1/2 w-[min(20.5rem,calc(100vw-2.5rem))] rounded-[28px] bg-surface p-6 text-center shadow-lift ring-1 ring-ink/5"
      // x/y carry the centring, not a `-translate-x-1/2` class: framer writes
      // the whole `transform`, so a class-based translate would be overwritten
      // the moment the scale animates.
      initial={{ opacity: 0, scale: 0.92, x: "-50%", y: "-44%" }}
      animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
      exit={{
        opacity: 0,
        scale: 0.96,
        x: "-50%",
        y: "-50%",
        transition: { duration: reduceMotion ? 0 : 0.16 },
      }}
      transition={reduceMotion ? { duration: 0 } : SPRING_POP}
    >
      <span
        aria-hidden
        className="mx-auto flex size-14 items-center justify-center rounded-full bg-linear-to-br from-brand-wash to-white text-2xl shadow-card ring-1 ring-inset ring-brand/15"
      >
        ✨
      </span>
      <p
        id={labelId}
        className="mt-4 font-display text-xl leading-tight font-bold text-ink"
      >
        {t("onboarding.done.title")}
      </p>
      <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-muted">
        {t("onboarding.done.body")}
      </p>
      <motion.button
        data-tour-primary
        type="button"
        onClick={onDone}
        whileTap={{ scale: 0.97 }}
        transition={SPRING_POP}
        className="mt-5 w-full rounded-full bg-brand px-5 py-3 font-display text-sm font-bold text-white shadow-card transition-colors hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {t("onboarding.done.cta")}
      </motion.button>
    </motion.div>
  );
}

/** Whether this element (or a container it sits in) is held in place. */
function isPinned(element) {
  for (let node = element; node && node !== document.body; node = node.parentElement) {
    const position = getComputedStyle(node).position;
    if (position === "fixed" || position === "sticky") return true;
  }
  return false;
}

/** The target's box, grown by `pad` on every side. */
function inflate(rect, pad) {
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  };
}

/** Sub-pixel-tolerant comparison, so a still target causes no re-renders. */
function sameFrame(a, b) {
  if (a === b) return true;
  if (!a || !b || !a.rect || !b.rect) return false;
  return (
    a.vw === b.vw &&
    a.vh === b.vh &&
    Math.abs(a.rect.top - b.rect.top) < 0.5 &&
    Math.abs(a.rect.left - b.rect.left) < 0.5 &&
    Math.abs(a.rect.width - b.rect.width) < 0.5 &&
    Math.abs(a.rect.height - b.rect.height) < 0.5
  );
}

/**
 * Where the bubble sits relative to the spotlight.
 *
 * The preferred side is honoured whenever it fits and abandoned when it
 * doesn't, so a step never has to know how tall its own copy renders or how
 * short the user's phone is. Horizontally the bubble is clamped to the
 * viewport and the arrow slides along it to stay on the target's centre —
 * which is what keeps a bubble anchored to an icon near the screen edge
 * pointing at that icon rather than at itself.
 */
function place({ rect, bubble, viewport, prefer }) {
  if (!rect) return null;

  const above = rect.top - GAP - EDGE;
  const below = viewport.height - rect.top - rect.height - GAP - EDGE;

  let side;
  if (prefer === "top") side = above >= bubble.height || above >= below ? "top" : "bottom";
  else if (prefer === "bottom")
    side = below >= bubble.height || below >= above ? "bottom" : "top";
  else side = below >= bubble.height ? "bottom" : "top";

  const top =
    side === "top"
      ? rect.top - GAP - bubble.height
      : rect.top + rect.height + GAP;

  const centre = rect.left + rect.width / 2;
  const left = clamp(
    centre - bubble.width / 2,
    EDGE,
    Math.max(EDGE, viewport.width - bubble.width - EDGE),
  );

  return {
    side,
    top: clamp(top, EDGE, Math.max(EDGE, viewport.height - bubble.height - EDGE)),
    left,
    // Kept a corner's width away from either end so the arrow never pokes out
    // of the bubble's rounded edge.
    arrowX: clamp(centre - left, 22, Math.max(22, bubble.width - 22)),
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
