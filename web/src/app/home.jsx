"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Newspaper } from "lucide-react";
import { useCallback, useState } from "react";

import { BottomActions } from "@/components/BottomActions";
import { LiveDot } from "@/components/brief/LiveDot";
import { FeedbackSheet } from "@/components/feedback/FeedbackSheet";
import { FeedbackSuccess } from "@/components/feedback/FeedbackSuccess";
import { PoliticianProfileSheet } from "@/components/profile/PoliticianProfileSheet";
import { Landing } from "@/components/Landing";
import { LanguageModal } from "@/components/LanguageModal";
import { Sidebar } from "@/components/Sidebar";
import { LeaderboardSheet } from "@/components/LeaderboardSheet";
import { RepresentativeCard } from "@/components/RepresentativeCard";
import { SearchSheet } from "@/components/SearchSheet";
import { ErrorScreen, LocatingScreen } from "@/components/StatusScreens";
import { TodaysHighlight } from "@/components/TodaysHighlight";
import { XDiscussionSheet } from "@/components/x/XDiscussionSheet";
import { useMinistries } from "@/hooks/useMinistries";
import { useScrolled } from "@/hooks/useScrolled";
import {
  fetchCmByStateKey,
  fetchCmLocation,
  fetchMinisterByName,
  toFriendlyError,
} from "@/lib/api";
import { GeolocationError, requestPosition } from "@/lib/geolocation";
import { useLocationState } from "@/lib/location";
import { rankOf } from "@/lib/ministries";
import { useTranslation } from "@/lib/i18n";
import { rise, SPRING_POP } from "@/lib/motion";
import { NAV_CONTROL, NAV_MENU_BUTTON, NAV_SURFACE } from "@/lib/navStyles";

const RANK_ORDER = {
  "Prime Minister": 0,
  "Cabinet Minister": 1,
  "MoS (Independent Charge)": 2,
  "Minister of State": 3,
};

/**
 * Reads the incoming query string once. `?share=cm&lat=&lng=` opens the
 * Chief Minister page for those coordinates without prompting for location
 * again; `?share=minister&name=` seeds the pending minister name so we can
 * pick their entry once the ministries list loads.
 *
 * Fed by `useSearchParams()` rather than by reading `window.location` here.
 * Reading `window` used to make the first client render disagree with the
 * server-rendered HTML on any `?share=` URL (server: the landing screen,
 * client: the locating screen), which React reported as a hydration failure
 * and recovered from by throwing the whole tree away and re-rendering. The
 * hook has no server/client split to disagree about.
 */
function readDeepLink(params) {
  const share = params.get("share");
  if (share === "cm") {
    const lat = parseFloat(params.get("lat"));
    const lng = parseFloat(params.get("lng"));
    const coords =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? { latitude: lat, longitude: lng }
        : null;
    // `state` seeds the exact CM (e.g. a link shared from the leaderboard, which
    // carries no coordinates); `lat/lng` still seed from the sharer's location.
    return { coords, ministerName: null, cmStateKey: params.get("state") };
  } else if (share === "minister") {
    return { coords: null, ministerName: params.get("name"), cmStateKey: null };
  }
  return { coords: null, ministerName: null, cmStateKey: null };
}

