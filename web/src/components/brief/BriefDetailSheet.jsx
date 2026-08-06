"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Info, Newspaper, X } from "lucide-react";
import { useEffect } from "react";

import { formatDate } from "./BriefCard";
import { ChipRow } from "./Chip";
import { PublisherMark, VerifiedLabel } from "./PublisherMark";
import { useTranslation } from "@/lib/i18n";
import { SPRING_POP, SPRING_SHEET } from "@/lib/motion";

/**
 * The story in full, on a sheet that covers 92% of the viewport.
 *
 * Deliberately a separate surface rather than an expanding card: expanding in
 * place would push the page around under the reader and turn the preview into
 * the article, which it is not. This is still a summary — the source's own
 * page is one tap below it, pinned so it never scrolls out of reach.
 *
 * The open story is the prop, not internal state, so closing is a single
 * `null` upstream; AnimatePresence holds the last rendered element on screen
 * while the sheet slides away, so the text doesn't blank out mid-exit.
 *
 * Read top to bottom the panel is: who filed it, what happened, the facts of
 * the filing, the story itself, and then the way out to the publisher.
 */
export function BriefDetailSheet({ story, onClose }) {
  const { t, language } = useTranslation();
  const open = Boolean(story);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const published = story ? formatDate(story.publishedAt, language) : null;
  const body = story?.summary || story?.preview || "";
  const cta = story?.source
    ? t("brief.continueOn", { publisher: story.source })
    : t("brief.openOriginal");

  return (
    <AnimatePresence>
      {story && (
        <div className="fixed inset-0 z-50 font-editorial">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-brief-ink/45 backdrop-blur-[3px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={story.title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            /* Tweens out, like every other sheet in the app: a spring on exit
               drags the tail of the close past the point where it still reads
               as responsive. */
            exit={{ y: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={SPRING_SHEET}
            className="absolute inset-x-0 bottom-0 flex h-[92vh] flex-col rounded-t-[26px] bg-surface shadow-brief-sheet sm:mx-auto sm:max-w-2xl"
          >
            {/* The grab handle. Not a control — it is the affordance that says
                this surface is a sheet, and it costs one 36px bar to say it. */}
            <span
              aria-hidden
              className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-brief-line"
            />

            <SheetHeader
              source={story.source}
              verifiedLabel={t("brief.verified")}
              onClose={onClose}
              closeLabel={t("common.close")}
            />

            {/* The article arrives a beat behind the panel, so the sheet lands
                first and its contents settle into it. */}
            <motion.article
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.12, ease: [0.2, 0, 0, 1] }}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-6 pb-9 sm:px-8"
            >
              <h2 className="text-[28px] leading-[35px] font-bold tracking-[-0.028em] text-balance text-brief-ink sm:text-[32px] sm:leading-[40px]">
                {story.title}
              </h2>

              {/* The publisher is already named in the header directly above,
                  so it is not repeated here — these are the circumstantial
                  facts around the story, not its byline. */}
              <ChipRow
                className="mt-4"
                items={[
                  { value: story.category, tone: "accent" },
                  { value: published },
                ]}
              />

              <ArticleBody
                text={body}
                isPartial={story.isPartial}
                heading={
                  story.isPartial
                    ? t("brief.previewHeading")
                    : t("brief.articleHeading")
                }
              />

              {story.isPartial && <PreviewNotice text={t("brief.previewNotice")} />}
            </motion.article>

            {story.url && (
              <div className="shrink-0 border-t border-brief-rule bg-surface px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8">
                <motion.a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  transition={SPRING_POP}
                  className="flex w-full items-center justify-center gap-2 rounded-brief-control bg-brief-accent px-6 py-4 text-[15.5px] leading-5 font-semibold tracking-[-0.01em] text-white shadow-brief-cta transition-colors duration-200 hover:bg-brief-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brief-accent"
                >
                  <span className="min-w-0 truncate">{cta}</span>
                  <ArrowUpRight className="size-[18px] shrink-0" strokeWidth={2.25} />
                </motion.a>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Publisher on the left, close on the right, hairline underneath.
 *
 * The publisher is repeated here (it is already on the card's photograph)
 * because the sheet covers the card that carried it — by the time this is
 * open, the only thing on screen saying who reported this is this row.
 */
function SheetHeader({ source, verifiedLabel, onClose, closeLabel }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-brief-rule px-5 py-3 sm:px-8">
      <span className="flex min-w-0 items-center gap-2.5">
        <PublisherMark name={source} size="lg" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] leading-[19px] font-semibold tracking-[-0.01em] text-brief-source">
            {source}
          </span>
          <VerifiedLabel label={verifiedLabel} />
        </span>
      </span>

      <motion.button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        transition={SPRING_POP}
        className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-brief-chip text-brief-meta transition-colors hover:bg-brief-line hover:text-brief-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brief-accent"
      >
        <X className="size-[18px]" strokeWidth={2} />
      </motion.button>
    </header>
  );
}

/**
 * The story itself, at reading width and reading rhythm.
 *
 * 17px on a 29px leading is the comfortable end of the body-copy range, and
 * the accent rule beside the section label is the only red in the scroll.
 *
 * The heading is supplied rather than decided here, and it is what keeps the
 * screen honest: while the feed is truncated it says "Article Preview", and if
 * the plan ever starts returning whole articles it says "Article" instead —
 * with no other change to this component. Nothing below shortens the text, so
 * a complete article renders complete.
 */
function ArticleBody({ text, heading, isPartial }) {
  const paragraphs = toParagraphs(text, isPartial);
  if (paragraphs.length === 0) return null;

  return (
    <section className="relative mt-8 overflow-hidden rounded-brief-control border border-brief-line bg-gradient-to-b from-brief-chip/25 to-transparent py-5 pr-5 pl-6 sm:pr-6 sm:pl-7">
      {/* The left accent strip — the same device as the feed card's edge, so
          the preview reads as the same family of object one level in. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-brief-accent via-brief-accent/60 to-transparent"
      />

      <h3 className="flex items-center gap-2 text-[11px] leading-4 font-bold tracking-[0.1em] text-brief-accent-strong uppercase">
        <Newspaper className="size-[13px] shrink-0" strokeWidth={2.25} />
        {heading}
      </h3>

      <div className="mt-4 space-y-[18px]">
        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="text-[17px] leading-[29px] tracking-[-0.003em] text-brief-body"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

/** Roughly the length past which an unbroken block stops being readable. */
const CHUNK_TARGET = 420;

/**
 * Turns the body string into paragraphs.
 *
 * The feed's own line breaks win whenever it has any — those are the
 * publisher's paragraphing and we have no business second-guessing it. Only
 * when the whole story arrives as one unbroken block (which some newsrooms
 * send, and which no amount of leading makes readable) is it grouped into
 * chunks on sentence boundaries, never mid-sentence. The sentence pattern
 * includes the danda so Hindi copy breaks in the right places too.
 *
 * Nothing here removes text: chunking only inserts paragraph breaks, so a
 * full article stays a full article.
 */
function toParagraphs(text, isPartial) {
  const explicit = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  // The provider's cut lands wherever its character budget ran out, which
  // regularly leaves a stub behind — "Pr…" on its own line. Trimming to the
  // last complete thought reads as an edit; leaving the stub reads as a bug.
  // Gated on `isPartial`, so it can never touch a complete article.
  if (isPartial && explicit.length > 1) {
    const last = explicit.at(-1);
    if (last.endsWith("…") && last.length < 30) explicit.pop();
  }

  if (explicit.length > 1 || explicit.length === 0) return explicit;

  const [block] = explicit;
  if (block.length <= CHUNK_TARGET) return explicit;

  const sentences = block.match(/[^.!?…।]+(?:[.!?…।]+["')\]]*|$)\s*/g);
  if (!sentences) return explicit;

  const chunks = sentences.reduce((acc, sentence) => {
    const current = acc.at(-1);
    if (current && current.length < CHUNK_TARGET) {
      acc[acc.length - 1] = `${current} ${sentence.trim()}`.trim();
    } else {
      acc.push(sentence.trim());
    }
    return acc;
  }, []);

  // A tail sentence or two left over from the last split reads as an orphan
  // rather than a paragraph, so it goes back where it came from. Merging, not
  // dropping — the text is unchanged either way.
  if (chunks.length > 1 && chunks.at(-1).length < 120) {
    const tail = chunks.pop();
    chunks[chunks.length - 1] = `${chunks.at(-1)} ${tail}`;
  }

  return chunks;
}

/**
 * Shown only when the provider cut the body short. It replaces the raw
 * `[+1234 chars]` marker the feed used to leak (stripped in `lib/api`) with a
 * plain sentence, so a story that stops early reads as deliberate rather than
 * broken — and points at the button directly below it.
 */
function PreviewNotice({ text }) {
  return (
    <aside className="mt-7 flex items-start gap-3 rounded-brief-control border border-brief-line bg-brief-chip/60 px-4 py-3.5">
      {/* Grey, not red, and an info glyph rather than an alert one: nothing
          has gone wrong here, and a warning colour would say it had. */}
      <Info
        aria-hidden
        className="mt-px size-[15px] shrink-0 text-brief-faint"
        strokeWidth={2}
      />
      <p className="text-[13px] leading-[21px] tracking-[-0.002em] text-brief-meta">
        {text}
      </p>
    </aside>
  );
}
