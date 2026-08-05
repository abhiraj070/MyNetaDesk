"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { useTranslation } from "@/lib/i18n";
import { SPRING_ENTRANCE } from "@/lib/motion";

/**
 * The day's story, as one card.
 *
 * Everything inside it is set in the editorial face on the colder `brief-*`
 * greys, and the order of the elements is the order of their importance:
 * image, then who is reporting it, then the headline, then enough of the
 * story to decide on. Weight is used once — on the headline — and every other
 * step down the hierarchy is made with size and colour instead.
 *
 * The whole card is the button; "Continue Reading" is its affordance, not a
 * second control. A nested link inside a clickable card would give screen
 * readers two targets for one destination and everyone else an easy miss.
 */
export function BriefCard({ story, onOpen }) {
  const { t, language } = useTranslation();
  const chip = [story.category, story.country].filter(Boolean).join(" · ");
  const published = formatDate(story.publishedAt, language);

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(story)}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_ENTRANCE}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.995 }}
      className="group block w-full overflow-hidden rounded-[18px] bg-surface text-left font-editorial shadow-brief ring-1 ring-brief-line transition-shadow duration-300 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <HeroImage src={story.image} alt={story.title} />

      <div className="px-[18px] pt-4 pb-4">
        <div className="flex items-center gap-[7px] text-[12.5px] leading-4">
          <SourceIcon src={story.sourceIcon} name={story.source} />
          {story.source && (
            <span className="min-w-0 truncate font-medium text-brief-source">
              {story.source}
            </span>
          )}
          {story.source && published && (
            <span aria-hidden className="size-[3px] shrink-0 rounded-full bg-[#c6c6d0]" />
          )}
          {published && (
            <span className="shrink-0 text-brief-faint">{published}</span>
          )}
        </div>

        <h2 className="mt-2.5 line-clamp-3 text-[22px] leading-7 font-semibold tracking-[-0.021em] text-brief-ink sm:text-[23px] sm:leading-[29px]">
          {story.title}
        </h2>

        {story.preview && (
          <p className="mt-[9px] line-clamp-3 text-[15px] leading-[23px] tracking-[-0.006em] text-brief-body">
            {story.preview}
          </p>
        )}

        <div className="mt-4 h-px bg-brief-rule" />

        <div className="mt-[13px] flex items-center justify-between gap-3">
          {chip ? (
            <span className="shrink-0 rounded-lg bg-brief-chip px-2.5 py-[5px] text-xs leading-4 font-medium tracking-[0.01em] text-brief-body">
              {chip}
            </span>
          ) : (
            <span />
          )}

          <span className="flex shrink-0 items-center gap-1.5 text-sm leading-5 font-semibold tracking-[-0.01em] text-[#1b1b24]">
            {t("brief.continueReading")}
            {/* The arrow carries the hover, not the label: a shifting text
                baseline reads as jitter. */}
            <ArrowRight
              className="size-[15px] transition-transform duration-300 group-hover:translate-x-0.5"
              strokeWidth={1.75}
            />
          </span>
        </div>
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
 */
function HeroImage({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        aria-hidden
        className="flex aspect-video w-full items-center justify-center bg-brief-placeholder"
      >
        <NewspaperGlyph />
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
        className="size-full object-cover"
      />
      {/* A hairline where the photo meets the card, so a light image doesn't
          bleed into the white body. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-ink/8" />
    </div>
  );
}

/** The newsroom's own mark, on the same 16px plate whether it loads or not. */
function SourceIcon({ src, name }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded bg-brief-chip ring-1 ring-brief-line">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- see HeroImage
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-contain"
        />
      ) : (
        <span aria-hidden className="text-[9px] leading-none font-semibold text-brief-meta">
          {(name?.trim()?.[0] ?? "·").toUpperCase()}
        </span>
      )}
    </span>
  );
}

function NewspaperGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6 text-[#c4c4ce]"
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
 * The provider sends UTC with a space instead of a `T`, which Safari refuses
 * to parse, so the string is normalised before `Date` ever sees it. Anything
 * still unparseable returns null and the card simply drops the date.
 */
function formatDate(value, language) {
  if (!value) return null;
  const parsed = new Date(String(value).trim().replace(" ", "T") + "Z");
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
      className="overflow-hidden rounded-[18px] bg-surface shadow-brief ring-1 ring-brief-line"
    >
      <div className="aspect-video w-full bg-brief-placeholder" />
      <div className="px-[18px] pt-4 pb-4">
        <Bar className="h-3 w-2/5" />
        <Bar className="mt-[18px] h-5 w-[92%]" />
        <Bar className="mt-2.5 h-5 w-3/5" />
        <Bar className="mt-[18px] h-2.5 w-full" />
        <Bar className="mt-2 h-2.5 w-[74%]" />
        <div className="mt-4 h-px bg-brief-rule" />
        <div className="mt-[13px] flex items-center justify-between">
          <Bar className="h-6 w-28 rounded-lg" />
          <Bar className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

function Bar({ className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded bg-[#f0f0f4] ${className}`}>
      <div className="skeleton-sweep" />
    </div>
  );
}