export function Home() {
  const deepLink = readDeepLink(useSearchParams());
  const { t, language, hasChosen, isHydrated } = useTranslation();

  // Held above the router (see `lib/location`) so leaving for `/brief` and
  // coming back doesn't discard it. A `?share=cm&lat=&lng=` link needs no such
  // help: those coordinates live in the URL, which the back navigation
  // restores along with the page.
  const { coords: storedCoords, setCoords } = useLocationState();
  const coords = storedCoords ?? deepLink.coords;
  const [geoError, setGeoError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [openSheet, setOpenSheet] = useState(null); // "info" | "leaderboard" | "search" | "x" | null
  // A search-picked result, either tier — `{ tier: "cm" | "minister", data }`.
  // Kept as one variable (not two) so a cm pick and a minister pick can never
  // both be "selected" at once.
  const [selectedSearchResult, setSelectedSearchResult] = useState(null);
  // Set when a leaderboard row is tapped — a fully-fetched subject that
  // overrides whatever else is on screen until the user backs out of it.
  const [leaderboardSubject, setLeaderboardSubject] = useState(null);
  const [pendingTopperKey, setPendingTopperKey] = useState(null);
  // The last verdict cast, tagged with the subject it was cast on:
  // `{ key, choice }`. Share now lives in the bottom bar rather than inside
  // the card, so it no longer remounts when the subject changes — carrying the
  // key is what stops the share text from crediting a verdict cast on someone
  // else (and stops Share keeping its "you just voted" highlight).
  const [lastVote, setLastVote] = useState(null);
  const [toast, setToast] = useState(null);
  const [pendingMinisterName, setPendingMinisterName] = useState(
    deepLink.ministerName,
  );
  // A `?share=cm&state=` deep link with no coordinates — seed that exact CM by
  // key. Skipped when coords are present, since the location query already
  // resolves the same card.
  const [pendingCmState, setPendingCmState] = useState(
    deepLink.coords ? null : deepLink.cmStateKey,
  );
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Re-opening the picker from the sidebar is dismissible; the first-run
  // prompt is not (see LanguageModal).
  const [languageOpen, setLanguageOpen] = useState(false);
  const [feedbackReaction, setFeedbackReaction] = useState(null);

  // Pre-fetched here (not only when the Search sheet opens) so a
  // `?share=minister&name=` deep link can resolve on first render, before
  // the user ever opens Search themselves.
  const { entries: ministryEntries } = useMinistries();

  // Once ministries load, match a pending deep-linked minister name to an
  // entry and swap the card. Runs during render — React batches the paired
  // setStates into the same commit.
  if (pendingMinisterName && ministryEntries.length > 0) {
    const target = pendingMinisterName.toLowerCase();
    const entry = ministryEntries.find(
      (e) => e.minister.minister_name?.toLowerCase() === target,
    );
    if (entry) {
      setSelectedSearchResult({ tier: "minister", data: entry });
      setPendingMinisterName(null);
    } else {
      setPendingMinisterName(null);
    }
  }

  // Resolves a `?share=cm&state=` deep link (same fetch the leaderboard uses to
  // open a CM), then swaps that CM in the same render-time pattern as above.
  const { data: seededCm } = useQuery({
    queryKey: ["cm-by-state", language, pendingCmState],
    queryFn: () => fetchCmByStateKey(pendingCmState),
    enabled: Boolean(pendingCmState),
  });
  if (pendingCmState && seededCm) {
    setSelectedSearchResult({ tier: "cm", data: seededCm });
    setPendingCmState(null);
  }

  const {
    data,
    isPending: isLoadingSeats,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["cm-location", language, coords?.latitude, coords?.longitude],
    queryFn: () => fetchCmLocation(coords),
    enabled: coords !== null,
  });

  const handleAllowLocation = useCallback(async () => {
    setGeoError(null);
    setIsLocating(true);
    try {
      setCoords(await requestPosition());
    } catch (err) {
      setGeoError(err instanceof GeolocationError ? err.reason : "unavailable");
    } finally {
      setIsLocating(false);
    }
    // `setCoords` is a `useState` setter handed down by `LocationProvider`, so
    // it is stable — declared only to satisfy the exhaustive-deps rule.
  }, [setCoords]);

  const subject =
    leaderboardSubject ?? buildSubject(selectedSearchResult, data?.cm);

  const subjectKey = subject
    ? `${subject.tier}:${subject.tier === "minister" ? subject.ministry + "|" + subject.name : subject.state_key + "|" + subject.name}`
    : "none";

  const lastChoice = lastVote?.key === subjectKey ? lastVote.choice : null;

  const closeSheet = useCallback(() => setOpenSheet(null), []);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const handleSelectCm = useCallback((cm) => {
    setLeaderboardSubject(null);
    setSelectedSearchResult(cm ? { tier: "cm", data: cm } : null);
  }, []);

  const handleSelectMinister = useCallback((entry) => {
    setLeaderboardSubject(null);
    setSelectedSearchResult(entry ? { tier: "minister", data: entry } : null);
  }, []);

  /**
   * Opens a leaderboard row as a full profile, reusing the same
   * `RepresentativeCard` the home CM/minister uses — no separate modal or
   * simplified view. Only one lookup runs at a time; a second tap while one
   * is in flight is a no-op rather than racing two fetches.
   */
  const handleSelectTopper = useCallback(
    async (tier, topper) => {
      if (pendingTopperKey) return;

      const toppedName = tier === "minister" ? topper.minister_name : topper.name;
      const key = `${tier}:${toppedName}`;
      setPendingTopperKey(key);

      try {
        if (tier === "cm") {
          const details = await fetchCmByStateKey(topper.state_key);
          if (!details) throw new Error("CM not found");
          setLeaderboardSubject({ tier: "cm", ...details, isHome: false });
        } else {
          const details = await fetchMinisterByName({
            name: topper.minister_name,
            ministry: topper.ministry,
          });
          if (!details) throw new Error("Union Minister not found");
          const firstFragment = String(details.ministry ?? "")
            .split(";")[0]
            .trim();
          setLeaderboardSubject({
            tier: "minister",
            name: details.minister_name,
            minister_name: details.minister_name,
            party: details.party,
            photo_url: details.photo_url,
            slap_count: details.slap_count,
            rose_count: details.rose_count,
            points: details.manifesto_points,
            manifesto_points: details.manifesto_points,
            ministry: details.ministry,
            portfolio: firstFragment,
            rank_title: rankOf(firstFragment),
            designation: firstFragment,
          });
        }
        setOpenSheet(null);
      } catch {
        showToast(t("common.profileFailed"));
      } finally {
        setPendingTopperKey(null);
      }
    },
    [pendingTopperKey, showToast, t],
  );

  const handleBackFromLeaderboardProfile = useCallback(() => {
    setLeaderboardSubject(null);
  }, []);

  const handleShare = useCallback(
    async (currentChoice) => {
      if (!subject || typeof window === "undefined") return;
      // A leaderboard-navigated CM isn't the one `coords` points at — sharing
      // the home location here would silently send the recipient to the
      // wrong person, so it's withheld rather than reused.
      const url = buildShareUrl(subject, leaderboardSubject ? null : coords);
      const text = buildShareMessage(subject, currentChoice);

      try {
        if (navigator.share) {
          await navigator.share({ title: "MyNetaji", text, url });
          return;
        }
      } catch {
        /* user cancelled the native sheet — fall through to clipboard */
      }
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        showToast(t("share.copied"));
      } catch {
        showToast(t("share.failed"));
      }
    },
    [subject, coords, leaderboardSubject, showToast, t],
  );

  // The lightweight reward beat after a vote commits — separate from the
  // in-flight "winding" banner, which clears before the tally ever lands.
  const handleVoteCast = useCallback(
    (next) => {
      setLastVote({ key: subjectKey, choice: next });
      showToast(
        next === "slap" ? t("vote.slapRecorded") : t("vote.roseRecorded"),
      );
    },
    [subjectKey, showToast, t],
  );

  // Let the sheet finish sliding out before the celebration springs in, so
  // the two backdrops never stack for a frame.
  const handleFeedbackSubmitted = useCallback((reaction) => {
    setFeedbackOpen(false);
    setTimeout(() => setFeedbackReaction(reaction), 240);
  }, []);

  const stage = resolveStage({
    geoError,
    isLocating,
    coords,
    isLoadingSeats,
    isError,
    hasSubject: Boolean(subject),
    // A pending CM-by-state seed shows the loading screen, not the location
    // prompt, until its fetch resolves into the card.
    isSeeding: Boolean(pendingCmState),
  });

  return (
    <main className="flex min-h-dvh flex-col">
      {stage === "landing" && (
        <div className="flex flex-1 items-center">
          <Landing onAllowLocation={handleAllowLocation} isBusy={isLocating} />
        </div>
      )}

      {stage === "locating" && (
        <LocatingScreen
          label={t("status.locatingState")}
          detail={t("status.locatingDetail")}
        />
      )}

      {stage === "geo-error" && (
        <ErrorScreen
          overline={t(`geo.${geoError}.overline`)}
          title={t(`geo.${geoError}.title`)}
          body={t(`geo.${geoError}.body`)}
          onRetry={handleAllowLocation}
        />
      )}

      {stage === "fetch-error" && (
        <ErrorScreen
          overline={t("status.lookupFailedOverline")}
          title={t("status.lookupFailedTitle")}
          body={toFriendlyError(error)}
          onRetry={refetch}
        />
      )}

      {stage === "empty" && (
        <ErrorScreen
          overline={t("status.noMatchOverline")}
          title={t("status.noMatchTitle")}
          body={t("status.noMatchBody")}
          onRetry={handleAllowLocation}
        />
      )}

      {stage === "results" && subject && (
        <div
          className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-3 px-4 pt-2 sm:px-6 sm:pt-3"
        >
          <ResultsHeader
            subject={subject}
            onResetToHome={
              leaderboardSubject
                ? handleBackFromLeaderboardProfile
                : selectedSearchResult
                  ? () => setSelectedSearchResult(null)
                  : null
            }
            backLabel={leaderboardSubject ? t("nav.back") : t("nav.backToCm")}
            onOpenMenu={() => setSidebarOpen(true)}
          />

          <RepresentativeCard
            key={subjectKey}
            subject={subject}
            keySeed={subjectKey}
            onFirstVote={handleVoteCast}
          />

          <motion.div {...rise(0.18)}>
            {/* Reuses the leaderboard's own row handler, so a highlight tile
                opens exactly the profile a leaderboard row would — same fetch,
                same card, same back button. */}
            <TodaysHighlight
              onSelectSubject={handleSelectTopper}
              pendingKey={pendingTopperKey}
            />
          </motion.div>

          <motion.div {...rise(0.24)} className="sticky bottom-0 z-30">
            <BottomActions
              onOpenSearch={() => setOpenSheet("search")}
              onOpenLeaderboard={() => setOpenSheet("leaderboard")}
              onOpenInfo={() => setOpenSheet("info")}
              onOpenX={() => setOpenSheet("x")}
              onShare={() => handleShare(lastChoice)}
              shareHighlight={Boolean(lastChoice)}
            />
          </motion.div>

          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onOpenLanguage={() => {
              setSidebarOpen(false);
              setLanguageOpen(true);
            }}
            onOpenFeedback={() => {
              setSidebarOpen(false);
              setFeedbackOpen(true);
            }}
          />
          {/*
           * First-run language prompt: fires as soon as a representative has
           * resolved (i.e. immediately after the location step) and only while
           * no choice has ever been made. Not dismissible, because dismissing
           * would leave `hasChosen` false and re-prompt on the next load.
           */}
          <LanguageModal open={isHydrated && !hasChosen} onClose={() => {}} />
          <LanguageModal
            open={languageOpen}
            onClose={() => setLanguageOpen(false)}
            dismissible
          />

          <PoliticianProfileSheet
            open={openSheet === "info"}
            onClose={closeSheet}
            subject={subject}
          />
          <LeaderboardSheet
            open={openSheet === "leaderboard"}
            onClose={closeSheet}
            tier={subject.tier}
            currentIdentity={subject.name}
            onSelectTopper={handleSelectTopper}
            pendingKey={pendingTopperKey}
            showToast={showToast}
          />
          <SearchSheet
            open={openSheet === "search"}
            onClose={closeSheet}
            defaultTier={subject.tier === "minister" ? "minister" : "cm"}
            selectedCm={
              selectedSearchResult?.tier === "cm" ? selectedSearchResult.data : null
            }
            selectedMinistry={
              selectedSearchResult?.tier === "minister"
                ? selectedSearchResult.data
                : null
            }
            onSelectCm={handleSelectCm}
            onSelectMinister={handleSelectMinister}
          />
          <XDiscussionSheet
            open={openSheet === "x"}
            onClose={closeSheet}
            subject={subject}
          />

          <Toast message={toast} />

          <FeedbackSheet
            open={feedbackOpen}
            onClose={() => setFeedbackOpen(false)}
            onSubmitted={handleFeedbackSubmitted}
          />
          <FeedbackSuccess
            reaction={feedbackReaction}
            onClose={() => setFeedbackReaction(null)}
          />
        </div>
      )}
    </main>
  );
}

