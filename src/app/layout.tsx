import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, Fraunces } from "next/font/google";
import "./globals.css";

// Fallback for the --font-heading/--font-body chain in globals.css, which
// puts the real system-font stack (-apple-system/BlinkMacSystemFont, so
// macOS/iOS actually render San Francisco, Segoe UI on Windows) first —
// Inter only renders on platforms with neither (Android, Linux, older
// browsers). Loaded once, used everywhere, so the whole app — marketing
// site, every auth screen, onboarding, every dashboard — reads as one
// consistent typeface rather than mixing display faces per page.
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
