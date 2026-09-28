import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { breadcrumbs, JsonLd } from "@/components/json-ld";
import { FactBody } from "@/components/route/fact-body";
import { FactButtons, FactRow } from "@/components/route/fact-row";
import { ShareButton } from "@/components/route/share-button";
import { BackHead } from "@/components/shell";
import { Callout, SectionHeading } from "@/components/ui";
import { STATE_WORDS } from "@/lib/facts";
import { plural } from "@/lib/format";
import { isSection, SECTION_NAMES } from "@/lib/sections";
import { SITE_URL } from "@/lib/site";
import { getRouteView } from "@/server/route-view";

// One fact has an address of its own, so it can be pasted into a chat group. Made when first asked for.
export const revalidate = 3600;

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
  // The card a chat app shows carries the answer and its date, for a rider who never taps the link.
  const title = `${f.title} · ${view.route.name}`;
  const description = [f.short, `${STATE_WORDS[f.state]}. ${f.line}`].filter(Boolean).join(" ");
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
  const rest = view.views.all.filter((v) => v.section === f.section && v.slug !== f.slug);

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
      <BackHead
        title={view.route.name}
        sub={names.name}
        back={`/routes/${slug}/${f.section}`}
        right={<ShareButton title={`${f.title} · ${view.route.name}`} />}
      />
      <Callout tone="stone" title="You opened one fact from a link">
        The rest of the route is below it.
      </Callout>

      <article className="fact !gap-3 !p-3.5" data-hi="true">
        <FactBody view={f} as="h2" />
        {f.report ? <FactButtons view={f} /> : null}
      </article>

      {rest.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionHeading title={`${names.name}, on this route`} aside={plural(rest.length + 1, "fact")} />
          <div className="grid gap-2 lg:grid-cols-2">
            {rest.map((v) => (
              <FactRow key={v.slug} view={v} />
            ))}
          </div>
        </section>
      ) : null}
      <Link className="btn btn-outline self-start" href={`/routes/${slug}`}>
        All of {view.route.name}
      </Link>
    </div>
  );
}
