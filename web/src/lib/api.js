import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

const LANGUAGE_STORAGE_KEY = "mynetaji:language";

/**
 * Reads the active language straight from storage rather than importing it
 * from the React context: this runs inside an axios interceptor, outside the
 * component tree, and storage is the same source of truth the context reads.
 * That avoids a second copy of the value that could drift out of sync.
 */
function activeLanguage() {
  if (typeof window === "undefined") return "en";
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en";
  } catch {
    return "en";
  }
}

/**
 * Attaches the active language to every request in one place, rather than
 * threading a `lang` argument through all eleven call sites.
 *
 * The backend takes `lang` as a query param on GET and a body field on POST,
 * and defaults to English when absent — so this is additive and an endpoint
 * that ignores it is unaffected.
 */
api.interceptors.request.use((config) => {
  const lang = activeLanguage();
  const method = (config.method ?? "get").toLowerCase();

  if (method === "get") {
    config.params = { ...(config.params ?? {}), lang };
  } else if (config.data && typeof config.data === "object") {
    config.data = { ...config.data, lang };
  }
  return config;
});

/**
 * Turns an axios failure into a sentence we're willing to show a user.
 * The FastAPI handlers wrap everything into `{ detail: "..." }`, so we prefer
 * that when present and fall back to the transport-level reason.
 */
export function toFriendlyError(error) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (error.code === "ECONNABORTED") {
      return "The server took too long to answer. Give it another go?";
    }
    if (!error.response) {
      return "Couldn't reach the server. Is the API running?";
    }
    return `Server responded with ${error.response.status}.`;
  }
  return "Something unexpected went wrong.";
}

/**
 * `POST /get-cm-location` — resolves a GPS point to the Chief Minister of
 * whichever state contains it (via the existing parliamentary-constituency
 * polygons, purely to read off `state_key` — no new boundary data). Returns
 * `{ cm }`; `cm` is null when the point falls outside every stored boundary.
 */
export async function fetchCmLocation({ latitude, longitude }) {
  const { data } = await api.post("/get-cm-location", { latitude, longitude });
  return data;
}

const LEADERBOARD_PATH = {
  cm: "/get-leaderboard-cm",
  minister: "/get-leaderboard-minister",
};

/**
 * `GET /get-leaderboard-{tier}?limit=&offset=` — rows by slap count and by
 * rose count, one page at a time.
 *
 * The backend filters counts > 0, so an empty response is a genuine "nobody's
 * been voted on yet" signal rather than sparse data. Note `offset` is
 * 1-indexed on this API — `offset=0` is rejected (422) — so the first page
 * must be requested with `offset: 1`, not 0.
 */
export async function fetchLeaderboard(tier, { limit = 10, offset = 1 } = {}) {
  const path = LEADERBOARD_PATH[tier];
  if (!path) throw new Error(`Unknown leaderboard tier: ${tier}`);
  const { data } = await api.get(path, { params: { limit, offset } });
  return {
    slapToppers: Array.isArray(data?.slap_toppers) ? data.slap_toppers : [],
    roseToppers: Array.isArray(data?.rose_toppers) ? data.rose_toppers : [],
  };
}

/**
 * `POST /get-minister` with no name — returns the whole council of ministers.
 *
 * Fetched once so the ministry picker can filter locally: 90 rows is a small
 * payload, and it keeps type-ahead instant with no request per keystroke.
 */
export async function fetchMinisters() {
  const { data } = await api.post("/get-minister", {});
  return Array.isArray(data?.ministers) ? data.ministers : [];
}

const COLUMN_FOR_CHOICE = { slap: "slap_count", rose: "rose_count" };

/**
 * `POST /get-cm` with no `state_key` — returns all 31 chief ministers.
 *
 * Fetched once so the CM picker can filter locally, the same way the ministry
 * picker already does — 31 rows is trivial to hold client-side.
 */
export async function fetchCms() {
  const { data } = await api.post("/get-cm", {});
  return Array.isArray(data?.cms) ? data.cms : [];
}

