"use client";

/**
 * The metadata pill, shared by the feed card and the reader panel so a chip
 * means the same thing and looks the same on both surfaces.
 *
 * Three tones, each earned. `accent` is reserved for the subject of the story
 * — the category — because that is the one chip a reader scans for; `strong`
 * for a named party such as the publisher; `muted` for circumstantial facts
 * like the date. Anything more would be decoration.
 *
 * The accent pair is #9B1122 on #FDECEE, which clears WCAG AA for small text
 * with room to spare — the tint carries the colour, the text stays legible.
 */
const TONES = {
  accent:
    "bg-brief-accent-wash font-semibold text-brief-accent-strong ring-1 ring-brief-accent/15",
  strong: "bg-brief-chip font-semibold text-brief-source",
  muted: "bg-brief-chip/70 font-medium text-brief-meta",
};

export function Chip({ children, tone = "muted" }) {
  return (
    <span
      className={`rounded-full px-2.5 py-[5px] text-[11.5px] leading-4 tracking-[0.005em] ${TONES[tone] ?? TONES.muted}`}
    >
      {children}
    </span>
  );
}

/**
 * A row of chips built from `{ value, tone }` entries, skipping whatever the
 * feed didn't supply. Laid out as a wrapping row rather than a fixed grid,
 * because the feed often carries only one of the three and a grid with holes
 * in it looks broken.
 */
export function ChipRow({ items, className = "" }) {
  const present = items.filter((item) => item.value);
  if (present.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-[7px] ${className}`}>
      {present.map((item) => (
        <Chip key={item.value} tone={item.tone}>
          {item.value}
        </Chip>
      ))}
    </div>
  );
}
