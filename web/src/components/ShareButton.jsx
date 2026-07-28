"use client";

import { motion } from "framer-motion";
import { Check, Share2 } from "lucide-react";
import { useState } from "react";

import { SPRING_POP } from "@/lib/motion";

/**
 * The app's one Share control: native Web Share sheet when the browser offers
 * it, clipboard copy otherwise, and a success toast either way. Rounded, with
 * the same lift-on-hover / squish-on-tap physics as the verdict discs and
 * `ui/Button`, so it feels like the rest of the app.
 *
 * Self-contained: pass the `url` (defaults to the current page), optional
 * `title`/`text`, and — to route feedback through the app's shared toast — a
 * `showToast` callback. `onShared(kind)` fires on a successful share/copy
 * (used by the leaderboard prompt to dismiss itself).
 */
const VARIANTS = {
  primary:
    "bg-brand text-white shadow-[0_5px_0_var(--color-brand-strong)] hover:bg-brand-strong active:translate-y-[3px] active:shadow-[0_2px_0_var(--color-brand-strong)]",
  soft: "bg-surface-2 text-brand-strong ring-1 ring-ink/5 hover:bg-brand-wash",
};

export function ShareButton({
  url,
  title = "MyNetaji",
  text = "",
  label = "Share",
  variant = "soft",
  className = "",
  showToast,
  onShared,
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl =
      url || (typeof window !== "undefined" ? window.location.href : "");
    if (!shareUrl) return;

    // Native share when available; a cancelled sheet is a no-op, not an error
    // worth falling back from — only reach for the clipboard when there is no
    // native share at all.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        onShared?.("shared");
      } catch {
        /* user dismissed the native sheet */
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(text ? `${text}\n${shareUrl}` : shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      showToast?.("Link copied — paste it anywhere.");
      onShared?.("copied");
    } catch {
      showToast?.("Couldn't copy the link. Try again?");
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleShare}
      whileHover={{ y: -2 }}
      whileTap={{ scaleX: 1.03, scaleY: 0.94, y: 2 }}
      transition={SPRING_POP}
      aria-label={label}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 font-display text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${VARIANTS[variant] ?? VARIANTS.soft} ${className}`}
    >
      {copied ? (
        <Check aria-hidden className="size-4" />
      ) : (
        <Share2 aria-hidden className="size-4" />
      )}
      <span>{copied ? "Copied!" : label}</span>
    </motion.button>
  );
}
