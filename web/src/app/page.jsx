import { Suspense } from "react";

import { getCmByState, getMinisterByName } from "@/lib/og-data";

import { Home } from "./home";

const SITE = "MyNetaji";

/**
 * Builds the metadata block shared by the politician and leaderboard share
 * cards. `image` is a relative path; `metadataBase` (set in `layout.jsx`) turns
 * it into the absolute HTTPS URL crawlers require. Includes the OpenGraph
 * `type`/`siteName` explicitly so the page's block doesn't drop them.
 */
function buildMeta({ title, description, image, url, alt }) {
  // Declare `type` explicitly: the `/api/og` URL has no file extension, so this
  // tells crawlers it's a JPEG without them having to sniff the URL. `alt`
  // rounds out the tags Twitter/X and Discord look for.
  const altText = alt || title;
  const ogImage = { url: image, width: 1200, height: 630, alt: altText, type: "image/jpeg" };
  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: SITE,
      url,
      title,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt: altText }],
    },
  };
}

/**
 * Short, clean OG image URL — just the identity (`tier` + state/name). The
 * `/api/og` route looks the record up itself (cached), so the URL stays under
 * ~60 chars instead of embedding a long, double-encoded photo URL that strict
 * scrapers (Reddit especially) truncate or reject.
 */
function ogImageUrl(tier, id) {
  const p = new URLSearchParams({ tier });
  p.set(tier === "cm" ? "state" : "name", id);
  return `/api/og?${p.toString()}`;
}

/**
 * Per-share metadata for crawlers. The app deep-links via `/?share=…`, so a
 * shared politician or leaderboard link is server-rendered here with its own
 * `og:image`/`twitter:image` instead of the global poster.
 *
 * Reading `searchParams` opts this route into dynamic rendering — deliberate,
 * and cheap: the default (no `share`) returns `{}` immediately so the root
 * `opengraph-image.jpg` poster still applies. Any missing photo or lookup
 * failure also falls back to that poster, so a preview is never broken.
 */
export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const share = sp.share;

  try {
    if (share === "minister" && sp.name) {
      const m = await getMinisterByName(sp.name);
      if (m?.photo_url) {
        const image = ogImageUrl("minister", m.minister_name);
        return buildMeta({
          title: `${m.minister_name} — Union Minister | ${SITE}`,
          description: `Slap or Rose ${m.minister_name}? Cast your verdict on ${SITE}.`,
          image,
          url: `/?share=minister&name=${encodeURIComponent(m.minister_name)}`,
        });
      }
    } else if (share === "cm" && sp.state) {
      const c = await getCmByState(sp.state);
      if (c?.photo_url) {
        const image = ogImageUrl("cm", c.state_key);
        return buildMeta({
          title: `${c.name} — ${c.designation || "Chief Minister"} · ${c.state} | ${SITE}`,
          description: `Slap or Rose ${c.name}? Cast your verdict on ${SITE}.`,
          image,
          url: `/?share=cm&state=${encodeURIComponent(c.state_key)}`,
        });
      }
    } else if (share === "leaderboard") {
      const tier = sp.tier === "minister" ? "minister" : "cm";
      const board = sp.board === "rose" ? "rose" : "slap";
      const tierLabel = tier === "minister" ? "Union Ministers" : "Chief Ministers";
      return buildMeta({
        title: `${SITE} Leaderboard — ${tierLabel}`,
        description: "See who India is slapping and rosing right now. 👋🌹",
        image: `/api/og/leaderboard?tier=${tier}&board=${board}`,
        url: `/?share=leaderboard&tier=${tier}`,
      });
    }
  } catch {
    // fall through to the default poster
  }

  return {};
}

/**
 * A server shell whose only job is to render the client app.
 *
 * `Home` reads the `?share=` deep link through `useSearchParams()`, which
 * requires a Suspense boundary: everything inside it renders on the client.
 * (This route is now dynamically rendered because `generateMetadata` above
 * reads `searchParams` to build per-share previews — see that comment.)
 */
export default function Page() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}
