import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
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
