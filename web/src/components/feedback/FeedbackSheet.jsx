"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BottomSheet } from "@/components/BottomSheet";
import { sendFeedback } from "@/lib/api";
import { SPRING_POP } from "@/lib/motion";

/**
 * The feedback flow, wrapped in the shared `BottomSheet`. React first (slap or
 * rose), say why, optionally attach a screenshot, send. Kept tight so the whole
 * thing lands in well under 10 seconds.
 *
 * `onSubmitted(reaction)` fires after a successful send; the parent closes this
 * sheet and pops the celebratory modal.
 */
const REACTIONS = [
  {
    value: "slap",
    emoji: "👋",
    title: "Give us a slap",
    subtitle: "Needs improvement",
    placeholder: "What should we improve?",
    ring: "ring-slap",
    wash: "bg-slap-wash",
    text: "text-slap-strong",
  },
  {
    value: "rose",
    emoji: "🌹",
    title: "Give us a rose",
    subtitle: "Loving it",
    placeholder: "What did you enjoy the most?",
    ring: "ring-laurel",
    wash: "bg-laurel-wash",
    text: "text-laurel-strong",
  },
];

export function FeedbackSheet({ open, onClose, onSubmitted }) {
  const [reaction, setReaction] = useState(null);
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  // Reset to a clean slate whenever the sheet fully closes, so re-opening never
  // shows the last person's draft.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setReaction(null);
      setMessage("");
      setScreenshot(null);
      setSubmitting(false);
      setToast(null);
    }, 260);
    return () => clearTimeout(t);
  }, [open]);

  const active = REACTIONS.find((r) => r.value === reaction) ?? null;
  const canSend = Boolean(reaction) && message.trim().length > 0 && !submitting;

  function handlePickFile(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-picking the same file
    if (!file || !file.type.startsWith("image/")) return;
    const readerObj = new FileReader();
    readerObj.onload = () => setScreenshot(String(readerObj.result));
    readerObj.readAsDataURL(file);
  }

  async function handleSend() {
    if (!canSend) return;
    setSubmitting(true);
    setToast(null);
    try {
      await sendFeedback({ reaction, message: message.trim() });
      // Success: parent closes the sheet and pops the celebration. The reset
      // effect above wipes the form once the sheet is fully closed.
      onSubmitted?.(reaction);
    } catch {
      // Keep the sheet open and the draft intact; just surface a toast.
      setSubmitting(false);
      setToast("Couldn't send your feedback. Please try again.");
      setTimeout(() => setToast(null), 3400);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="How are WE doing?" subtitle="Two taps and a sentence — that's it.">
      {/* Reaction cards */}
      <div className="grid grid-cols-2 gap-3">
        {REACTIONS.map((r) => {
          const selected = reaction === r.value;
          return (
            <motion.button
              key={r.value}
              type="button"
              onClick={() => setReaction(r.value)}
              aria-pressed={selected}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              animate={{ scale: selected ? 1.02 : 1 }}
              transition={SPRING_POP}
              className={`flex flex-col items-center gap-1 rounded-[24px] px-4 py-5 text-center ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                selected
                  ? `${r.wash} ${r.ring} ring-2`
                  : "bg-surface-2 ring-ink/5 hover:bg-brand-wash/40"
              }`}
            >
              <span aria-hidden className="text-4xl leading-none">
                {r.emoji}
              </span>
              <span className={`mt-1 font-display text-base font-bold ${selected ? r.text : "text-ink"}`}>
                {r.title}
              </span>
              <span className="text-xs font-semibold text-muted">{r.subtitle}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Tell us why */}
      <label className="mt-6 block">
        <span className="eyebrow">Tell us why</span>
        <AutoTextarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={active ? active.placeholder : "Pick a reaction first, then tell us more…"}
          disabled={!reaction}
        />
      </label>

      {/* Screenshot */}
      <div className="mt-4">
        {screenshot ? (
          <div className="relative inline-flex overflow-hidden rounded-[18px] ring-1 ring-ink/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={screenshot} alt="Attached screenshot" className="h-24 w-auto max-w-[180px] object-cover" />
            <button
              type="button"
              onClick={() => setScreenshot(null)}
              aria-label="Remove screenshot"
              className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-ink/70 text-white backdrop-blur-sm transition-colors hover:bg-ink"
            >
              <X className="size-3.5" strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2.5 text-sm font-semibold text-muted ring-1 ring-ink/5 transition-colors hover:bg-brand-wash hover:text-brand-strong"
          >
            <ImagePlus className="size-4" strokeWidth={2} />
            Attach screenshot
            <span className="font-medium text-faint">(optional)</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePickFile} className="hidden" />
      </div>

      {/* Send */}
      <motion.button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        whileHover={canSend ? { y: -2 } : undefined}
        whileTap={canSend ? { scaleX: 1.02, scaleY: 0.95, y: 2 } : undefined}
        transition={SPRING_POP}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-control bg-brand px-6 py-4 font-display text-lg font-semibold text-white shadow-[0_5px_0_var(--color-brand-strong)] transition-colors hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
      >
        {submitting ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Sending…
          </>
        ) : (
          <>Send 🚀</>
        )}
      </motion.button>

      <Toast message={toast} />
    </BottomSheet>
  );
}

/** Transient pill, matching the app's toast (fixed, above the open sheet). */
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
          className="fixed bottom-24 left-1/2 z-50 max-w-[92vw] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-center font-display text-sm font-semibold text-white shadow-lift"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Multiline input that grows with its content, up to a scroll cap. */
function AutoTextarea({ value, onChange, placeholder, disabled }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      rows={3}
      className="mt-1.5 w-full resize-none rounded-[18px] bg-surface-2 px-4 py-3 text-base text-ink ring-1 ring-ink/5 transition-colors placeholder:text-faint focus:bg-surface focus:ring-brand/40 focus-visible:outline-none disabled:opacity-60"
    />
  );
}
