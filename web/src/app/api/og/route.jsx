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
          fontFamily: "Nunito",
          padding: "54px 58px",
          backgroundColor: BRAND.navy,
          backgroundImage: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.navy2} 60%, ${BRAND.navy} 100%)`,
        }}
      >
        {/* Left: text column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 560,
            height: "100%",
            paddingRight: 28,
          }}
        >
          <Wordmark size={30} />

          {sub ? (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                marginTop: 28,
                padding: "8px 20px",
                borderRadius: 999,
                border: `2px solid ${BRAND.teal}`,
                color: BRAND.cream,
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              {sub}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              fontFamily: "Fredoka",
              fontSize: nameSize,
              color: BRAND.cream,
              lineHeight: 1.04,
              marginTop: 18,
            }}
          >
            {name}
          </div>

          {place ? (
            <div style={{ display: "flex", fontSize: 30, color: BRAND.muted, marginTop: 12 }}>
              {place}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              fontSize: 27,
              fontWeight: 800,
              color: BRAND.saffron,
              marginTop: 32,
            }}
          >
            🌹 Rose or 👋 Slap? You decide.
          </div>
        </div>

        {/* Right: photo hero */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 470,
              height: 480,
              borderRadius: 46,
              backgroundColor: BRAND.saffron,
              transform: "rotate(4deg)",
            }}
          />
          <div
            style={{
              display: "flex",
              width: 470,
              height: 480,
              borderRadius: 46,
              overflow: "hidden",
              border: `8px solid ${BRAND.cream}`,
              backgroundColor: BRAND.navy2,
            }}
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} width={470} height={480} style={{ width: 470, height: 480, objectFit: "cover" }} alt="" />
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
