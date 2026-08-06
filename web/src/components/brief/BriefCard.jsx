"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { ChipRow } from "./Chip";
import { LiveDot } from "./LiveDot";
import { PublisherMark, VerifiedLabel } from "./PublisherMark";
import { useTranslation } from "@/lib/i18n";
import { SPRING_ENTRANCE } from "@/lib/motion";

/**
 * The day's story, as one card.
 *
 * Everything inside it is set in the editorial face on the colder `brief-*`
 * greys, and the order of the elements is the order of their importance:
 * image, then the headline, then enough of the story to decide on, and only
 * then who filed it — the newsroom sits with the action it qualifies rather
 * than above the headline it wrote. Weight is used once — on the headline —
 * and every other step down the hierarchy is made with size and colour.
 *
 * The whole card is the button; "Continue Reading" is its affordance, not a
 * second control. A nested link or button inside a clickable card would give
 * screen readers two targets for one destination and everyone else an easy
 * miss — so the call to action is a `span` styled as a button, driven by the
 * card's own `group-hover`, and the card element itself takes every press.
 */
export function BriefCard({ story, onOpen }) {
  const { t, language } = useTranslation();
  const published = formatDate(story.publishedAt, language);

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(story)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_ENTRANCE}
      /* The lift is the whole hover: a card that also brightens, scales and
         shifts its shadow colour reads as a web banner. One axis, 3px. */
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.995 }}
      className="group relative block w-full overflow-hidden rounded-brief bg-gradient-to-b from-surface to-[#fcfcfd] text-left font-editorial shadow-brief ring-1 ring-brief-line transition-shadow duration-300 hover:shadow-brief-glow hover:ring-brief-accent/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brief-accent"
    >
      {/* The accent strip. Present but nearly spent at rest, full under the
          cursor — with the glow behind it, the card reads as lighting up from
          its own edge rather than as a border being switched on. Opacity only,
          so it composites on the GPU and costs nothing across twenty cards. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 z-10 w-[3px] bg-gradient-to-b from-brief-accent via-brief-accent/70 to-transparent opacity-30 transition-opacity duration-300 group-hover:opacity-100"
      />

      <HeroImage src={story.image} alt={story.title} liveLabel={t("brief.live")} />

      <div className="px-5 pt-[18px] pb-5 sm:px-6 sm:pb-6">
        <ChipRow
          items={[
            { value: story.category, tone: "accent" },
            { value: published },
          ]}
        />

        <h2 className="mt-3.5 line-clamp-3 text-[24px] leading-[30px] font-bold tracking-[-0.028em] text-balance text-brief-ink sm:text-[26px] sm:leading-[32px]">
          {story.title}
        </h2>

        {story.preview && (
          <p className="mt-2.5 line-clamp-3 text-[15px] leading-[25px] tracking-[-0.004em] text-brief-body">
            {story.preview}
          </p>
        )}

        <PublisherAction
          source={story.source}
          verifiedLabel={t("brief.verified")}
          label={t("brief.continueReading")}
          caption={t("brief.continueCaption")}
        />
      </div>
    </motion.button>
  );
}

/**
 * The 16:9 hero. Locked to that ratio and cropped no tighter, so a wide press
 * photo keeps its subject.
 *
 * A plain `<img>` rather than `next/image` for the same reason as `Portrait`:
 * these URLs come from whichever newsroom filed the story, so the host set
 * can't be allowlisted. A missing or dead image falls back to a plate the
 * exact height of the real one, so the card never changes shape.
 *
 * The LIVE mark floats at top-left. The gradient along the bottom edge stays
 * even though the publisher badge that used to sit on it has moved down to the
 * publisher block — without it a pale photograph dissolves into the white card
 * body and the picture loses its lower edge.
 */
function HeroImage({ src, alt, liveLabel }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    // The plate keeps the badge as well as the height: a card with no
    // photograph should still be recognisably the same object as the ones
    // above and below it.
    return (
      <div className="relative flex aspect-video w-full items-center justify-center border-b border-brief-line bg-brief-placeholder">
        <NewspaperGlyph />
        <LiveBadge label={liveLabel} />
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-brief-placeholder">
      {/* eslint-disable-next-line @next/next/no-img-element -- see note above */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        /* A 700ms ease on a 1.03 scale: the photo settles rather than zooms.
           Paired with the card's own lift, it reads as one object moving. */
        className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      />

      {/* Bottom-weighted scrim. Three stops rather than two so the falloff is
          gradual — a straight black-to-transparent ramp leaves a visible edge
          across the middle of the picture. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/65 via-black/25 to-transparent"
      />

      <LiveBadge label={liveLabel} />
    </div>
  );
}

/**
 * The floating breaking mark, top-left of the hero. Small, solid accent, and
 * the only red on the card until the cursor arrives — it is what makes a stack
 * of stories read as a live wire rather than an archive.
 */
function LiveBadge({ label }) {
  return (
    <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-brief-accent px-2.5 py-[5px] text-[10px] leading-none font-bold tracking-[0.09em] text-white uppercase shadow-brief-cta">
      <LiveDot tone="onAccent" />
      {label}
    </span>
  );
}

/**
 * The publisher panel and the card's call to action, as one raised block.
 *
 * Naming the newsroom directly above the action is the point: the reader
 * decides whether to open a story on who filed it as much as on the headline,
 * and a byline stranded in a metadata row does not carry that weight. It sits
 * on its own recessed plate so it reads as a footer to the card rather than as
 * more body copy.
 *
 * The CTA is a `span`, not a `button` or a link, because the card is already
 * the button (see the note on `BriefCard`) — a real control here would give
 * screen readers two targets for one destination. It carries a `→` rather than
 * a `↗` deliberately: this opens the story preview inside the app, and the
 * offsite arrow belongs on the reader panel's CTA, which genuinely leaves.
 */
function PublisherAction({ source, verifiedLabel, label, caption }) {
  return (
    <div className="mt-5 rounded-brief-control border border-brief-line bg-gradient-to-b from-brief-chip/35 to-brief-chip/75 p-3.5 transition-colors duration-300 group-hover:border-brief-accent/25">
      {source && (
        <div className="flex items-center gap-2.5 pb-3.5">
          <PublisherMark name={source} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13.5px] leading-[18px] font-semibold tracking-[-0.01em] text-brief-source">
              {source}
            </span>
            <VerifiedLabel label={verifiedLabel} />
          </span>
        </div>
      )}

      <span className="flex w-full items-center justify-center gap-2 rounded-[11px] border border-brief-line bg-surface px-5 py-3 text-[15px] leading-5 font-semibold tracking-[-0.01em] text-brief-ink shadow-brief transition-colors duration-300 group-hover:border-brief-accent/35 group-hover:bg-brief-accent-wash group-hover:text-brief-accent-strong">
        {label}
        <ArrowRight
          className="size-[17px] transition-transform duration-300 group-hover:translate-x-1"
          strokeWidth={2.25}
        />
      </span>

      {/* Says what the tap actually does before it is taken — it opens the
          preview, and the publisher is one step beyond that. */}
      <span className="mt-2.5 block text-center text-[11.5px] leading-4 text-brief-faint">
        {caption}
      </span>
    </div>
  );
}

function NewspaperGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-7 text-brief-faint/70"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 6H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2Z" />
      <path d="M7 10h6M7 14h6M17 9v6" />
    </svg>
  );
}

/**
 * `2026-08-05 09:12:00` -> `Aug 5`. No time, no year, nothing that decays.
 *
 * The old provider sent UTC with a space instead of a `T`, which Safari
 * refuses to parse, so the string is normalised before `Date` ever sees it.
 * GNews already sends a full ISO stamp carrying its own `Z`, so the zone is
 * only appended when the value doesn't state one — appending unconditionally
 * produced a trailing `ZZ`, which every browser rejects. Anything still
 * unparseable returns null and the card simply drops the date.
 */
export function formatDate(value, language) {
  if (!value) return null;
  const stamp = String(value).trim().replace(" ", "T");
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(stamp);
  const parsed = new Date(hasZone ? stamp : `${stamp}Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // `en-US` rather than `en-IN`: the Indian English locale formats this as
  // "5 Aug", and the brief's metadata line is specified as "Aug 5".
  return new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}

/**
 * The card's own geometry with its text replaced by bars, so the page loads
 * into its finished shape instead of snapping into it.
 */
export function BriefCardSkeleton() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-brief bg-surface shadow-brief ring-1 ring-brief-line"
    >
      <div className="aspect-video w-full bg-brief-placeholder" />
      <div className="px-5 pt-[18px] pb-5 sm:px-6 sm:pb-6">
        <div className="flex gap-[7px]">
          <Bar className="h-[26px] w-24 rounded-full" />
          <Bar className="h-[26px] w-16 rounded-full" />
        </div>
        <Bar className="mt-[18px] h-6 w-[94%]" />
        <Bar className="mt-2.5 h-6 w-3/5" />
        <Bar className="mt-[18px] h-3 w-full" />
        <Bar className="mt-2 h-3 w-[76%]" />
        <div className="mt-5 h-px bg-brief-rule" />
        <Bar className="mt-[15px] h-11 w-full rounded-brief-control" />
        <Bar className="mx-auto mt-2.5 h-3 w-48" />
      </div>
    </div>
  );
}

function Bar({ className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded bg-brief-chip ${className}`}>
      <div className="skeleton-sweep" />
    </div>
  );
}
