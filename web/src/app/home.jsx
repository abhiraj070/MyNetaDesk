"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";

import { BottomActions } from "@/components/BottomActions";
import { InfoSheet } from "@/components/InfoSheet";
import { Landing } from "@/components/Landing";
import { LeaderboardSheet } from "@/components/LeaderboardSheet";
import { RepresentativeCard } from "@/components/RepresentativeCard";
import { SearchSheet } from "@/components/SearchSheet";
import { ErrorScreen, LocatingScreen } from "@/components/StatusScreens";
import { TodaysHighlight } from "@/components/TodaysHighlight";
import { XDiscussionSheet } from "@/components/x/XDiscussionSheet";
import { useMinistries } from "@/hooks/useMinistries";
import {
  fetchCmByStateKey,
  fetchCmLocation,
  fetchMinisterByName,
  toFriendlyError,
} from "@/lib/api";
import {
  GEOLOCATION_COPY,
  GeolocationError,
  requestPosition,
} from "@/lib/geolocation";
import { rankOf } from "@/lib/ministries";
import { rise, SPRING_POP } from "@/lib/motion";

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
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { coords: { latitude: lat, longitude: lng }, ministerName: null };
    }
  } else if (share === "minister") {
    return { coords: null, ministerName: params.get("name") };
  }
  return { coords: null, ministerName: null };
}

export function Home() {
  const deepLink = readDeepLink(useSearchParams());

  const [coords, setCoords] = useState(deepLink.coords);
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

  const {
    data,
    isPending: isLoadingSeats,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["cm-location", coords?.latitude, coords?.longitude],
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
  }, []);

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
        showToast("Couldn't load their profile. Try again?");
      } finally {
        setPendingTopperKey(null);
      }
    },
    [pendingTopperKey, showToast],
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
          await navigator.share({ title: "myNeta", text, url });
          return;
        }
      } catch {
        /* user cancelled the native sheet — fall through to clipboard */
      }
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        showToast("Link copied — paste it anywhere.");
      } catch {
        showToast("Couldn't copy the link. Try again?");
      }
    },
    [subject, coords, leaderboardSubject, showToast],
  );

  // The lightweight reward beat after a vote commits — separate from the
  // in-flight "winding" banner, which clears before the tally ever lands.
  const handleVoteCast = useCallback(
    (next) => {
      setLastVote({ key: subjectKey, choice: next });
      showToast(
        next === "slap"
          ? "👋 Another slap recorded."
          : "🌹 One more rose added.",
      );
    },
    [subjectKey, showToast],
  );

  const stage = resolveStage({
    geoError,
    isLocating,
    coords,
    isLoadingSeats,
    isError,
    hasSubject: Boolean(subject),
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
          label="Locating your state"
          detail="Matching your coordinates against state boundaries."
        />
      )}

      {stage === "geo-error" && (
        <ErrorScreen
          overline={GEOLOCATION_COPY[geoError].overline}
          title={GEOLOCATION_COPY[geoError].title}
          body={GEOLOCATION_COPY[geoError].body}
          onRetry={handleAllowLocation}
        />
      )}

      {stage === "fetch-error" && (
        <ErrorScreen
          overline="Lookup failed"
          title="We couldn't reach the register"
          body={toFriendlyError(error)}
          onRetry={refetch}
        />
      )}

      {stage === "empty" && (
        <ErrorScreen
          overline="No match"
          title="No state covers this spot"
          body="We couldn't match your location to a state we hold. Being outside India — or right on a boundary — is the usual reason."
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
            backLabel={leaderboardSubject ? "← Back" : "← Back to your CM"}
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

          <InfoSheet
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
        </div>
      )}
    </main>
  );
}

const CHIP_CLASS =
  "inline-flex max-w-[60%] items-center gap-1.5 truncate rounded-full bg-surface px-3.5 py-1.5 font-display text-xs font-semibold text-ink shadow-card ring-1 ring-ink/5";

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
  backLabel = "← Back to your CM",
}) {
  // The state chip only ever applies to the actual home CM (resolved from
  // the user's own location) — a minister, a searched-in CM, or a
  // leaderboard-navigated CM all show the back button in this slot instead.
  const location =
    subject.tier === "cm" && subject.isHome ? titleCase(subject.state ?? "") : null;

  return (
    <motion.header
      {...rise(0)}
      className="flex shrink-0 items-center justify-between gap-3"
    >
      <p className="flex items-center gap-1.5 font-display text-base font-bold tracking-tight text-ink">
        <span aria-hidden>👋</span>
        myNeta
      </p>

      {location ? (
        <span className={CHIP_CLASS}>{location}</span>
      ) : onResetToHome ? (
        <button
          type="button"
          onClick={onResetToHome}
          className={`${CHIP_CLASS} text-muted transition-colors hover:text-ink`}
        >
          {backLabel}
        </button>
      ) : (
        <span aria-hidden />
      )}
    </motion.header>
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
  if (subject.tier === "cm" && coords) {
    params.set("lat", String(coords.latitude));
    params.set("lng", String(coords.longitude));
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
}) {
  // A resolved subject wins outright: a minister deep link isn't
  // location-derived, so it must reach the card without ever waiting on
  // (or requiring) `coords`.
  if (hasSubject) return "results";
  if (geoError) return "geo-error";
  if (isLocating) return "locating";
  if (!coords) return "landing";
  if (isLoadingSeats) return "locating";
  if (isError) return "fetch-error";
  return "empty";
}
