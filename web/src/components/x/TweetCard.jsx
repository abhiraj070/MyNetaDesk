"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  ChartNoAxesColumn,
  Copy,
  ExternalLink,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Share,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/*
 * A single X post, rendered as faithfully to the real X interface as possible
 * and dropped inside our own elevated card (see `TweetShell` below): profile
 * photo, display name + verified seal, @handle · timestamp, body text with
 * linkified entities, a media grid, an optional link/quote card, and the
 * reply / repost / like / views + bookmark / share action row with counts.
 *
 * Everything here is presentation only — the shape it consumes is produced by
 * `normalizeTweets` in lib/api.js.
 */

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function count(n) {
  return n > 0 ? compact.format(n) : "";
}

/** X-style relative time: 45s → 12m → 3h → 5d, then a calendar date. */
function relativeTime(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(1, (Date.now() - then) / 1000);
  if (secs < 60) return `${Math.floor(secs)}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  const days = Math.floor(secs / 86400);
  if (days < 7) return `${days}d`;
  const d = new Date(then);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** "Pankaj Chaudhary" → "PC"; used when no avatar is available. */
function monogram(name, username) {
  const source = (name || username || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

function permalink(author, id) {
  const handle = author?.username || "i";
  return `https://x.com/${handle}/status/${id}`;
}

/** X's blue verified seal (scalloped check). Gold for org/government tiers. */
function VerifiedBadge({ type }) {
  const color =
    type === "government" || type === "business" ? "#e2b719" : "#1d9bf0";
  return (
    <svg viewBox="0 0 22 22" aria-label="Verified" className="size-[18px] shrink-0" fill={color}>
      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.131.634.437 1.218.882 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
    </svg>
  );
}

function Avatar({ author, size = "size-10" }) {
  const [failed, setFailed] = useState(false);
  const src = author?.avatar;
  return (
    <div
      className={`${size} shrink-0 overflow-hidden rounded-full bg-[#e1e8ed]`}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- external X CDN
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span className="flex size-full items-center justify-center bg-[#cfd9de] text-sm font-bold text-[#536471]">
          {monogram(author?.name, author?.username)}
        </span>
      )}
    </div>
  );
}

/**
 * Body text with X's entity styling: #hashtags, @mentions and links go blue.
 * t.co links are swapped for their human `display_url`, and links that X itself
 * hides (media and the quoted tweet's own URL) are stripped from the text.
 */
