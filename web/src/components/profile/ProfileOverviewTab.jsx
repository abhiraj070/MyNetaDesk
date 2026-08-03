"use client";

import { motion } from "framer-motion";
import {
  ChevronRight,
  Compass,
  Landmark,
  Scale,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "../ui/Badge";
import { atAGlanceMetrics, quickInsights } from "@/lib/profile";
import { useTranslation } from "@/lib/i18n";
import { SPRING_POP } from "@/lib/motion";

const METRIC_ICON = {
  party: Landmark,
  place: Compass,
  verdict: Scale,
  assets: Wallet,
};

/**
 * Overview: just the fast-read stack — hero, at-a-glance metrics, quick
 * insights. The Political Journey and Manifesto preview sections that used
 * to live here were cut; those tabs are one tap away on their own, and this
 * tab is meant to be readable in a glance, not a table of contents for the
 * other two.
 */
export function ProfileOverviewTab({ subject, onOpenAssets }) {
  const { t } = useTranslation();
  const metrics = atAGlanceMetrics(subject, t);
  const insights = quickInsights(subject, t);

  return (
    <div className="space-y-6 pb-6">
      <Hero subject={subject} />

      <section>
        <h3 className="eyebrow">{t("profile.atAGlance")}</h3>
        <div className="mt-2.5 grid grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.key}
              metric={metric}
              onClick={metric.tappable ? onOpenAssets : undefined}
            />
          ))}
        </div>
      </section>

      {insights.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-brand-strong" strokeWidth={2.25} />
            <h3 className="eyebrow">{t("profile.quickInsights")}</h3>
          </div>
          <ul className="mt-2.5 space-y-2">
            {insights.map((line) => (
              <li
                key={line}
                className="rounded-card bg-surface-2 px-4 py-3 text-sm leading-relaxed font-medium text-ink ring-1 ring-ink/5"
              >
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Hero({ subject }) {
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

function MetricCard({ metric, onClick }) {
  const Icon = METRIC_ICON[metric.key] ?? Landmark;
  // Both branches are motion components (never a plain string tag) so
  // `whileHover`/`whileTap` are always valid props, even on the
  // non-interactive cards where they're passed as `undefined`.
  const Tag = onClick ? motion.button : motion.div;

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      whileHover={onClick ? { y: -2 } : undefined}
      transition={SPRING_POP}
      className={`flex flex-col gap-2 rounded-card bg-surface p-3.5 text-left shadow-card ring-1 ring-ink/5 ${
        onClick ? "transition-shadow hover:shadow-lift" : ""
      }`}
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-brand-wash text-brand-strong">
        <Icon className="size-4" strokeWidth={2.25} />
      </span>
      <span>
        <span className="block text-[11px] leading-tight font-semibold text-muted">
          {metric.label}
        </span>
        <span className="mt-0.5 block truncate font-display text-sm font-bold text-ink">
          {metric.value}
        </span>
      </span>
      {metric.key === "verdict" && (metric.slap > 0 || metric.rose > 0) && (
        <VerdictBar slap={metric.slap} rose={metric.rose} />
      )}
      {metric.tappable && <TapHint />}
    </Tag>
  );
}

/** The "this is interactive" affordance the Declared Assets card needs. */
function TapHint() {
  const { t } = useTranslation();

  return (
    <span className="mt-0.5 flex items-center gap-0.5 text-[11px] font-semibold text-brand-strong">
      {t("profile.tapForDetails")}
      <ChevronRight className="size-3" strokeWidth={2.5} />
    </span>
  );
}

function VerdictBar({ slap, rose }) {
  const total = slap + rose || 1;
  const slapShare = (slap / total) * 100;
  return (
    <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-rule">
      <motion.span
        className="h-full bg-slap"
        initial={{ width: 0 }}
        animate={{ width: `${slapShare}%` }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      />
      <motion.span
        className="h-full bg-laurel"
        initial={{ width: 0 }}
        animate={{ width: `${100 - slapShare}%` }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      />
    </span>
  );
}
