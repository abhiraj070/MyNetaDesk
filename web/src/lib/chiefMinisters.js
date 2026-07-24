/**
 * Search helper for the flat list of 31 Chief Ministers -- much simpler than
 * ministries' fragment-splitting (`buildMinistryEntries`/`searchMinistries`),
 * since each CM has exactly one state, one party, one designation, with no
 * portfolio parsing needed.
 */
import { normalize } from "./ministries";

function scoreCm(cm, queryTokens, joined) {
  const nameTokens = normalize(cm.name).split(" ").filter(Boolean);
  const stateTokens = normalize(cm.state).split(" ").filter(Boolean);
  const partyTokens = normalize(cm.party).split(" ").filter(Boolean);

  let score = 0;
  for (const token of queryTokens) {
    if (nameTokens.some((t) => t.startsWith(token))) score += 3;
    else if (stateTokens.some((t) => t.startsWith(token))) score += 2;
    else if (partyTokens.some((t) => t.startsWith(token))) score += 1;
    else return null;
  }

  // A state that literally starts with what was typed belongs on top.
  if (normalize(cm.state).startsWith(joined)) score += 5;
  return score;
}

export function searchCms(cms, query) {
  const normalized = normalize(query);
  if (!normalized) return cms;

  const tokens = normalized.split(" ").filter(Boolean);
  const scored = [];

  for (const cm of cms) {
    const score = scoreCm(cm, tokens, normalized);
    if (score !== null) scored.push({ cm, score });
  }

  scored.sort((a, b) => b.score - a.score || a.cm.state.localeCompare(b.cm.state));
  return scored.map((s) => s.cm);
}
