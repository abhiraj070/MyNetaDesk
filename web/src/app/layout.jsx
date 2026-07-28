import { Fredoka, Nunito } from "next/font/google";

import { AmbientSparkles } from "@/components/AmbientSparkles";
import { Providers } from "./providers";
import "./globals.css";

/**
 * Two rounded faces, no serif anywhere: Fredoka carries every heading — it's a
 * geometric rounded display cut that reads as confident rather than official —
 * and Nunito handles body copy, keeping the same rounded terminals so the two
 * feel like one family without the headings losing their punch.
 */
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

// Canonical production origin used to turn relative OG/Twitter image paths into
// the absolute HTTPS URLs that scrapers (WhatsApp, etc.) require. Must be the
// live domain that actually serves this deployment: if this points anywhere
// else (e.g. a renamed/old Railway URL), crawlers fetch the OG image from a
// dead host and show no preview. Override with NEXT_PUBLIC_SITE_URL once a
// custom domain (e.g. mynetaji.in) is live.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mynetaji.up.railway.app";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "MyNetaji",
  description:
    "Find the Chief Minister for wherever you're standing, read their record, and register a verdict.",
  openGraph: {
    type: "website",
    siteName: "MyNetaji",
    url: "/",
    title: "Slap Your Leader — MyNetaji",
    description: "India's most chaotic political game. 🌹 Rose or 👋 Slap?",
  },
  twitter: {
    card: "summary_large_image",
    title: "Slap Your Leader — MyNetaji",
    description: "India's most chaotic political game. 🌹 Rose or 👋 Slap?",
  },
};

export const viewport = {
  themeColor: "#f4f5fb",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} h-full`}
    >
      <body className="min-h-full">
        <AmbientSparkles />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
