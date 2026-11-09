import Link from "next/link";

import { SectionHeading } from "@/components/ui";
import { shortRouteName } from "@/lib/search-titles";
import { getRouteView } from "@/server/route-view";

/*
  A short list under the routes on the home page. "Riders are asking": the facts people search Google for most
  (Search Console, October 2026), so a rider who lands on the home page finds them, and search engines see the site
  points at them. ("Riding this winter" used to follow; the route list now opens with "In season now" instead.)
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
    </div>
  );
}
