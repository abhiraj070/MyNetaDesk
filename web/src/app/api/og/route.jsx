import { ImageResponse } from "next/og";

import {
  BRAND,
  CACHE_STATIC,
  OG_SIZE,
  Wordmark,
  fetchImageDataUrl,
  loadFonts,
} from "./_shared";

export const runtime = "nodejs";

/**
 * `GET /api/og?name=&sub=&place=&photo=` — a dedicated, on-brand 1200×630 social
 * card for one politician. Reads only its query string (no DB query): the
 * homepage's `generateMetadata` resolves the politician once and passes the
 * display fields through here, so a crawler hit renders straight from the URL.
 *
 * The photo is the hero. If it can't be fetched we still render a branded card
 * rather than failing — but the homepage prefers the default poster when a
 * politician has no photo at all, so this path is the belt-and-suspenders case.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get("name") || "This leader").slice(0, 60);
  const sub = (searchParams.get("sub") || "").slice(0, 48);
  const place = (searchParams.get("place") || "").slice(0, 48);
  const photo = searchParams.get("photo") || "";

  const [fonts, img] = await Promise.all([loadFonts(), fetchImageDataUrl(photo)]);

  // Long names would overflow the fixed-width text column — step the display
  // size down so the name always fits on at most two lines.
  const nameSize = name.length > 24 ? 48 : name.length > 16 ? 58 : 68;

  return new ImageResponse(
    (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "row",
      position: "relative",
      overflow: "hidden",
      fontFamily: "Nunito",
      padding: "54px 58px",

      backgroundImage: `
      radial-gradient(circle at 78% 40%, rgba(255,183,77,0.22) 0%, transparent 32%),
      radial-gradient(circle at 15% 85%, rgba(0,212,181,0.10) 0%, transparent 28%),
      linear-gradient(
      135deg,
      #07142F 0%,
      #0F2352 42%,
      #142F68 72%,
      #091833 100%
      )
      `,
    }}
  >
    {/* Grid */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.05,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)",
        backgroundSize: "52px 52px",
      }}
    />

    {/* Background Glows */}
    <div
      style={{
        position: "absolute",
        top: -120,
        right: -80,
        width: 320,
        height: 320,
        borderRadius: "50%",
        background: "rgba(255,181,46,.12)",
        filter: "blur(70px)",
      }}
    />

    <div
      style={{
        position: "absolute",
        bottom: -120,
        left: -80,
        width: 260,
        height: 260,
        borderRadius: "50%",
        background: "rgba(0,212,181,.12)",
        filter: "blur(60px)",
      }}
    />

    {/* Trending Badge */}
    <div
      style={{
        position: "absolute",
        top: 40,
        right: 40,
        display: "flex",
        alignItems: "center",
        padding: "10px 18px",
        borderRadius: 999,
        background: "rgba(255,181,46,.15)",
        border: "1px solid rgba(255,181,46,.35)",
        color: "#FFD36E",
        fontSize: 20,
        fontWeight: 900,
      }}
    >
      🔥 Trending
    </div>

    {/* LEFT */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: 560,
        height: "100%",
        padding: "42px",
        borderRadius: 34,
        background: "rgba(255,255,255,.04)",
        border: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <Wordmark size={34} />

      {sub ? (
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            marginTop: 28,
            padding: "10px 22px",
            borderRadius: 999,
            background: "rgba(0,212,181,.12)",
            border: "2px solid rgba(0,212,181,.45)",
            color: BRAND.cream,
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 0.5,
          }}
        >
          {sub}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          marginTop: 24,
          fontFamily: "Fredoka",
          fontSize: nameSize,
          color: BRAND.cream,
          lineHeight: 1.02,
          textShadow: "0 10px 28px rgba(0,0,0,.45)",
        }}
      >
        {name}
      </div>

      {place ? (
        <div
          style={{
            display: "flex",
            marginTop: 14,
            fontSize: 28,
            color: "#C8D4EF",
          }}
        >
          {place}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          marginTop: 22,
          fontSize: 20,
          color: "#8FB0E4",
        }}
      >
        India's most chaotic political platform.
      </div>

      <div
        style={{
          display: "flex",
          alignSelf: "flex-start",
          alignItems: "center",
          marginTop: 30,
          padding: "14px 24px",
          borderRadius: 999,
          background: "rgba(255,181,46,.12)",
          border: "2px solid rgba(255,181,46,.28)",
          color: BRAND.saffron,
          fontSize: 26,
          fontWeight: 900,
        }}
      >
        🌹 Rose or 👋 Slap? You decide.
      </div>
    </div>

    {/* RIGHT */}
    <div
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Portrait Glow */}
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,181,46,.30), transparent 72%)",
          filter: "blur(35px)",
        }}
      />

      {/* Accent Card */}
      <div
        style={{
          position: "absolute",
          width: 470,
          height: 480,
          borderRadius: 40,
          backgroundColor: BRAND.saffron,
          transform: "rotate(2deg) translate(12px,12px)",
          opacity: 0.95,
        }}
      />

      {/* Main Image */}
      <div
        style={{
          display: "flex",
          width: 470,
          height: 480,
          borderRadius: 40,
          overflow: "hidden",
          border: `8px solid ${BRAND.cream}`,
          backgroundColor: BRAND.navy2,
          boxShadow: "0 28px 70px rgba(0,0,0,.42)",
        }}
      >
        {img ? (
          <img
            src={img}
            width={470}
            height={480}
            style={{
              width: 470,
              height: 480,
              objectFit: "cover",
            }}
            alt=""
          />
        ) : (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 150,
            }}
          >
            🧑‍⚖️
          </div>
        )}
      </div>
    </div>
  </div>
),
    {
      ...OG_SIZE,
      fonts,
      headers: { "Cache-Control": CACHE_STATIC },
    },
  );
}
