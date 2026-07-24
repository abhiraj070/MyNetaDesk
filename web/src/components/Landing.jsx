"use client";

import { motion } from "framer-motion";

import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { SPRING_ENTRANCE, SPRING_POP } from "@/lib/motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: SPRING_ENTRANCE },
};

const PROMISES = [
  { emoji: "🪪", text: "Name, party, and their office" },
  { emoji: "📜", text: "Their record, in plain terms" },
  { emoji: "🤞", text: "Party commitments, where we have them" },
  { emoji: "⚖️", text: "A slap or a rose — one side each" },
];

export function Landing({ onAllowLocation, isBusy }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto grid w-full max-w-5xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:py-24"
    >
      <div>
        <motion.div variants={item}>
          <Badge emoji="⚡" label="Verdicts · India" tone="brand" size="sm" tilt />
        </motion.div>

        <motion.h1
          variants={item}
          className="mt-4 font-display text-5xl leading-[0.98] font-bold text-balance sm:text-6xl lg:text-7xl"
        >
          Slap or Rose?
          <br />
          <span className="bg-linear-to-r from-slap via-slap to-brand bg-clip-text text-transparent">
            You decide.
          </span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-5 max-w-md text-lg leading-relaxed font-medium text-muted text-pretty"
        >
          Read what they promised. Then decide if they deserve a 👋 or 🌹.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-8 flex flex-wrap items-center gap-4"
        >
          <Button onClick={onAllowLocation} disabled={isBusy}>
            {isBusy ? "Finding you…" : "Who's mine? →"}
          </Button>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-faint">
            <span aria-hidden>🔒</span>
            Read once. Never stored.
          </span>
        </motion.div>
      </div>

      <motion.div
        variants={item}
        className="rounded-card bg-surface p-5 shadow-card ring-1 ring-inset ring-ink/5 sm:p-6"
      >
        <div className="flex items-center gap-2">
          <p className="font-display text-sm font-bold text-ink">
            What you&apos;ll see
          </p>
          <Badge emoji="✨" label="Free" tone="brand" size="sm" />
        </div>

        <ul className="mt-3 space-y-2">
          {PROMISES.map((promise) => (
            <motion.li
              key={promise.text}
              whileHover={{ x: 4 }}
              transition={SPRING_POP}
              className="flex items-center gap-3 rounded-control bg-surface-2 px-3.5 py-3 text-sm font-semibold text-ink ring-1 ring-inset ring-ink/5"
            >
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-sm leading-none shadow-sm ring-1 ring-inset ring-ink/5"
              >
                {promise.emoji}
              </span>
              {promise.text}
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}
