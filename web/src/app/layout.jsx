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

export const metadata = {
  title: "myNeta",
  description:
    "Find the Chief Minister for wherever you're standing, read their record, and register a verdict.",
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