/**
 * A single-line app bar, not a masthead. The old header carried a 3xl/4xl
 * headline, an ornament and a subtitle — roughly the top 40% of the first
 * screen — which pushed the representative (the actual subject of the page)
 * below the fold. Everything here now fits on one row so the card can be the
 * first thing seen.
 *
 * Leaderboard moved out of this bar and into the bottom action row, alongside
 * the other three secondary actions.
 */
function ResultsHeader({
  subject,
  onResetToHome,
  backLabel,
  onOpenMenu,
}) {
  const { t } = useTranslation();
  const scrolled = useScrolled();
  // The state chip only ever applies to the actual home CM (resolved from
  // the user's own location) — a minister, a searched-in CM, or a
  // leaderboard-navigated CM all show the back button in this slot instead.
  const location =
    subject.tier === "cm" && subject.isHome ? titleCase(subject.state ?? "") : null;

  return (
    // The extra bottom margin sits on the header alone, so the gap to the
    // politician card opens up without touching the rhythm of anything below it.
    // The hamburger is a sibling of the bar, not a child of it: the bar gives
    // up that much width so the button sits clear of the glass surface, which
    // is what makes it read as a separate control rather than a nav item.
    //
    // `sticky` rather than `fixed`: the header keeps its place in the flex
    // column, so the card below it needs no compensating offset and can never
    // end up hidden underneath it.
    //
    // `z-30` is the app's chrome layer, shared with the bottom action bar —
    // the two are the same kind of object and never overlap each other. The
    // scale it sits in is: page content up to `z-20` (the vote flight is the
    // highest of those), chrome at `z-30`, sheets at `z-40`, modals at `z-50`.
    // Anything higher here would only break the sheets: `BottomSheet` is
    // `z-40`, so a `z-40` header would tie with it and be settled by DOM order
    // alone — leaving the nav one refactor away from floating on top of its
    // own dimmed backdrop.
    <motion.header
      {...rise(0)}
      className="sticky top-0 z-30 flex shrink-0 items-center gap-2.5 pt-1 pb-3 sm:pb-4"
    >
      <StickyScrim scrolled={scrolled} />

      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t("nav.menu")}
        className={`${NAV_MENU_BUTTON} ${NAV_SURFACE}`}
      >
        <Menu className="size-5" strokeWidth={2.25} />
      </button>

      <div className={`flex min-w-0 flex-1 items-center gap-3 py-2 pr-2 pl-4 ${NAV_SURFACE}`}>
        {/* shrink-0: the wordmark never compresses, however long the state name
            gets — it is the one fixed anchor the bar is balanced around. */}
        <p className="shrink-0 font-display text-lg leading-none font-bold tracking-tight text-ink">
          MyNetaji
        </p>

        {/* min-w-0 lets this group absorb the remaining width and, only when a
            very long name genuinely runs out of room, allows the pill inside
            it to ellipsise rather than push the wordmark off-screen. */}
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <BriefLink />

          {location ? (
            <LocationPill label={location} />
          ) : onResetToHome ? (
            <button
              type="button"
              onClick={onResetToHome}
              className={`${NAV_CONTROL} inline-flex min-w-0 items-center gap-1 px-3.5 font-display text-xs font-semibold text-muted transition-colors hover:text-ink`}
            >
              <span className="truncate">{backLabel ?? t("nav.backToCm")}</span>
            </button>
          ) : null}
        </div>
      </div>
    </motion.header>
  );
}

