"use client";

import { BadgeCheck } from "lucide-react";

/**
 * The newsroom's mark.
 *
 * The feed carries no logo files, so this is the publisher's initial on a
 * tinted plate — a monogram, which is at least *their* letter, rather than a
 * generic globe that would look identical for every masthead. Shared by the
 * feed card's publisher block and the reader panel's header so one newsroom
 * is represented the same way wherever it appears.
 */
export function PublisherMark({ name, size = "md" }) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "·";
  const box = size === "lg" ? "size-9 text-[15px]" : "size-8 text-[13px]";

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-[10px] bg-brief-accent-wash leading-none font-bold text-brief-accent-strong ring-1 ring-brief-accent/15 ${box}`}
    >
      {initial}
    </span>
  );
}

/**
 * The trust line under the publisher's name.
 *
 * Grey rather than blue or red: this states that the story came from the
 * curated newsroom list the page's own footnote already promises ("verified
 * newsrooms"), and dressing that up in a platform-blue tick would imply an
 * identity check this app does not perform.
 */
export function VerifiedLabel({ label }) {
  return (
    <span className="mt-px flex items-center gap-1 text-[11px] leading-4 font-medium text-brief-faint">
      <BadgeCheck className="size-[13px] shrink-0" strokeWidth={2.25} />
      {label}
    </span>
  );
}