function TweetText({ text, urls, className = "" }) {
  let body = text ?? "";
  for (const u of urls ?? []) {
    if (!u.url) continue;
    const isMedia = u.display_url?.startsWith("pic.");
    const isQuote = /\/status\/\d+/.test(u.expanded_url ?? "");
    body = body.split(u.url).join(isMedia || isQuote ? "" : u.display_url ?? u.url);
  }
  body = body.replace(/\s+$/, "");

  const parts = body.split(
    /(#[\p{L}\p{N}_]+|@[A-Za-z0-9_]+|https?:\/\/\S+|\b[a-z0-9-]+\.[a-z]{2,}\/\S+)/giu,
  );

  return (
    <p className={`whitespace-pre-wrap break-words text-[15px] leading-[1.35] text-[#0f1419] ${className}`}>
      {parts.map((part, i) => {
        if (/^[#@]/.test(part) || /^https?:\/\//.test(part) || /^[a-z0-9-]+\.[a-z]{2,}\//i.test(part)) {
          return (
            <span key={i} className="text-[#1d9bf0]">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

function MediaTile({ item, className, onOpen }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(item);
      }}
      className={`group relative overflow-hidden bg-[#e1e8ed] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external X CDN */}
      <img
        src={item.preview || item.url}
        alt={item.alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
      />
      {item.type !== "photo" && (
        <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {item.type === "animated_gif" ? "GIF" : "▶"}
        </span>
      )}
    </button>
  );
}

/** X's media mosaic: 1 fills, 2 split, 3 = one tall + two stacked, 4 = grid. */
function MediaGrid({ media, onOpen }) {
  if (!media?.length) return null;
  const n = Math.min(media.length, 4);

  const layout = {
    1: "grid-cols-1 aspect-[16/10]",
    2: "grid-cols-2 aspect-[16/9]",
    3: "grid-cols-2 aspect-[16/9]",
    4: "grid-cols-2 aspect-[16/9]",
  }[n];

  return (
    <div className={`mt-3 grid gap-0.5 overflow-hidden rounded-2xl border border-[#cfd9de] ${layout}`}>
      {n === 3 ? (
        <>
          <MediaTile item={media[0]} onOpen={onOpen} className="row-span-2 h-full" />
          <MediaTile item={media[1]} onOpen={onOpen} className="h-full" />
          <MediaTile item={media[2]} onOpen={onOpen} className="h-full" />
        </>
      ) : (
        media.slice(0, n).map((item) => (
          <MediaTile key={item.key} item={item} onOpen={onOpen} className="h-full w-full" />
        ))
      )}
    </div>
  );
}

/** The first rich link (one X could "unwind" into a title) as a preview card. */
function LinkPreview({ urls }) {
  const link = (urls ?? []).find((u) => u.title && !u.display_url?.startsWith("pic."));
  if (!link) return null;
  const image = link.images?.[0]?.url;
  let host = "";
  try {
    host = new URL(link.expanded_url ?? link.url).host.replace(/^www\./, "");
  } catch {
    host = link.display_url ?? "";
  }
  return (
    <a
      href={link.expanded_url ?? link.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-3 block overflow-hidden rounded-2xl border border-[#cfd9de] transition-colors hover:bg-[#f7f9f9]"
    >
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- external X CDN
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="aspect-[1.91/1] w-full object-cover"
        />
      )}
      <div className="px-3 py-2.5">
        <p className="text-[13px] text-[#536471]">{host}</p>
        <p className="mt-0.5 line-clamp-2 text-[15px] leading-tight text-[#0f1419]">
          {link.title}
        </p>
        {link.description && (
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-tight text-[#536471]">
            {link.description}
          </p>
        )}
      </div>
    </a>
  );
}

/** A quoted tweet: a bordered mini-tweet nested inside the host. Clicking it
 *  opens the quoted post itself (not the host), matching X. */
function QuotedTweet({ quoted, onOpenMedia }) {
  if (!quoted) return null;
  const thumb = quoted.media?.[0];
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        window.open(permalink(quoted.author, quoted.id), "_blank", "noopener");
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          window.open(permalink(quoted.author, quoted.id), "_blank", "noopener");
        }
      }}
      className="mt-3 cursor-pointer overflow-hidden rounded-2xl border border-[#cfd9de] transition-colors hover:bg-[#f7f9f9]"
    >
      <div className="px-3 pt-2.5">
        <div className="flex items-center gap-1.5 text-[15px]">
          <Avatar author={quoted.author} size="size-5" />
          <span className="truncate font-bold text-[#0f1419]">
            {quoted.author?.name || quoted.author?.username || "Unknown"}
          </span>
          {quoted.author?.verified && (
            <VerifiedBadge type={quoted.author?.verifiedType} />
          )}
          {quoted.author?.username && (
            <span className="truncate text-[#536471]">@{quoted.author.username}</span>
          )}
          {quoted.createdAt && (
            <span className="text-[#536471]">· {relativeTime(quoted.createdAt)}</span>
          )}
        </div>
        <div className="pt-1 pb-2.5">
          <TweetText text={quoted.text} urls={quoted.urls} className="text-[14px]" />
        </div>
      </div>
      {thumb && (
        <MediaGrid media={[thumb]} onOpen={onOpenMedia} />
      )}
    </div>
  );
}

function ActionButton({ icon: Icon, value, label, hoverColor, hoverBg, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group -ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-[13px] text-[#536471] transition-colors"
      style={{ ["--hc"]: hoverColor, ["--hb"]: hoverBg }}
    >
      <span className="rounded-full p-1.5 transition-colors group-hover:bg-[var(--hb)] group-hover:text-[var(--hc)]">
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </span>
      {value && (
        <span className="tabular-nums transition-colors group-hover:text-[var(--hc)]">
          {value}
        </span>
      )}
    </button>
  );
}

/** The floating menu behind the ⋯ — Open on X, Copy link, Share. */
function TweetMenu({ author, id }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const url = permalink(author, id);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const share = async () => {
    setOpen(false);
    try {
      if (navigator.share) return navigator.share({ url });
    } catch {
      /* cancelled — fall through */
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard blocked — nothing to do */
    }
  };

  const items = [
    {
      icon: ExternalLink,
      label: "Open on X",
      run: () => window.open(url, "_blank", "noopener"),
    },
    { icon: Copy, label: "Copy link", run: () => navigator.clipboard?.writeText(url) },
    { icon: Share, label: "Share", run: share },
  ];

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More"
        className="-mr-1.5 rounded-full p-1.5 text-[#536471] transition-colors hover:bg-[#1d9bf0]/10 hover:text-[#1d9bf0]"
      >
        <MoreHorizontal className="size-[18px]" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.14, ease: [0.2, 0, 0, 1] }}
            className="absolute right-0 top-8 z-10 w-44 overflow-hidden rounded-2xl bg-white py-1 shadow-lift ring-1 ring-black/10"
          >
            {items.map(({ icon: Icon, label, run }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setOpen(false);
                  run();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] font-medium text-[#0f1419] transition-colors hover:bg-[#f7f9f9]"
              >
                <Icon className="size-[18px] text-[#536471]" />
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CLAMP_AT = 280;

export function TweetCard({ tweet }) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const { author, metrics } = tweet;
  const longText = (tweet.text?.length ?? 0) > CLAMP_AT;

  // Tapping anywhere on the post opens that exact tweet on X, like native X.
  // Every interactive element inside (media, ⋯ menu, action row, expand, quoted
  // tweet, links) stops propagation so it keeps its own behaviour.
  const openPost = () =>
    window.open(permalink(author, tweet.id), "_blank", "noopener");

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={openPost}
      onKeyDown={(e) => {
        if (e.key === "Enter") openPost();
      }}
      className="flex cursor-pointer gap-3 rounded-[24px] px-4 py-3 transition-colors hover:bg-[#f7f9f9] focus-visible:outline-2 focus-visible:outline-[#1d9bf0]"
    >
      <Avatar author={author} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1 text-[15px] leading-tight">
            <span className="truncate font-bold text-[#0f1419]">
              {author?.name || author?.username || "Unknown"}
            </span>
            {author?.verified && <VerifiedBadge type={author?.verifiedType} />}
            {author?.username && (
              <span className="truncate text-[#536471]">@{author.username}</span>
            )}
            {tweet.createdAt && (
              <span className="text-[#536471]">· {relativeTime(tweet.createdAt)}</span>
            )}
          </div>
          <TweetMenu author={author} id={tweet.id} />
        </div>

        <div className="mt-0.5">
          <TweetText
            text={
              longText && !expanded ? `${tweet.text.slice(0, CLAMP_AT)}…` : tweet.text
            }
            urls={tweet.urls}
          />
          {longText && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="mt-0.5 text-[15px] text-[#1d9bf0] hover:underline"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        <MediaGrid media={tweet.media} onOpen={setLightbox} />
        <LinkPreview urls={tweet.urls} />
        <QuotedTweet quoted={tweet.quoted} onOpenMedia={setLightbox} />

        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 flex max-w-md items-center justify-between pr-1"
        >
          <ActionButton
            icon={MessageCircle}
            value={count(metrics.replies)}
            label="Reply"
            hoverColor="#1d9bf0"
            hoverBg="rgb(29 155 240 / 0.1)"
          />
          <ActionButton
            icon={Repeat2}
            value={count(metrics.reposts)}
            label="Repost"
            hoverColor="#00ba7c"
            hoverBg="rgb(0 186 124 / 0.1)"
          />
          <ActionButton
            icon={Heart}
            value={count(metrics.likes)}
            label="Like"
            hoverColor="#f91880"
            hoverBg="rgb(249 24 128 / 0.1)"
          />
          <ActionButton
            icon={ChartNoAxesColumn}
            value={count(metrics.views)}
            label="Views"
            hoverColor="#1d9bf0"
            hoverBg="rgb(29 155 240 / 0.1)"
          />
          <div className="flex items-center">
            <ActionButton
              icon={Bookmark}
              value={count(metrics.bookmarks)}
              label="Bookmark"
              hoverColor="#1d9bf0"
              hoverBg="rgb(29 155 240 / 0.1)"
            />
            <ActionButton
              icon={Share}
              label="Share"
              hoverColor="#1d9bf0"
              hoverBg="rgb(29 155 240 / 0.1)"
              onClick={() => {
                const url = permalink(author, tweet.id);
                if (navigator.share) navigator.share({ url }).catch(() => {});
                else navigator.clipboard?.writeText(url);
              }}
            />
          </div>
        </div>
      </div>

      <Lightbox media={lightbox} onClose={() => setLightbox(null)} />
    </article>
  );
}

/** Fullscreen media viewer, dismissed by tap or Escape. */
function Lightbox({ media, onClose }) {
  useEffect(() => {
    if (!media) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [media, onClose]);

  return (
    <AnimatePresence>
      {media && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/92 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
          <motion.img
            initial={{ scale: 0.94 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.96 }}
            src={media.url || media.preview}
            alt={media.alt}
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SkeletonBar({ className = "" }) {
  return (
    <span className={`relative block overflow-hidden rounded-full bg-rule/70 ${className}`}>
      <span className="skeleton-sweep" />
    </span>
  );
}

/** Shimmering placeholder matching a tweet's footprint (sweep from globals.css). */
export function TweetSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3">
      <SkeletonBar className="size-10 shrink-0 !rounded-full" />
      <div className="flex-1 space-y-2 pt-1">
        <SkeletonBar className="h-3 w-1/3" />
        <SkeletonBar className="h-3 w-11/12" />
        <SkeletonBar className="h-3 w-3/4" />
        <SkeletonBar className="mt-1 h-40 !rounded-2xl" />
      </div>
    </div>
  );
}
