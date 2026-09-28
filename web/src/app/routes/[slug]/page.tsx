import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { IconFlag, IconList, IconRight } from "@/components/icons";
import { breadcrumbs, JsonLd } from "@/components/json-ld";
import { SaveRoute } from "@/components/offline/save-route";
import {
  FirstRows,
  levelWords,
  NotHereYet,
  OnThisPage,
  RouteHead,
  RoutePicture,
} from "@/components/route/route-parts";
import {
  FuelSection,
  HoursSection,
  MechanicsSection,
  NetworkSection,
  RoadSection,
  RulesSection,
  StaysSection,
  VideosSection,
} from "@/components/route/sections";
import { ShareButton } from "@/components/route/share-button";
import { SinceLastVisit } from "@/components/route/since-last-visit";
import { BackHead, Foot } from "@/components/shell";
import { Callout, Empty } from "@/components/ui";
import { getIndex } from "@/lib/content";
import { km, feet, plural } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { allSources } from "@/lib/sources";
import { savedPages } from "@/server/route-pages";
import { getRouteView } from "@/server/route-view";

// A fact grows older every day, so a built page is made again at most once an hour.
export const revalidate = 3600;

export async function generateStaticParams() {
  const index = await getIndex();
  return index.routes.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata(props: PageProps<"/routes/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const view = await getRouteView(slug);
  if (!view) return { title: "No such route" };
  const { route } = view;
  const gap = route.fuel.longest_gaps[0];
  const parts = [
    route.header.distance_km ? km(route.header.distance_km) : null,
    route.header.highest_point ? `highest point ${feet(route.header.highest_point.altitude_m)}` : null,
    gap && gap.gap_km >= 60 ? `longest stretch with no pump ${km(gap.gap_km)}` : null,
  ].filter(Boolean);
  const description = `${route.name}: ${parts.join(", ")}. ${plural(route.counts.facts, "fact")}, each with its source.`;
  // "by motorcycle" is what riders type into a search box, and it is what the page is about.
  const title = `${route.name} by motorcycle`;
  const canonical = `/routes/${route.slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    // A route not written yet has too little on it to be worth a search result.
    robots: route.level === "unwritten" ? { index: false } : undefined,
    openGraph: {
      title: `${title} · Meel`,
      description,
      url: canonical,
      siteName: "Meel",
      locale: "en_IN",
      type: "article",
      images: route.image ? [{ url: `/route-images/${route.image.file}`, alt: route.image.shows }] : undefined,
    },
  };
}

export default async function RoutePage(props: PageProps<"/routes/[slug]">) {
  const { slug } = await props.params;
  const view = await getRouteView(slug);
  if (!view) notFound();
  const { route, confirmed, sections, nearby } = view;
  const unwritten = route.level === "unwritten";
  const saving = savedPages(view);
  const has = (id: string) => sections.some((s) => s.id === id);
  const sources = allSources(route);

  const places = route.waypoints.filter((w) => w.kind === "place");

  return (
    <div className="flex flex-col gap-4">
      <JsonLd
        data={[
          breadcrumbs(SITE_URL, [
            ["Meel", "/"],
            [route.name, `/routes/${route.slug}`],
          ]),
          {
            "@context": "https://schema.org",
            "@type": "TouristTrip",
            name: `${route.name} by motorcycle`,
            description: route.one_line ?? undefined,
            url: `${SITE_URL}/routes/${route.slug}`,
            touristType: "Motorcycle touring",
            itinerary: {
              "@type": "ItemList",
              numberOfItems: places.length,
              itemListElement: places.map((w, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item: {
                  "@type": "Place",
                  name: w.name,
                  geo: { "@type": "GeoCoordinates", latitude: w.lat, longitude: w.lon, elevation: w.altitude_m ?? undefined },
                },
              })),
            },
          },
        ]}
      />
      <BackHead title={route.name} sub={levelWords(view)} back="/" right={<ShareButton title={`${route.name} · Meel`} />} />
      <RoutePicture view={view} />
      <RouteHead view={view} as="h2" />

      {unwritten ? (
        <>
          <Callout title="This page is not written yet">
            We have no checked facts for {route.name}. We would rather show nothing than show a guess.
          </Callout>
          <Callout tone="info" title="Ridden it?">
            Your trip report is how this page starts. Route, month and bike are enough. Everything else is optional.
          </Callout>
          {view.reports > 0 ? (
            <Callout tone="stone" title={`${plural(view.reports, "rider")} ${view.reports === 1 ? "has" : "have"} sent a trip report`}>
              The page is being written. It moves up the list with each report.
            </Callout>
          ) : null}
          {nearby.length > 0 ? (
            <section className="flex flex-col gap-1.5">
              <h2 className="label">Written routes nearby</h2>
              <div className="card flex flex-col">
                {nearby.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/routes/${r.slug}`}
                    className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2.5 last:border-b-0 hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <b className="block text-[0.9375rem] leading-5">{r.name}</b>
                      <span className="hint num">{plural(r.facts, "fact")}</span>
                    </span>
                    <IconRight className="size-4 shrink-0 text-ink-2" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <>
          {route.level === "basic" ? (
            <Callout title="This is a basic page">
              {confirmed === 0
                ? "No rider has reported on this route yet. What is here comes from official and published sources."
                : `Riders have confirmed ${confirmed} of its ${route.counts.facts} facts. The rest comes from official and published sources.`}{" "}
              <Link className="link font-medium" href="/about#trust">
                How far to trust it
              </Link>
            </Callout>
          ) : null}

          <div className="lg:hidden">
            <FirstRows
              view={view}
              save={
                <SaveRoute
                  routeSlug={slug}
                  routeName={route.name}
                  facts={route.counts.facts}
                  tools={saving.tools}
                  pages={saving.pages}
                  extras={saving.extras}
                />
              }
            />
          </div>
          <div className="lg:hidden">
            <OnThisPage view={view} />
          </div>

          {/* On a wider screen the sections follow one another, as on a printed page. */}
          <div className="hidden flex-col gap-8 lg:flex">
            <SinceLastVisit routeSlug={slug} section="all" noun="fact" />
            {has("fuel") ? <FuelSection view={view} /> : null}
            {has("rules") ? <RulesSection view={view} /> : null}
            {has("road") ? <RoadSection view={view} /> : null}
            {has("network") ? <NetworkSection view={view} /> : null}
            {has("mechanics") ? <MechanicsSection view={view} /> : null}
            {has("hours") ? <HoursSection view={view} /> : null}
            {has("stays") ? <StaysSection view={view} /> : null}
            {has("videos") ? <VideosSection view={view} /> : null}
          </div>

          <NotHereYet view={view} />

          <section className="flex flex-col gap-1.5 lg:hidden">
            <h2 className="label">Also</h2>
            <div className="card flex flex-col">
              <Link
                href={`/routes/${slug}/trips`}
                className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2.5 hover:bg-surface-2"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2">
                  <IconFlag />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.9375rem] leading-5">Trips on this route</b>
                  <span className="hint num">
                    {view.trips.length > 0 ? `${plural(view.trips.length, "trip")} planned` : "None planned yet"}
                  </span>
                </span>
                <IconRight className="size-4 shrink-0 text-ink-2" />
              </Link>
              <Link
                href={`/routes/${slug}/sources`}
                className="flex min-h-12 items-center gap-2.5 px-3 py-2.5 hover:bg-surface-2"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2">
                  <IconList />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.9375rem] leading-5">Sources, and what we could not find</b>
                  <span className="hint num">
                    {plural(sources.length + 2, "source")} · {plural(route.gaps.length, "gap")}
                  </span>
                </span>
                <IconRight className="size-4 shrink-0 text-ink-2" />
              </Link>
            </div>
          </section>
        </>
      )}

      {unwritten && view.reports === 0 ? <Empty title="Nobody has reported yet" /> : null}

      {/* A trip report is the one thing an unwritten page asks for, so it stays at the foot of the screen. On a written
          page most readers are planning, so it is asked for at the end, not in a bar over what they are reading. */}
      {unwritten ? (
        <Foot>
          <Link className="btn btn-primary btn-block md:w-auto md:self-start" href={`/report?route=${slug}`}>
            I have ridden this · send a trip report
          </Link>
        </Foot>
      ) : (
        <div className="flex flex-col gap-1.5 md:items-start">
          <p className="hint">
            {plural(view.reports, "trip report")} for {route.name} so far
          </p>
          <Link className="btn btn-outline btn-block md:w-auto" href={`/report?route=${slug}`}>
            Ridden it? Send a trip report
          </Link>
        </div>
      )}
    </div>
  );
}