/**
 * `POST /get-cm` with a `state_key` — the full record for one Chief Minister.
 * Used both to open a leaderboard row as a full profile and by the CM picker
 * when a search result is chosen. Returns `{ cm_details }`, `null` when
 * nothing matches.
 */
export async function fetchCmByStateKey(stateKey) {
  const { data } = await api.post("/get-cm", { state_key: stateKey });
  return data?.cm_details ?? null;
}

/**
 * `PATCH /update-cm-count` — increments a Chief Minister's slap or rose
 * tally by one. The API identifies the row by (state_key, name) — exactly
 * one CM per state, so this is never ambiguous.
 */
export async function castCmVote({ name, stateKey, choice }) {
  const { data } = await api.patch("/update-cm-count", {
    name_field_to_update: name,
    state_key: stateKey,
    field_to_update: COLUMN_FOR_CHOICE[choice],
  });
  return data;
}

/**
 * `POST /feedback` — records app feedback: a reaction plus a short note. The UI
 * carries the reaction lowercase ("slap"/"rose"); the API's enum is uppercase,
 * so we normalise here.
 */
export async function sendFeedback({ reaction, message }) {
  const { data } = await api.post("/feedback", {
    reaction: String(reaction).toUpperCase(),
    message,
  });
  return data;
}

/**
 * `POST /get-ministers-by-name` — the full record for one minister, identified
 * by (name, ministry) — `ministry` must be the row's full original portfolio
 * string, same convention as `castMinistryVote`. Returns `{ minister_details }`,
 * `null` when nothing matches.
 */
export async function fetchMinisterByName({ name, ministry }) {
  const { data } = await api.post("/get-ministers-by-name", { name, ministry });
  return data?.minister_details ?? null;
}

/**
 * `PATCH /update-ministry-count` — the ministers table has its own endpoint.
 *
 * `ministryName` must be the row's full, original `ministry` string (the whole
 * semicolon-joined portfolio), not the single ministry label shown in the UI —
 * the handler matches on it exactly.
 */
export async function castMinistryVote({ name, ministryName, choice }) {
  const { data } = await api.patch("/update-ministry-count", {
    name_field_to_update: name,
    ministry_name: ministryName,
    field_to_update: COLUMN_FOR_CHOICE[choice],
  });
  return data;
}

const HIGHLIGHT_ENDPOINTS = [
  { slot: "slapped", path: "/most-slapped", key: "most_slapped" },
  { slot: "loved", path: "/most-roasted", key: "most_roasted" },
  { slot: "judged", path: "/most-judged", key: "most_judged" },
];

/**
 * `GET /most-slapped`, `/most-roasted`, `/most-judged` — today's leader for
 * each counter, across both tiers.
 *
 * Fetched with `allSettled` rather than `all` so one endpoint being down can
 * only empty its own tile; the other two still render their data. Each slot
 * comes back as `{ data, failed }`, where `data: null` is the server's honest
 * "nobody has been slapped yet today" answer and `failed: true` is a transport
 * or server error. The two stay distinct because they read very differently to
 * a user.
 *
 * A row carries `tier` ("cm" | "minister") and a normalised `count`. The name
 * is under `name` for a Chief Minister and `minister_name` for a Union
 * Minister, matching the rest of this API.
 */
export async function fetchHighlights() {
  const settled = await Promise.allSettled(
    HIGHLIGHT_ENDPOINTS.map(({ path }) => api.get(path)),
  );

  return HIGHLIGHT_ENDPOINTS.reduce((slots, { slot, key }, index) => {
    const result = settled[index];
    slots[slot] =
      result.status === "fulfilled"
        ? { data: result.value.data?.[key] ?? null, failed: false }
        : { data: null, failed: true };
    return slots;
  }, {});
}