/**
 * Political Brief launcher, as a broadcast indicator rather than a plain icon.
 *
 * The newspaper glyph alone said "there is a news page"; the pulsing red dot
 * says "there is something on it right now", which is the whole reason to tap
 * it. It shares the `LiveDot` component with the brief's own masthead and card
 * badges, so every live mark in the product breathes on identical timing.
 *
 * The wordmark is held back until `sm`: at 375px the bar already carries the
 * app name and the state pill, and a third label there would push the state
 * name into an ellipsis. Below that breakpoint the dot and glyph carry it,
 * and `aria-label` names the destination at every width.
 *
 * A real link rather than a button that pushes: `/brief` is a page of its own,
 * so it should be openable in a new tab and prefetched like any other route.
 * The lift on hover is CSS here for the same reason — a `motion.a` would buy
 * nothing that a transform transition doesn't already give.
 */
function BriefLink() {
  const { t } = useTranslation();
  return (
    <Link
      href="/brief"
      aria-label={`${t("brief.liveNews")} — ${t("brief.title")}`}
      className={`${NAV_CONTROL} flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-muted transition-[color,transform] duration-200 hover:-translate-y-px hover:text-ink active:scale-95 sm:gap-2 sm:px-3`}
    >
      <LiveDot />
      <Newspaper className="size-4 shrink-0" strokeWidth={2.2} />
      <span className="hidden font-display text-[11px] leading-none font-bold tracking-[0.08em] text-ink uppercase sm:inline">
        {t("brief.liveNews")}
      </span>
    </Link>
  );
}

