import Link from "next/link";

import { SectionHeading } from "@/components/ui";
import { getAllRoutes } from "@/lib/content";
import { shortRouteName } from "@/lib/search-titles";
import type { Route } from "@/lib/types";
import { getRouteView } from "@/server/route-view";

/*
  Two short lists under the routes on the home page. "Riders are asking": the facts people search Google for most
  (Search Console, October 2026), so a rider who lands on the home page finds them, and search engines see the site
  points at them. "Riding this winter": the routes whose usual season, in their own facts, takes in December or
  January.
*/

const ASKED: Array<[route: string, section: string, fact: string]> = [
  ["north-sikkim", "rules", "north-sikkim-toong-checkpost-cutoff"],
  ["manali-leh", "rules", "lahaul-spiti-e-aagman-vehicle-pass"],
  ["konkan-coast", "rules", "ferry-agardanda-dighi"],
  ["gurez-valley", "rules", "gurez-motorcycles"],
  ["andhra-araku-gandikota", "rules", "gandikota-fort-hours"],
  ["mussoorie-dhanaulti-chakrata", "rules", "mussoorie-mall-road-evening-vehicle-ban"],
  ["goa-gokarna-karnataka-coast", "rules", "goa-rented-motorcycles-licensed-scheme"],
  ["goa-gokarna-karnataka-coast", "rules", "goa-helmet-rider-and-pillion"],
  ["manali-leh", "rules", "ladakh-outside-rental-motorcycles"],
  ["rajasthan-desert", "rules", "tanot-longewala-no-permit-indian-citizens"],
  ["assam-kaziranga-majuli", "rules", "kaziranga-highway-speed-limit"],
  ["guwahati-tawang", "rules", "arunachal-inner-line-permit"],
];

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const RANGE = new RegExp(`(${MONTHS.join("|")})\\s+to\\s+(?:early |mid-|late )?(${MONTHS.join("|")})`, "g");

/** Whether a route's usual season takes in December or January: "October to March", "All year". */
function ridesInWinter(route: Route): boolean {
  const season = route.header.usual_season?.value.toLowerCase();
  if (!season) return false;
  // Only the first part speaks for the whole route: "October to March; Pachmarhi itself is open all year".
  const first = season.split(/[;(]/)[0]!;
  if (/\ball year\b/.test(first)) return true;
  for (const m of first.matchAll(RANGE)) {
    const a = MONTHS.indexOf(m[1]!) + 1;
    const b = MONTHS.indexOf(m[2]!) + 1;
    if (a > b || b === 12 || a === 1) return true;
  }
  return false;
}

export async function HomeLinks() {
  const asked = (
    await Promise.all(
      ASKED.map(async ([slug, section, fact]) => {
        const view = await getRouteView(slug);
        const f = view?.views.all.find((v) => v.section === section && v.slug === fact);
        return view && f ? { href: f.href, title: f.title, route: shortRouteName(view.route) } : null;
      }),
    )
  ).filter((x) => x !== null);
  const winter = (await getAllRoutes()).filter((r) => r.level !== "unwritten" && ridesInWinter(r));

  return (
    <div className="flex flex-col gap-6">
      {asked.length ? (
        <section className="flex flex-col gap-2" aria-labelledby="home-asked">
          <SectionHeading id="home-asked" title="Riders are asking" />
          <ul className="grid gap-2 md:grid-cols-2">
            {asked.map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="card flex h-full flex-col gap-0.5 px-3 py-2.5 hover:border-ink-2">
                  <b className="text-[0.9375rem] leading-5">{a.title}</b>
                  <span className="hint text-xs">{a.route}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {winter.length ? (
        <section className="flex flex-col gap-2" aria-labelledby="home-winter">
          <SectionHeading id="home-winter" title="Riding this winter" />
          <p className="hint max-w-[60ch] text-[0.9375rem]">Routes whose usual season takes in December or January.</p>
          <ul className="flex flex-wrap gap-2">
            {winter.map((r) => (
              <li key={r.slug}>
                <Link href={`/routes/${r.slug}`} className="chip">
                  {shortRouteName(r)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