/**
 * `GET /tweets` — recent X posts about one representative. The backend looks up
 * their stored `x_username`, queries the X API's recent-search endpoint, and
 * returns the raw v2 payload under `{ top_tweets }`.
 *
 * The endpoint identifies the subject by `(table, name)`, carried in the
 * request body — matching the backend's `TweetRequest`. `table` is the physical
 * table name, mapped here from the app-level `tier`.
 */
export async function fetchTweets({ tier, name }) {
  const table = tier === "cm" ? "chief_ministers" : "ministers";
  const { data } = await api.post("/tweets", { table, name });
  const payload = data?.top_tweets ?? {};

  // The endpoint forwards the X API's own body verbatim with a 200, so an X-side
  // failure (402 credits depleted, 401 auth, 429 rate limit) arrives as a
  // *payload*, not an HTTP error. Detect that shape — an X "problem" object or
  // `errors[]` with no `data`/`meta` — and throw, so the UI shows "couldn't
  // load" with Retry rather than a misleading "no posts yet". A genuinely empty
  // result (`data: []` or a `meta` with zero count) falls through to normalise.
  const hasData = Array.isArray(payload.data);
  const hasMeta = Boolean(payload.meta);
  const looksLikeError =
    !hasData &&
    !hasMeta &&
    (payload.status >= 400 ||
      typeof payload.type === "string" ||
      Array.isArray(payload.errors));
  if (looksLikeError) {
    throw new Error(payload.detail || payload.title || "Couldn't reach X");
  }

  return normalizeTweets(payload);
}

/** `[{id, ...}]` → `{ [id]: {...} }` for O(1) expansion lookups. */
function indexBy(list, key) {
  const map = {};
  for (const item of list ?? []) map[item[key]] = item;
  return map;
}

function normalizeAuthor(user) {
  if (!user) return null;
  return {
    name: user.name ?? null,
    username: user.username ?? null,
    // The `_normal` variant X returns is a 48px thumbnail; dropping the suffix
    // gives the full-resolution original for a crisp avatar.
    avatar: user.profile_image_url?.replace("_normal", "") ?? null,
    verified: Boolean(user.verified),
    verifiedType: user.verified_type ?? null,
  };
}

function normalizeMedia(m) {
  return {
    key: m.media_key,
    type: m.type, // "photo" | "video" | "animated_gif"
    url: m.url ?? m.preview_image_url ?? null,
    preview: m.preview_image_url ?? m.url ?? null,
    alt: m.alt_text ?? "",
    width: m.width ?? null,
    height: m.height ?? null,
  };
}

/**
 * Flattens X's `data` + `includes` (users/media/referenced tweets) into a
 * self-contained tweet object the UI can render without cross-referencing.
 * Every expansion is optional: a payload without `includes` (the backend
 * currently requests none) degrades to text-only tweets rather than throwing.
 */
export function normalizeTweets(payload) {
  const raw = payload ?? {};
  const users = indexBy(raw.includes?.users, "id");
  const media = indexBy(raw.includes?.media, "media_key");
  const tweets = indexBy(raw.includes?.tweets, "id");
  const list = Array.isArray(raw.data) ? raw.data : [];

  const resolveMedia = (keys) =>
    (keys ?? []).map((k) => media[k]).filter(Boolean).map(normalizeMedia);

  return list.map((t) => {
    const metrics = t.public_metrics ?? {};
    const quotedRef = (t.referenced_tweets ?? []).find(
      (r) => r.type === "quoted",
    );
    const quotedRaw = quotedRef ? tweets[quotedRef.id] : null;

    return {
      id: t.id,
      text: t.text ?? "",
      createdAt: t.created_at ?? null,
      author: normalizeAuthor(users[t.author_id]),
      urls: t.entities?.urls ?? [],
      media: resolveMedia(t.attachments?.media_keys),
      metrics: {
        replies: metrics.reply_count ?? 0,
        // X's repost affordance folds retweets and quotes into one count.
        reposts: (metrics.retweet_count ?? 0) + (metrics.quote_count ?? 0),
        likes: metrics.like_count ?? 0,
        bookmarks: metrics.bookmark_count ?? 0,
        views: metrics.impression_count ?? 0,
      },
      quoted: quotedRaw
        ? {
            id: quotedRaw.id,
            text: quotedRaw.text ?? "",
            createdAt: quotedRaw.created_at ?? null,
            author: normalizeAuthor(users[quotedRaw.author_id]),
            urls: quotedRaw.entities?.urls ?? [],
            media: resolveMedia(quotedRaw.attachments?.media_keys),
          }
        : null,
    };
  });
}