/**
 * The plate that slides in behind the nav once the page moves.
 *
 * At rest there is nothing here: the bar is a floating glass card over the
 * page's ambient gradient, and that is the look the screen opens on. Once
 * content starts passing underneath, this fades in to give the bar something
 * opaque to sit on, so a photograph scrolling behind the wordmark doesn't turn
 * it to mush.
 *
 * Full-bleed by negative inset rather than `w-screen`: `100vw` includes the
 * desktop scrollbar and would hand the page a horizontal scroll of its own.
 * The insets match the container's own padding exactly (`px-4` / `sm:px-6`),
 * which on a phone reaches the screen edges and on a wide window reaches the
 * edges of the content column — and nothing scrolls outside that column.
 *
 * One transition on `opacity` alone: the border and the shadow are always set
 * and simply fade in with the plate, so the three cannot drift out of step,
 * and the browser animates a single compositor-friendly property. An element
 * at `opacity: 0` also contributes no `backdrop-filter`, so the blur genuinely
 * switches off at rest instead of blurring the gradient for nothing.
 */
function StickyScrim({ scrolled }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute -top-2 -right-4 -bottom-0 -left-4 -z-10 border-b border-ink/[0.07] bg-paper/72 shadow-[0_8px_24px_-16px_rgb(23_22_51_/_0.45)] backdrop-blur-xl backdrop-saturate-150 transition-opacity duration-[240ms] ease-out sm:-top-3 sm:-right-6 sm:-left-6 ${
        scrolled ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

/**
 * The state pill. Width is entirely content-driven — no fixed or percentage
 * width — so "Goa" and "Dadra & Nagar Haveli and Daman & Diu" both sit with
 * the same left/right padding and only the longest names ever ellipsise, and
 * then only once the row has genuinely run out of space.
 *
 * `min-w` keeps a three-letter state from collapsing into a cramped nub, and
 * `justify-center` means the label sits centred inside that minimum rather
 * than hugging the left edge with dead space after it.
 *
 * No chevron: the pill displays the resolved state, it does not open a picker,
 * and an affordance for an interaction that doesn't exist is worse than none.
 */
function LocationPill({ label }) {
  return (
    <span
      title={label}
      className={`${NAV_CONTROL} inline-flex min-w-[5.5rem] items-center justify-center px-3.5 font-display text-xs font-semibold`}
    >
      {/* min-w-0 on the label, not the pill: the pill keeps its comfortable
          floor while the text inside is what actually gives way. */}
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

function Toast({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={SPRING_POP}
          className="fixed bottom-24 left-1/2 z-50 max-w-[92vw] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-center font-display text-sm font-semibold whitespace-nowrap text-white shadow-lift"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * The shared text always names the exact action taken — never generic
 * "rated" language, since the product is an explicit Slap/Rose choice, not a
 * rating scale.
 */
function buildShareMessage(subject, currentChoice) {
  if (currentChoice === "slap") {
    return `I slapped ${subject.name}. 👋 Now it's your turn.`;
  }
  if (currentChoice === "rose") {
    return `I gave ${subject.name} a 🌹. What's your verdict?`;
  }
  return `Slap or Rose ${subject.name}? Decide for yourself.`;
}

function buildShareUrl(subject, coords) {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const params = new URLSearchParams({ share: subject.tier });
  if (subject.tier === "cm") {
    // `state` drives the server-side share preview (`generateMetadata` fetches
    // the CM by this indexed key — no geo query). `lat/lng` stay for the
    // recipient's client, which still seeds the card from the sharer's spot.
    if (subject.state_key) params.set("state", subject.state_key);
    if (coords) {
      params.set("lat", String(coords.latitude));
      params.set("lng", String(coords.longitude));
    }
  } else if (subject.tier === "minister") {
    params.set("name", subject.name);
  }
  return `${origin}/?${params.toString()}`;
}

/**
 * Resolves the subject to display, highest priority first: a search-picked
 * minister, a search-picked CM, then the home CM (resolved from location).
 * A CM's designation ("Chief Minister of X") is already a plain stored
 * string — unlike an MP, there's no cross-referencing needed to work out
 * whether this person also holds another office.
 */
function buildSubject(selectedSearchResult, homeCm) {
  if (selectedSearchResult?.tier === "minister") {
    const entry = selectedSearchResult.data;
    const m = entry.minister;
    return {
      tier: "minister",
      name: m.minister_name,
      minister_name: m.minister_name,
      party: m.party,
      photo_url: m.photo_url,
      slap_count: m.slap_count,
      rose_count: m.rose_count,
      points: m.manifesto_points,
      manifesto_points: m.manifesto_points,
      ministry: entry.ministry,
      portfolio: entry.portfolio || entry.label,
      rank_title: entry.rank,
      designation: entry.portfolio || entry.label,
    };
  }
  if (selectedSearchResult?.tier === "cm") {
    return { tier: "cm", ...selectedSearchResult.data, isHome: false };
  }
  if (homeCm) {
    return { tier: "cm", ...homeCm, isHome: true };
  }
  return null;
}

function titleCase(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/(?:^|[\s-])\S/g, (character) => character.toUpperCase());
}

// Silence unused warning if RANK_ORDER isn't referenced.
void RANK_ORDER;

function resolveStage({
  geoError,
  isLocating,
  coords,
  isLoadingSeats,
  isError,
  hasSubject,
  isSeeding,
}) {
  // A resolved subject wins outright: a minister deep link isn't
  // location-derived, so it must reach the card without ever waiting on
  // (or requiring) `coords`.
  if (hasSubject) return "results";
  if (isSeeding) return "locating";
  if (geoError) return "geo-error";
  if (isLocating) return "locating";
  if (!coords) return "landing";
  if (isLoadingSeats) return "locating";
  if (isError) return "fetch-error";
  return "empty";
}
