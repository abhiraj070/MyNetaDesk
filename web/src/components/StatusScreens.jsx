"use client";

import { motion } from "framer-motion";

import { Button } from "./ui/Button";
import { rise } from "@/lib/motion";

const shell = "mx-auto w-full max-w-xl px-5 py-24 sm:px-8";

export function LocatingScreen({ label, detail }) {
  return (
    <motion.div
      {...rise(0)}
      className={shell}
    >
      <motion.p
        aria-hidden
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="text-4xl"
      >
        📍
      </motion.p>

      <h2
        aria-live="polite"
        className="mt-3 font-display text-2xl font-bold sm:text-3xl"
      >
        {label}
      </h2>
      <p className="mt-2 text-sm leading-relaxed font-medium text-muted">
        {detail}
      </p>

      {/* An indeterminate sweep — the quietest possible progress cue, and it
          costs nothing on the main thread. */}
      <div
        role="presentation"
        className="mt-8 h-2 w-full overflow-hidden rounded-full bg-rule"
      >
        <motion.div
          className="h-full w-1/3 rounded-full bg-linear-to-r from-brand to-slap"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}

export function ErrorScreen({ overline, title, body, onRetry }) {
  return (
    <motion.div
      {...rise(0)}
      className={shell}
      role="alert"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slap-wash px-3 py-1.5 font-display text-xs font-semibold text-slap-strong ring-1 ring-slap/15 ring-inset">
        <span aria-hidden>😬</span>
        {overline}
      </span>

      <h2 className="mt-3 font-display text-2xl font-bold text-balance sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed font-medium text-muted text-pretty">
        {body}
      </p>

      <Button variant="secondary" className="mt-7" onClick={onRetry}>
        Try again
      </Button>
    </motion.div>
  );
}
