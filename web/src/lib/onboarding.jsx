"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * The onboarding layer's state, kept apart from the tour's rendering so the
 * two can be reasoned about separately: this file owns "has this user seen it,
 * is it running, and where is each highlightable element"; `OnboardingTour`
 * owns everything you can see.
 *
 * Elements register themselves by id (`useOnboardingTarget("nav-search")`)
 * rather than being handed down as refs from the page, so adding a step later
 * is one entry in a step list plus one hook call at the element — no prop
 * threading through the components in between.
 *
 * Nothing here touches navigation, data or any existing behaviour: registering
 * a target only records a DOM node in a ref-held Map, which never re-renders
 * the component that registered it.
 */

// The flag the brief names, stored verbatim rather than under the app's
// `mynetaji:` prefix so it is exactly the key the spec asks for.
const STORAGE_KEY = "tutorialCompleted";

const listeners = new Set();

function subscribe(onChange) {
  listeners.add(onChange);
  // `storage` covers other tabs; the local write dispatches to `listeners`.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readCompleted() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // Private mode / storage disabled. Reporting "completed" is the kind
    // failure here: without storage the flag can never be saved, so the
    // alternative is a tutorial that reappears on every single load.
    return true;
  }
}

/*
 * Read through `useSyncExternalStore` for the same reason the language choice
 * is (see `lib/i18n`): it is browser state, not React state, and this is the
 * one API that is correct across SSR. The server snapshot says "completed", so
 * the server and hydrating renders agree that there is no tour, and the real
 * value arrives in the re-render immediately after hydration.
 */
const serverCompleted = () => true;

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  // A ref, not state: the tour reads positions from these nodes on its own
  // animation frame, and a Map in state would re-render every consumer each
  // time an element mounted.
  const targets = useRef(new Map());
  const [isTourOpen, setIsTourOpen] = useState(false);
  const hasCompleted = useSyncExternalStore(
    subscribe,
    readCompleted,
    serverCompleted,
  );

  const registerTarget = useCallback((id, element) => {
    if (element) targets.current.set(id, element);
    else targets.current.delete(id);
  }, []);

  const getTarget = useCallback((id) => targets.current.get(id) ?? null, []);

  const startTour = useCallback(() => setIsTourOpen(true), []);

  /**
   * Closes the tour and records that it has been seen. Both the final
   * "Let's Go" and an Escape land here, so there is no way to leave the tour
   * in a state where it comes back uninvited.
   */
  const endTour = useCallback(() => {
    setIsTourOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* the flag just won't persist; the notify below still re-renders */
    }
    listeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(
    () => ({
      isTourOpen,
      hasCompleted,
      startTour,
      endTour,
      registerTarget,
      getTarget,
    }),
    [isTourOpen, hasCompleted, startTour, endTour, registerTarget, getTarget],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used inside <OnboardingProvider>");
  }
  return context;
}

/**
 * Marks an element as spotlightable: `<button ref={useOnboardingTarget("nav-search")} …>`.
 *
 * The returned callback is memoised on the id, so React attaches it once and
 * doesn't detach/reattach on every render of the host component.
 */
export function useOnboardingTarget(id) {
  const { registerTarget } = useOnboarding();
  return useMemo(() => (element) => registerTarget(id, element), [id, registerTarget]);
}
