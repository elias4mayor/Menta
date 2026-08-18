import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, Fraunces } from "next/font/google";
import "./globals.css";

// Single clean grotesk for every heading and body across the whole site —
// the closest free equivalent to Apple/Nike's own system sans (SF Pro /
// Helvetica Neue), used everywhere on purpose so the site reads as one
// consistent, minimal typeface rather than mixing display faces per page.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400", "500"],
});

const TITLE = "MENTA — Build the Athlete. Build the Mind.";
const DESCRIPTION =
  "MENTA is the AI-powered Athlete Operating System — one platform for film, training, recruiting, academics, and more.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "MENTA",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plexMono.variable} ${fraunces.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text-1">
        {children}
      </body>
    </html>
  );
}
