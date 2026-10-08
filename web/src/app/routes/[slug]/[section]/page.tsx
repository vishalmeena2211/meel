import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { IconPlus } from "@/components/icons";
import { breadcrumbs, JsonLd } from "@/components/json-ld";
import {
  BikesSection,
  CostsSection,
  FuelSection,
  HoursSection,
  MechanicsSection,
  NetworkSection,
  OpenSection,
  RoadSection,
  RulesSection,
  SourcesScreen,
  StaysSection,
  type OpenLive,
  TripsOnRoute,
  VideosSection,
} from "@/components/route/sections";
import { SectionChips } from "@/components/route/route-parts";
import { SinceLastVisit } from "@/components/route/since-last-visit";
import { BackHead, Foot } from "@/components/shell";
import { GettingThereScreen, type RouteBefore } from "@/components/route/getting-there";
import { EmergencyCard, MapAppsScreen } from "@/components/tools/before-you-leave";
import { FuelCheckScreen, type GapNote } from "@/components/tools/fuel-check";
import { AltitudeScreen } from "@/components/tools/night-halts";
import { PackingList } from "@/components/tools/packing-list";
import { TellHome } from "@/components/tools/tell-home";
import { TripCardView } from "@/components/trips/trip-card";
import { Callout, SectionHeading } from "@/components/ui";
import { getApproaches, getBikes, getIndex, getRouteHelp } from "@/lib/content";
import { sayAge, daysBetween, feet, km } from "@/lib/format";
import { isSection, isTool, REPORTS_NEEDED, SECTION_NAMES, type SectionId, type ToolId } from "@/lib/sections";
import { SITE_URL } from "@/lib/site";
import { allSources } from "@/lib/sources";
import { alertsFor, closuresFor, officeDates, weatherFor } from "@/server/live";
import { routePaths } from "@/server/route-pages";
import { getRouteView, type RouteView } from "@/server/route-view";
import { openTrips } from "@/server/trips";

export const revalidate = 3600;

export async function generateStaticParams() {
  const index = await getIndex();
  const out: Array<{ slug: string; section: string }> = [];
  for (const r of index.routes) {
    const view = await getRouteView(r.slug);
    if (!view) continue;
    for (const path of routePaths(view)) {
      const section = path.split("/")[3];
      if (section) out.push({ slug: r.slug, section });
    }
  }
  return out;
}

const TOOL_NAMES: Record<ToolId, string> = {
  "fuel-check": "Fuel check",
  trips: "Trips on this route",
  sources: "Sources",
  "getting-there": "Getting there",
  "map-apps": "Route file",
  emergency: "Emergency card",
  "tell-home": "Tell someone at home",
};

export async function generateMetadata(props: PageProps<"/routes/[slug]/[section]">): Promise<Metadata> {
  const { slug, section } = await props.params;
  const view = await getRouteView(slug);
  if (!view || (!isSection(section) && !isTool(section))) return { title: "No such page" };
  const name = isSection(section) ? SECTION_NAMES[section].name : TOOL_NAMES[section];
  const found = view.sections.find((s) => s.id === section);
  return {
    title: `${name} · ${view.route.name}`,
    alternates: { canonical: `/routes/${slug}/${section}` },
    description: `${name} on ${view.route.name}${found ? `: ${found.sub}` : ""}. Every fact shows where it came from and when it was last confirmed.`,
  };
}

/** Sections made of facts. They carry the row of chips, and say what changed since the rider's last visit. */
const OF_FACTS: Partial<Record<SectionId, string>> = {
  fuel: "pump",
  rules: "rule",
  road: "warning",
  mechanics: "shop",
  stays: "place",
};

function gapNote(view: RouteView): GapNote {
  const { route, views } = view;
  const gap = route.fuel.longest_gaps[0];
  if (!gap || !route.fuel.listed) return { pumpWords: null, before: null };
  const pumps = [...route.fuel.pumps].sort((a, b) => a.km_from_start - b.km_from_start);
  const first = pumps.filter((p) => Math.abs(p.km_from_start - gap.from_km) <= 1.5).at(-1);
  const fact = first ? views.fuel.find((v) => v.id === first.id) : undefined;
  const confirmed = fact && fact.history.length > 1 && fact.state !== "unchecked";
  const pumpWords = !fact
    ? null
    : confirmed
      ? `was last confirmed ${fact.line.split(" · ").at(-1) ?? "some time ago"}`
      : "has not been confirmed by any rider";
  const earlier = pumps.filter((p) => p.km_from_start < gap.from_km - 2).at(-1);
  return {
    pumpWords,
    before: earlier
      ? { near: earlier.near ?? earlier.name, gapKm: Math.round(gap.to_km - earlier.km_from_start) }
      : null,
  };
}