/**
 * The identity payload both journey endpoints take, matching the backend's
 * `GetAssetsRequest`. The task specifies name + designation; `party` is also
 * declared required on that Pydantic model, so omitting it fails validation
 * with a 422 before the handler runs — it is sent for that reason alone.
 *
 * `designation` mirrors the label the profile sheet already shows: a minister's
 * rank title, a Chief Minister's designation.
 */
function identityPayload(subject) {
  // `designation` is matched against `politicians.subject_type` on the backend,
  // so it carries that column's values rather than a human-readable title —
  // sending "Chief Minister of Maharashtra" matches nothing and returns an
  // empty list rather than an error.
  const designation = subject?.tier === "minister" ? "union_minister" : "cm";

  return {
    // The ENGLISH name, never the displayed one. `politicians.canonical_name`
    // is English, so sending the Hindi label a Hindi user sees would match no
    // row and silently return an empty timeline / asset sheet. Endpoints carry
    // `name_en` / `minister_name_en` for exactly this.
    name:
      subject?.name_en ?? subject?.minister_name_en ?? subject?.name ?? "",
    designation,
    party: subject?.party ?? "",
  };
}

/** Rupee figures arrive as numbers or numeric strings; `null` must survive. */
function toAmount(value) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/**
 * `POST /get-timeline` — the politician's career milestones, newest first.
 * Returns `{ timeline: [...] }` with snake_case rows; normalised here into the
 * shape `ProfileJourneyTab` renders.
 *
 * The endpoint returns no constituency, so `place` is deliberately absent —
 * the timeline card already hides that line when it has nothing to show.
 */
