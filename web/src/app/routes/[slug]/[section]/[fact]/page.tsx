import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { breadcrumbs, JsonLd } from "@/components/json-ld";
import { FactBody } from "@/components/route/fact-body";
import { FactButtons, FactRow } from "@/components/route/fact-row";
import { ShareButton } from "@/components/route/share-button";
import { BackHead } from "@/components/shell";
import { Callout, SectionHeading } from "@/components/ui";
import { plural } from "@/lib/format";
import { isSection, SECTION_NAMES } from "@/lib/sections";
import { SITE_URL } from "@/lib/site";
import { getRouteView } from "@/server/route-view";

// One fact has an address of its own, so it can be pasted into a chat group. Made when first asked for.
export const revalidate = 3600;

/** How many facts either side of the opened one its page shows. A section of five or fewer shows all of it. */
const NEIGHBOURS = 2;

async function find(slug: string, section: string, fact: string) {
  const view = await getRouteView(slug);
  if (!view || !isSection(section)) return null;
  const found = view.views.all.find((v) => v.section === section && v.slug === fact);
  return found ? { view, fact: found, section } : null;
}

export async function generateMetadata(props: PageProps<"/routes/[slug]/[section]/[fact]">): Promise<Metadata> {
  const { slug, section, fact } = await props.params;
  const found = await find(slug, section, fact);
  if (!found) return { title: "No such fact" };
  const { view, fact: f } = found;
  // The card a chat app shows, and the line under a search result, carry the answer and its date.
  const title = `${f.title} · ${view.route.name}`;
  const description = f.snippet;
  return {
    title,
    description,
    alternates: { canonical: f.href },
    openGraph: { title, description, url: f.href, type: "article", siteName: "Meel", locale: "en_IN" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function FactPage(props: PageProps<"/routes/[slug]/[section]/[fact]">) {
  const { slug, section, fact } = await props.params;
  const found = await find(slug, section, fact);
  if (!found) notFound();
  const { view, fact: f } = found;
  const names = SECTION_NAMES[found.section];
  // Only the fact's neighbours, not its whole section: a page repeating 225 pumps is a copy of the next pump's page,
  // and search engines leave such pages out. Fuel is in order along the road, so these are the pumps either side.
  const list = view.views[f.section];
  const at = list.findIndex((v) => v.slug === f.slug);
  const from = Math.max(0, Math.min(at - NEIGHBOURS, list.length - 2 * NEIGHBOURS - 1));
  const near = list.slice(from, from + 2 * NEIGHBOURS + 1).filter((v) => v.slug !== f.slug);
  const cut = near.length < list.length - 1;
  const fuel = f.section === "fuel";

  return (
    <div className="flex flex-col gap-3">
      <JsonLd
        data={breadcrumbs(SITE_URL, [
          ["Meel", "/"],
          [view.route.name, `/routes/${view.route.slug}`],
          [names.name, `/routes/${view.route.slug}/${found.section}`],
          [f.title, f.href],
        ])}
      />
      {/* The fact is the page's main heading. The bar names the route and the section, and looks as it always has. */}
      <BackHead
        title={view.route.name}
        sub={names.name}
        back={`/routes/${slug}/${f.section}`}
        right={<ShareButton title={`${f.title} · ${view.route.name}`} />}
        titleAs="p"
      />
      <Callout tone="stone" title="You opened one fact from a link">
        {cut
          ? `${fuel ? "The pumps either side of it" : "The facts next to it"} are below. The whole route is one tap away.`
          : "The rest of this section is below. The whole route is one tap away."}
      </Callout>

      <article className="fact !gap-3 !p-3.5" data-hi="true">
        <FactBody view={f} as="h1" />
        {f.report ? <FactButtons view={f} /> : null}
      </article>

      {near.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionHeading
            title={cut ? (fuel ? "Pumps before and after it" : `More in ${names.name}`) : `${names.name}, on this route`}
            aside={cut ? `${near.length} of ${list.length}` : plural(list.length, "fact")}
          />
          <div className="grid gap-2 lg:grid-cols-2">
            {near.map((v) => (
              <FactRow key={v.slug} view={v} />
            ))}
          </div>
        </section>
      ) : null}
      {cut ? (
        <Link className="btn btn-outline" href={`/routes/${slug}/${f.section}`}>
          {fuel ? `All ${list.length} pumps on this route` : `All ${list.length} facts in ${names.name}`}
        </Link>
      ) : null}
      <Link className="btn btn-outline self-start" href={`/routes/${slug}`}>
        All of {view.route.name}
      </Link>
    </div>
  );
}
