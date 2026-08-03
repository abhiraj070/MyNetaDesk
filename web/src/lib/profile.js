import { manifestoPoints } from "./manifesto";

/**
 * Derives everything the Politician Profile sheet needs from a `subject`
 * (the same shape `RepresentativeCard` renders) — purely computed from
 * fields the API actually returns. There is currently no affidavit data
 * (assets, liabilities, criminal cases) or multi-election history anywhere
 * in the backend, so nothing here invents numbers for those: callers get an
 * explicit `null`/empty result and render an honest "not available" state
 * instead of a fabricated one.
 */

function titleCase(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/(?:^|[\s-])\S/g, (character) => character.toUpperCase());
}

/** The one real "place" fact a subject has: a CM's state, a minister's portfolio. */
export function placeOf(subject) {
  if (!subject) return null;
  if (subject.tier === "minister") return subject.portfolio || subject.ministry || null;
  return subject.state ? titleCase(subject.state) : null;
}

export function placeLabelOf(subject) {
  return subject?.tier === "minister" ? "Portfolio" : "State";
}

/**
 * The real, always-on-record metrics for the "At a Glance" grid, plus a
 * "Declared Assets" card — deliberately not the Assets/Liabilities/Criminal
 * Cases/Experience set the original design brief sketched, since none of
 * that exists in the data yet (see module docstring). The assets card is
 * always tappable: it opens the full breakdown sheet, which is honest about
 * there being no affidavit on file rather than hiding the interaction.
 */
export function atAGlanceMetrics(subject) {
  if (!subject) return [];
  const place = placeOf(subject);

  return [
    { key: "party", label: "Current Party", value: subject.party || "Not on record" },
    { key: "place", label: placeLabelOf(subject), value: place || "Not on record" },
    {
      key: "verdict",
      label: "Public Verdict",
      value: `${Number(subject.slap_count ?? 0).toLocaleString("en-IN")} 👋 · ${Number(subject.rose_count ?? 0).toLocaleString("en-IN")} 🌹`,
      slap: Number(subject.slap_count ?? 0),
      rose: Number(subject.rose_count ?? 0),
    },
    {
      key: "assets",
      label: "Declared Assets",
      value: "Tap to view breakdown",
      tappable: true,
    },
  ];
}

/**
 * Field groups for the asset breakdown sheet, mirroring the two top-level
 * totals a real election affidavit reports (Movable / Immovable) with their
 * usual sub-items, plus the summary pair and a catch-all "Other" bucket.
 * Every value is `null` today — see `assetBreakdown` below — but the shape
 * is exactly what a future affidavit record will populate, so wiring in
 * real data later is a matter of filling these fields, not redesigning them.
 */
export const ASSET_FIELD_GROUPS = [
  {
    key: "movable",
    label: "Movable Assets",
    totalKey: "movableAssets",
    fields: [
      { key: "cash", label: "Cash in Hand" },
      { key: "bankDeposits", label: "Bank Deposits" },
      { key: "sharesInvestments", label: "Shares / Investments" },
      { key: "mutualFunds", label: "Mutual Funds" },
      { key: "jewellery", label: "Jewellery" },
      { key: "vehicles", label: "Vehicles" },
    ],
  },
  {
    key: "immovable",
    label: "Immovable Assets",
    totalKey: "immovableAssets",
    fields: [
      { key: "residentialProperty", label: "Residential Property" },
      { key: "commercialProperty", label: "Commercial Property" },
      { key: "agriculturalLand", label: "Agricultural Land" },
    ],
  },
  {
    key: "other",
    label: "Other",
    fields: [{ key: "otherAssets", label: "Other Declared Assets" }],
  },
];

/**
 * The full declared-wealth breakdown for a subject's latest affidavit.
 * Nothing populates this yet — there is no affidavit source wired up (see
 * module docstring) — so every field is explicitly `null` rather than a
 * guessed or zeroed value; `hasData` lets the UI distinguish "on file but
 * zero" from "not on file" the moment a real source lands.
 */
export function assetBreakdown(_subject) {
  return {
    hasData: false,
    totalAssets: null,
    totalLiabilities: null,
    movableAssets: null,
    immovableAssets: null,
    cash: null,
    bankDeposits: null,
    sharesInvestments: null,
    mutualFunds: null,
    jewellery: null,
    vehicles: null,
    residentialProperty: null,
    commercialProperty: null,
    agriculturalLand: null,
    otherAssets: null,
  };
}

/**
 * 2–3 short factual sentences, each derived from a field the API actually
 * returns. Nothing here is an opinion or a guess — an insight that would
 * require history we don't have (term count, party-switch history, wealth
 * growth) is simply never generated.
 */
export function quickInsights(subject) {
  if (!subject) return [];
  const insights = [];
  const slaps = Number(subject.slap_count ?? 0);
  const roses = Number(subject.rose_count ?? 0);

  if (slaps > 0 || roses > 0) {
    if (roses > slaps) {
      insights.push("Getting more 🌹 roses than 👋 slaps from voters right now.");
    } else if (slaps > roses) {
      insights.push("Getting more 👋 slaps than 🌹 roses from voters right now.");
    } else {
      insights.push("Slaps and roses are running dead even right now.");
    }
  }

  const points = manifestoPoints(subject);
  if (points.length > 0) {
    insights.push(
      `${subject.party || "Their party"} has ${points.length} manifesto commitment${points.length === 1 ? "" : "s"} on record.`,
    );
  }

  const place = placeOf(subject);
  if (place && subject.tier === "cm") {
    insights.push(`Currently the Chief Minister of ${place}.`);
  } else if (place && subject.tier === "minister") {
    insights.push(`Currently holds the ${place} portfolio.`);
  }

  return insights.slice(0, 3);
}

/** First `count` manifesto points, for the Overview tab's compact preview. */
export function manifestoPreview(subject, count = 2) {
  return manifestoPoints(subject).slice(0, count);
}

/**
 * The single real milestone we can show in the Political Journey timeline:
 * their current position. No year — we don't have a "since" date — and no
 * financials, since there's no affidavit data on file.
 */
export function currentJourneyEntry(subject) {
  if (!subject) return null;
  return {
    role:
      subject.tier === "minister"
        ? subject.rank_title || subject.designation || "Union Minister"
        : subject.designation || "Chief Minister",
    party: subject.party || null,
    place: placeOf(subject),
    placeLabel: placeLabelOf(subject),
  };
}