export default async function SectionPage(props: PageProps<"/routes/[slug]/[section]">) {
  const { slug, section } = await props.params;
  // The same cached lookup the body makes, so this costs nothing more.
  const view = await getRouteView(slug);
  const name = isSection(section) ? SECTION_NAMES[section].name : isTool(section) ? TOOL_NAMES[section] : null;
  return (
    <>
      {view && name ? (
        <JsonLd
          data={breadcrumbs(SITE_URL, [
            ["Meel", "/"],
            [view.route.name, `/routes/${slug}`],
            [name, `/routes/${slug}/${section}`],
          ])}
        />
      ) : null}
      <SectionBody params={props.params} searchParams={props.searchParams} />
    </>
  );
}

async function SectionBody(props: PageProps<"/routes/[slug]/[section]">) {
  const { slug, section } = await props.params;
  const view = await getRouteView(slug);
  if (!view) notFound();
  const { route } = view;
  const top = `/routes/${slug}`;

  // ── the three screens that are not sections of facts ────────────────
  if (isTool(section)) {
    if (section === "fuel-check") {
      const bikes = await getBikes();
      const counts = new Map<string, number>();
      for (const r of view.used) counts.set(r.bike, (counts.get(r.bike) ?? 0) + 1);
      const popular = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
      return (
        <FuelCheckScreen
          bikes={bikes}
          gaps={route.fuel.longest_gaps}
          terrain={route.terrain}
          routeName={route.name}
          routeSlug={slug}
          note={gapNote(view)}
          popular={popular}
        />
      );
    }
    if (section === "trips") {
      const near = new Set(view.nearby.map((r) => r.slug));
      const index = await getIndex();
      const nameOf = (s: string) => index.routes.find((r) => r.slug === s)?.name ?? s;
      const others = (await openTrips()).filter((t) => near.has(t.route_slug)).slice(0, 3);
      return (
        <div className="flex flex-col gap-3">
          <BackHead title={route.name} sub="Trips on this route" back={top} />
          <TripsOnRoute
            view={view}
            nearbyTrips={
              others.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h3 className="label">Trips on roads nearby</h3>
                  {others.map((t) => (
                    <TripCardView key={t.id} trip={t} routeName={nameOf(t.route_slug)} />
                  ))}
                </div>
              ) : null
            }
          />
          <Foot>
            <Link className="btn btn-primary btn-block md:w-auto md:self-start" href={`/trips/new?route=${slug}`}>
              <IconPlus />
              Post a trip on this route
            </Link>
          </Foot>
        </div>
      );
    }
    if (section === "getting-there") {
      const first = route.waypoints[0];
      const approaches = await getApproaches();
      const approach = approaches.routes[slug];
      if (!first || route.line.length === 0) notFound();
      const index = await getIndex();
      const before: RouteBefore[] = (approach?.after ?? []).flatMap((s) => {
        const r = index.routes.find((x) => x.slug === s);
        const a = approaches.routes[s];
        return r ? [{ slug: s, name: r.name, length_km: r.distance_km ?? null, km: Object.fromEntries(Object.entries(a?.to ?? {}).map(([c, l]) => [c, l.km])) }] : [];
      });
      return (
        <div className="flex flex-col gap-3">
          <BackHead title={route.name} sub={TOOL_NAMES[section]} back={top} />
          {approach ? (
            <GettingThereScreen
              start={{ name: first.name, lat: first.lat, lon: first.lon }}
              approach={approach}
              cities={approaches.cities}
              before={before}
              built={approaches.built}
            />
          ) : (
            <Callout title="Not worked out yet">How far this route is from the cities riders set out from has not been worked out yet.</Callout>
          )}
        </div>
      );
    }
    if (section === "map-apps" || section === "emergency" || section === "tell-home") {
      if (route.line.length === 0) notFound();
      const help = section === "emergency" ? await getRouteHelp(slug) : null;
      const gap = route.fuel.longest_gaps[0];
      const highest = route.header.highest_point;
      return (
        <div className="flex flex-col gap-3">
          <BackHead title={route.name} sub={TOOL_NAMES[section]} back={top} />
          {section === "map-apps" ? <MapAppsScreen route={route} /> : null}
          {section === "emergency" && help ? <EmergencyCard route={route} help={help.help} fetched={help.fetched} /> : null}
          {section === "tell-home" ? (
            <TellHome
              routeName={route.name}
              path={top}
              places={route.waypoints.filter((w) => w.kind === "place").map((w) => w.name)}
              gap={gap && route.fuel.listed && gap.gap_km >= 60 ? `No fuel for ${km(gap.gap_km)} after ${gap.near_from}.` : null}
              highest={highest ? `Highest point ${feet(highest.altitude_m)}.` : null}
            />
          ) : null}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        <BackHead title="Sources" sub={route.name} back={top} />
        <SourcesScreen view={view} sources={allSources(route)} />
      </div>
    );
  }

  if (!isSection(section)) notFound();
  const names = SECTION_NAMES[section];
  const here = view.sections.some((s) => s.id === section);

  // A section that waits for riders says so, and says how it will arrive.
  if (!here) {
    const fromReports = section === "bikes" || section === "costs";
    return (
      <div className="flex flex-col gap-3">
        <BackHead title={route.name} sub={names.name} back={top} />
        <SectionHeading title={names.name} aside="Not here yet" />
        {fromReports ? (
          <Callout title={`Shows after ${REPORTS_NEEDED} trip reports`}>
            {Math.min(view.used.length, REPORTS_NEEDED)} so far for this route. With fewer, this would be a handful
            of opinions, not a pattern.
          </Callout>
        ) : (
          <Callout tone="info" title="This comes from riders, not from us">
            It appears when riders who have done this route send a trip report. It takes about three minutes.
          </Callout>
        )}
        <Foot>
          <Link className="btn btn-primary btn-block md:w-auto md:self-start" href={`/report?route=${slug}`}>
            I have ridden this · send a trip report
          </Link>
        </Foot>
      </div>
    );
  }

  if (section === "altitude") {
    const highest = route.waypoints
      .filter((w) => w.kind === "place" && w.altitude_m !== null)
      .sort((a, b) => (b.altitude_m ?? 0) - (a.altitude_m ?? 0))[0];
    return (
      <AltitudeScreen
        waypoints={route.waypoints}
        profile={route.profile}
        tunnels={route.tunnels ?? []}
        distanceKm={route.header.distance_km ?? 0}
        routeName={route.name}
        routeSlug={slug}
        highest={highest?.name ?? null}
      />
    );
  }

  // "Is it open?" reads what some offices and a weather service say today. Each read is kept for an hour or more.
  const live: OpenLive | undefined =
    section === "open"
      ? await Promise.all([alertsFor(route), officeDates(route), closuresFor(route), weatherFor(route)]).then(
          ([alerts, offices, closures, weather]) => ({ alerts, offices, closures, weather }),
        )
      : undefined;

  const noun = OF_FACTS[section];
  const body: Record<Exclude<SectionId, "altitude">, () => ReactNode> = {
    open: () => <OpenSection view={view} live={live} />,
    fuel: () => <FuelSection view={view} />,
    rules: () => <RulesSection view={view} />,
    road: () => <RoadSection view={view} />,
    network: () => <NetworkSection view={view} />,
    mechanics: () => <MechanicsSection view={view} />,
    hours: () => <HoursSection view={view} />,
    stays: () => <StaysSection view={view} />,
    videos: () => <VideosSection view={view} />,
    bikes: () => <BikesSection view={view} />,
    costs: () => <CostsSection view={view} />,
    packing: () =>
      view.packing ? (
        <section className="flex flex-col gap-3">
          <SectionHeading title="Packing list" aside="By month" />
          <PackingList list={view.packing} routeSlug={slug} months={view.seasonMonths} />
        </section>
      ) : null,
  };

  // The three screens drawn as tools carry their own name first, and the route beneath.
  const asTool = section === "packing" || section === "videos";
  const newest = view.views.all
    .filter((v) => v.section === section)
    .map((v) => v.touched)
    .sort()
    .at(-1);

  return (
    <div className="flex flex-col gap-3">
      <BackHead
        title={asTool ? names.name : route.name}
        sub={asTool ? route.name : names.name}
        back={top}
      />
      {noun || section === "network" ? <SectionChips view={view} on={section} /> : null}
      {noun ? <SinceLastVisit routeSlug={slug} section={section} noun={noun} /> : null}
      {body[section]()}
      {noun && newest ? (
        <p className="hint num">
          Newest change in this section: {sayAge(daysBetween(newest.slice(0, 10), new Date()))}.
        </p>
      ) : null}
    </div>
  );
}
