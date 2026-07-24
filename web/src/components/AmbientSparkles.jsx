/**
 * A handful of tiny fixed sparkles scattered into the page margins, purely
 * decorative and behind everything (`z-index: -1` via the `.sparkle` class).
 *
 * Positions are hand-placed toward the corners so they land in the ambient
 * gutters rather than over content, and each carries its own size, peak
 * opacity, duration and delay so the field never pulses in unison. Static
 * markup — no client JS — and the reduced-motion rule in globals.css freezes
 * the twinkle for anyone who asks.
 */
const SPARKLES = [
  { top: "12%", left: "6%", size: 6, peak: 0.55, dur: "5.5s", delay: "0s" },
  { top: "22%", left: "92%", size: 4, peak: 0.45, dur: "6.5s", delay: "1.2s" },
  { top: "68%", left: "4%", size: 5, peak: 0.4, dur: "7s", delay: "2.4s" },
  { top: "82%", left: "88%", size: 7, peak: 0.5, dur: "6s", delay: "0.6s" },
  { top: "44%", left: "97%", size: 3, peak: 0.4, dur: "5s", delay: "3.1s" },
  { top: "90%", left: "40%", size: 4, peak: 0.35, dur: "6.8s", delay: "1.8s" },
];

export function AmbientSparkles() {
  return (
    <div aria-hidden>
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="sparkle"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            "--sparkle-peak": s.peak,
            "--sparkle-dur": s.dur,
            "--sparkle-delay": s.delay,
          }}
        />
      ))}
    </div>
  );
}