export async function fetchTimeline(subject) {
  const { data } = await api.post("/get-timeline", identityPayload(subject));
  const rows = Array.isArray(data?.timeline) ? data.timeline : [];

  return rows
    .map((row) => ({
      year: row.year ?? null,
      startDate: row.start_date ?? null,
      endDate: row.end_date ?? null,
      role: row.position_title ?? null,
      rank: row.position_rank ?? null,
      party: row.party ?? null,
      entryMode: row.entry_mode ?? null,
      isCurrent: Boolean(row.is_current),
      // The column is `sources` (plural) and holds an array of {url, label}.
      sources: Array.isArray(row.sources) ? row.sources.filter((s) => s?.url) : [],
      // Present only for milestones that carry an affidavit — roughly half do,
      // so `null` here is normal and means "no declaration for this term",
      // not a failure.
      totalAssets: toAmount(row.total_assets),
    }))
    .filter((entry) => entry.role)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

/**
 * `POST /get-assets` — every declared-wealth record on file, as
 * `{ top_assets: [...] }`. The Declared Assets sheet shows one breakdown, so
 * the most recent record wins; the rest are returned for callers that want the
 * progression.
 */
export async function fetchAssets(subject) {
  const { data } = await api.post("/get-assets", identityPayload(subject));
  const rows = Array.isArray(data?.top_assets) ? data.top_assets : [];

  return rows
    .map((row) => ({
      electionYear: row.election_year ?? null,
      electionName: row.election_name ?? null,
      sourceUrl: row.source_url ?? null,
      totalAssets: toAmount(row.total_assets),
      totalLiabilities: toAmount(row.total_liabilities),
      movableAssets: toAmount(row.movable_assets),
      immovableAssets: toAmount(row.immovable_assets),
      cash: toAmount(row.cash),
      bankDeposits: toAmount(row.bank_deposits),
      sharesInvestments: toAmount(row.shares_investments),
      mutualFunds: toAmount(row.mutual_funds),
      jewellery: toAmount(row.jewellery),
      vehicles: toAmount(row.vehicles),
      residentialProperty: toAmount(row.residential_property),
      commercialProperty: toAmount(row.commercial_property),
      agriculturalLand: toAmount(row.agricultural_land),
      otherAssets: toAmount(row.other_assets),
    }))
    .sort((a, b) => (b.electionYear ?? 0) - (a.electionYear ?? 0));
}

/**
 * `GET /get-news?lang=…` — the day's political stories, as cached by the
 * six-hourly scheduler. `lang` rides along on the axios interceptor.
 *
 * The endpoint hands back whatever sits in Redis, so this tolerates both an
 * already-decoded array and a JSON string that was never parsed, and maps the
 * provider's field names onto the four things the brief actually renders.
 * Anything without a headline is dropped rather than shown as an empty card.
 */
export async function fetchNews() {
  const { data } = await api.get("/get-news");

  const raw = Array.isArray(data) ? data : data?.news;
  let items = raw;
  if (typeof raw === "string") {
    try {
      items = JSON.parse(raw);
    } catch {
      items = [];
    }
  }
  if (!Array.isArray(items)) return [];

  return items
    .map((article, index) => {
      const described = trimTruncationArtifact(clean(article?.description));
      const contented = trimTruncationArtifact(clean(article?.content));
      const description = described.text;
      const content = contented.text;
      // GNews nests the newsroom in an object rather than sending the flat
      // `source_name`/`source_id` pair the previous provider used.
      const source = article?.source;
      return {
        id: article?.id ?? article?.url ?? `story-${index}`,
        title: clean(article?.title),
        // The preview is deliberately the short field; the detail sheet
        // prefers the longer one and falls back to the same text.
        preview: description || content,
        summary: content || description,
        source: clean(source?.name),
        // GNews sends no per-newsroom icon, so the card's lettered plate is
        // the permanent path rather than a fallback.
        sourceIcon: null,
        image: url(article?.image),
        // Kept as the raw string: the card formats it against the reader's
        // language, which this layer knows nothing about.
        publishedAt: clean(article?.publishedAt) || null,
        // Neither field exists on a GNews article — it sends no category, and
        // its only country is the newsroom's own two-letter code, which would
        // read as "IN" on every card in a feed that is Indian by definition.
        // Left null so the card's chip slot stays empty rather than labelled
        // with something the provider never said.
        category: null,
        country: null,
        url: url(article?.url),
        // The story was cut short by the provider's plan, not by us. The
        // reader panel says so in words and points at the publisher rather
        // than letting the text simply stop mid-sentence.
        isPartial: described.truncated || contented.truncated,
      };
    })
    .filter((story) => story.title);
}

/** Trims a possibly-absent string down to something safe to render. */
function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Free-tier feeds pad truncated bodies with their own bookkeeping — GNews
 * signs off with `... [2772 chars]`, NewsAPI with `[+1234 chars]`. That is
 * metadata about the response, not part of the story, and a reader should
 * never see it.
 *
 * Stripped here at the boundary so no component has to know the provider's
 * habits, and reported back as `truncated` so the reader panel can say the
 * story continues at the publisher instead of just stopping mid-sentence.
 * Whatever dangling punctuation the cut leaves behind is replaced with a
 * single ellipsis, so the text ends deliberately rather than raggedly.
 */
const TRUNCATION_ARTIFACT = /[\s.…]*\[\s*\+?\s*[\d,]+\s*chars?\s*\]\s*$/i;

function trimTruncationArtifact(value) {
  if (!TRUNCATION_ARTIFACT.test(value)) return { text: value, truncated: false };
  const body = value.replace(TRUNCATION_ARTIFACT, "").replace(/[\s.,;:—–-]+$/u, "");
  return { text: body ? `${body}…` : "", truncated: true };
}

/** A URL we're willing to hand to `src`/`href`, or null. */
function url(value) {
  const trimmed = clean(value);
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}
