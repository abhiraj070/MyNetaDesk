"use client";

import { useState } from "react";

import { Badge } from "../ui/Badge";

/**
 * The compact identity card — portrait, name, designation, party.
 *
 * Lifted out of `ProfileOverviewTab` (where it opened the Overview tab)
 * unchanged, because the information experience is now the main page and this
 * has to sit above the tab row rather than inside one of the tabs: it names the
 * person every tab is about, so it can't belong to any single one of them.
 *
 * It stays small on purpose. The page's job is to be read, and the portrait is
 * here to answer "who is this about?" in a glance rather than to be the view.
 */
export function ProfileIdentityCard({ subject }) {
  if (!subject) return null;

  return (
    <div className="flex items-center gap-4 rounded-card bg-surface-2 p-4 ring-1 ring-ink/5">
      <Avatar src={subject.photo_url} name={subject.name} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display text-lg leading-tight font-bold text-ink">
          {subject.name}
        </h2>
        {subject.designation && (
          <p className="mt-0.5 truncate text-sm font-semibold text-muted">
            {subject.designation}
          </p>
        )}
        {subject.party && (
          <Badge tone="brand" size="sm" className="mt-1.5">
            {subject.party}
          </Badge>
        )}
      </div>
    </div>
  );
}

function Avatar({ src, name }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const monogram = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-surface ring-1 ring-ink/5">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover object-top"
        />
      ) : (
        <span className="flex size-full items-center justify-center font-display text-lg font-bold text-faint">
          {monogram || "?"}
        </span>
      )}
    </div>
  );
}
