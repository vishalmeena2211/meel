import type { Metadata } from "next";
import Link from "next/link";

import { HomeViewButton } from "@/components/home-view-button";
import { JsonLd } from "@/components/json-ld";
import { RouteBrowser, type RoadLine } from "@/components/route-browser";
import { TopHead } from "@/components/shell";
import { getAllRoutes, getIndex } from "@/lib/content";
import { SITE_LINE, SITE_NAME, SITE_URL } from "@/lib/site";
import { confirmedLately } from "@/server/reports";

// The count of facts confirmed this week is worked out when the page is built, not live. It is built again hourly.
export const revalidate = 3600;

// The title is the site's own, from the layout. Only the address is said here.
export const metadata: Metadata = { alternates: { canonical: "/" } };

/** A road thinned to a few dozen points. Enough to draw its shape on the front page. */
function thin(line: [number, number][], keep = 28): [number, number][] {
  if (line.length <= keep) return line.map((p) => [round(p[0]), round(p[1])]);
  const step = (line.length - 1) / (keep - 1);
  const out: [number, number][] = [];
  for (let i = 0; i < keep; i += 1) {
    const p = line[Math.round(i * step)];
    if (p) out.push([round(p[0]), round(p[1])]);
  }
  return out;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export default async function HomePage() {
  const [index, routes] = await Promise.all([getIndex(), getAllRoutes()]);
  const full = index.routes.filter((r) => r.level === "full").length;
  const lines: RoadLine[] = routes.map((r) => ({ slug: r.slug, line: thin(r.line) }));
  // Until a route is written in full, the count of regions says more than "none written in full yet" does.
  const sub = `${index.routes.length} routes · ${full === 0 ? `${index.regions.length} regions` : `${full} written in full`}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Tells search engines what the site is, and that its search takes ?q=, as the header's search does. */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          alternateName: "rideplanner.in",
          url: `${SITE_URL}/`,
          description: `${SITE_LINE}. Fuel gaps, permits, passes and night halts, each with its source and the day it was last confirmed.`,
          inLanguage: "en-IN",
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/?q={search_term_string}` },
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <TopHead title="Meel" sub={sub} right={<HomeViewButton />} />
      <section className="flex flex-col gap-2">
        <p role="heading" aria-level={1} className="display hidden text-5xl uppercase md:block">
          Every fact has a date
        </p>
        <p className="max-w-[60ch] text-[0.9375rem]">
          Dated facts for Indian motorcycle routes. Every fact shows who confirmed it, and when.{" "}
          <Link className="link" href="/about">
            How far to trust it
          </Link>
        </p>
      </section>

      <RouteBrowser
        routes={index.routes}
        regions={index.regions}
        lines={lines}
        confirmed={await confirmedLately()}
      />
    </div>
  );
}
