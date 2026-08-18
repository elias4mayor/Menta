import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono, Fraunces, Oswald } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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

// Condensed, bold athletic grotesk — used for headings inside the logged-in
// app only (see .app-shell in globals.css), for a training-app feel closer
// to what Nike's own apps use. Marketing pages keep Space Grotesk.
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable} ${fraunces.variable} ${oswald.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text-1">
        {children}
      </body>
    </html>
  );
}
