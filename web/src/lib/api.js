import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
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
