import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Hind } from "next/font/google";
import Link from "next/link";

import { IconSearch } from "@/components/icons";
import { OutboxSender } from "@/components/offline/outbox-sender";
import { SiteFoot } from "@/components/site-foot";
import { SiteNav, TabBar } from "@/components/site-nav";
import { KmStone } from "@/components/ui";

import "./globals.css";

const display = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const body = Hind({
  variable: "--font-hind",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rideplanner.in"),
  title: { default: "Meel · dated facts for Indian motorcycle routes", template: "%s · Meel" },
  description:
    "Fuel gaps, permits, passes and night halts for fifty Indian motorcycle routes. Every fact shows where it came from and when it was last confirmed.",
  applicationName: "Meel",
  openGraph: { siteName: "Meel", type: "website", locale: "en_IN" },
  // Big picture cards when a link is shared. Meel's own card is src/app/opengraph-image.tsx.
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#16201c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to the page
        </a>

        <header className="site-head sticky top-0 z-30 border-b border-line bg-surface">
          <div className="site-bar mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
            <Link href="/" className="flex items-center gap-2" aria-label="Meel, all routes">
              <KmStone cap="" value="M" unit="" size="sm" />
              <span className="display text-[1.375rem] tracking-wide uppercase">Meel</span>
            </Link>
            <form action="/" role="search" className="relative ml-3 hidden w-72 lg:block">
              <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-2" />
              <input
                type="search"
                name="q"
                aria-label="Search a route or place"
                placeholder="Search a route or place"
                className="field-input !min-h-10 !py-1.5 !pl-9 text-sm"
              />
            </form>
            <div id="head-slot" className="ml-auto hidden items-center gap-2 lg:flex" />
            <SiteNav />
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 md:pb-12">
          {children}
        </main>

        <SiteFoot />

        <TabBar />
        <OutboxSender />
        {/* Counts page views on Vercel: no cookies, nothing that names a rider. Sends nothing in development. */}
        <Analytics />
      </body>
    </html>
  );
}
