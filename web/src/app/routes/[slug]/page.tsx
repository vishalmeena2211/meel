import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  IconBag,
  IconClock,
  IconExternal,
  IconFlag,
  IconFuel,
  IconLock,
  IconPeak,
  IconPlay,
  IconShield,
  IconAlert,
} from "@/components/icons";
import { GapStrip, RouteLine } from "@/components/route/drawings";
import { FactReporter } from "@/components/route/fact-actions";
import { FactCard, type FactContext } from "@/components/route/fact-card";
import { ShareButton } from "@/components/route/share-button";
import { ShowMore } from "@/components/show-more";
import { FuelCheck } from "@/components/tools/fuel-check";
import { NightHalts } from "@/components/tools/night-halts";
import { PackingList } from "@/components/tools/packing-list";
import { Badge, Callout, Empty, KeyFacts, KmStone, SectionHeading, SourceLine } from "@/components/ui";
import { getBikes, getFactKinds, getIndex, getPackingList, getRoute } from "@/lib/content";
import { hostOf, hours, km, metres, plural, sayDate, sayMonths, stoneCap } from "@/lib/format";
import type { Route, Source } from "@/lib/types";
import { confirmationsFor, tripReportCount } from "@/server/reports";
import { openTripsOnRoute } from "@/server/trips";

// A fact grows older every day, so a built page is made again at most once an hour.
export const revalidate = 3600;

export async function generateStaticParams() {
  const index = await getIndex();
  return index.routes.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata(props: PageProps<"/routes/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const route = await getRoute(slug);
  if (!route) return { title: "No such route" };
  const gap = route.fuel.longest_gaps[0];
  const parts = [
    route.header.distance_km ? km(route.header.distance_km) : null,
    route.header.highest_point ? `highest point ${metres(route.header.highest_point.altitude_m)}` : null,
    gap && gap.gap_km >= 60 ? `longest stretch with no pump ${km(gap.gap_km)}` : null,
  ].filter(Boolean);
  const description = `${route.name}: ${parts.join(", ")}. ${plural(route.counts.facts, "fact")}, each with its source.`;
  return {
    title: route.name,
    description,
    openGraph: {
      title: `${route.name} · Meel`,
      description,
      images: route.image ? [{ url: `/route-images/${route.image.file}` }] : undefined,
    },
  };
}

function allSources(route: Route): Source[] {
  const found: Source[] = [];
  const add = (s: Source | null | undefined) => {
    if (s && !found.some((f) => f.url === s.url)) found.push(s);
  };
  add(route.header.highway?.source);
  add(route.header.usual_days?.source);
  add(route.header.usual_season?.source);
  add(route.header.highest_point?.source);
  for (const r of route.rules) {
    add(r.source);
    for (const h of r.history) add(h.source);
  }
  for (const y of route.season.history) for (const s of y.sources) add(s);
  for (const a of route.authorities) add(a.source);
  for (const h of route.hazards) add(h.source);
  return found;
}

const RULE_WORDS: Record<string, string> = {
  permit: "Permit",
  fee: "Fee",
  tax: "Tax or toll",
  "motorcycle-rule": "Rule for motorcycles",
  document: "Document",
  timing: "Timing",
};

export default async function RoutePage(props: PageProps<"/routes/[slug]">) {
  const { slug } = await props.params;
  const route = await getRoute(slug);
  if (!route) notFound();

  const [bikes, kinds, packing] = await Promise.all([getBikes(), getFactKinds(), getPackingList(route.terrain)]);
  const confirmations = confirmationsFor(route.slug);
  const reports = tripReportCount(route.slug);
  const trips = openTripsOnRoute(route.slug);
  const context: FactContext = {
    routeSlug: route.slug,
    routeName: route.name,
    confirmations,
    kinds,
    today: new Date(),
    chatNumber: process.env.NEXT_PUBLIC_MEEL_CHAT_NUMBER?.replace(/\D/g, "") || null,
  };

  const h = route.header;
  const first = route.waypoints[0]?.name ?? route.places[0] ?? "Start";
  const last = route.waypoints[route.waypoints.length - 1]?.name ?? route.places[route.places.length - 1] ?? "End";
  const distance = h.distance_km ?? 0;
  const highEnough = (h.highest_point?.altitude_m ?? 0) >= 2500 && route.profile.length > 1;
  const sources = allSources(route);
  const unwritten = route.level === "unwritten";
  const confirmed = new Set(
    confirmations.filter((c) => c.kind === "still-true" && c.read !== false).map((c) => c.fact_id),
  ).size;

  const sections = [
    { id: "open", label: "Is it open?", show: route.authorities.length > 0 || route.season.history.length > 0 },
    { id: "fuel", label: "Fuel", show: route.line.length > 0 },
    { id: "rules", label: "Rules", show: route.rules.length > 0 },
    { id: "altitude", label: "Altitude", show: highEnough },
    { id: "hazards", label: "Hazards", show: route.hazards.length > 0 },
    { id: "stretches", label: "Stretches", show: route.stretches.length > 0 },
    { id: "videos", label: "Videos", show: true },
    { id: "packing", label: "Packing", show: packing !== null },
    { id: "trips", label: "Trips", show: true },
  ].filter((s) => s.show);

  return (
    <div className="flex flex-col gap-5">
      <FactReporter routeSlug={route.slug} routeName={route.name} chatNumber={context.chatNumber} />
      <nav aria-label="Where you are" className="hint">
        <Link className="link font-medium" href="/">
          All routes
        </Link>{" "}
        · {route.region_name}
      </nav>

      {route.image ? (
        <figure className="-mx-4 overflow-hidden md:mx-0 md:rounded-xl md:border md:border-line">
          <Image
            src={`/route-images/${route.image.file}`}
            alt={`${route.image.shows}, on the ${route.name} route`}
            width={1600}
            height={1067}
            priority
            sizes="(min-width: 1152px) 1120px, 100vw"
            className="h-52 w-full object-cover md:h-80"
          />
          <figcaption className="hint border-b border-line bg-surface px-4 py-1.5 text-xs md:border-b-0">
            {route.image.shows}. Photo: {route.image.author} ·{" "}
            <a className="link font-medium" href={route.image.licence_url || route.image.source_page} target="_blank" rel="noreferrer noopener">
              {route.image.licence}
            </a>{" "}
            ·{" "}
            <a className="link font-medium" href={route.image.source_page} target="_blank" rel="noreferrer noopener">
              Wikimedia Commons
            </a>{" "}
            · resized
          </figcaption>
        </figure>
      ) : null}

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <KmStone
            cap={stoneCap(h.highway?.value)}
            value={h.distance_km ? Math.round(h.distance_km).toLocaleString("en-IN") : "?"}
            unit="KM"
          />
          <div className="min-w-0 flex-1">
            <h1 className="display text-[1.75rem] uppercase md:text-4xl">{route.name}</h1>
            <p className="hint mt-1">{route.one_line ?? `${route.region_name} · ${route.places.join(", ")}`}</p>
          </div>
          <ShareButton title={`${route.name} · Meel`} />
        </div>

        <KeyFacts
          items={[
            h.usual_days ? { label: "Usual days", value: h.usual_days.value } : null,
            h.highest_point ? { label: "Highest point", value: metres(h.highest_point.altitude_m) } : null,
            h.usual_season ? { label: "Usual season", value: h.usual_season.value } : null,
          ].filter((x): x is { label: string; value: string } => x !== null)}
        />
        {h.highway ? (
          <div className="flex flex-col gap-0.5">
            <p className="text-sm">
              <span className="label mr-1.5">Road</span>
              {h.highway.value}
            </p>
            <SourceLine source={h.highway.source} />
          </div>
        ) : null}
        <p className="hint">
          <Badge tone={unwritten ? "unchecked" : "plain"}>{unwritten ? "Not written yet" : "Basic page"}</Badge>{" "}
          {plural(route.counts.facts, "fact")} · gathered at a desk on {sayDate(route.built)} ·{" "}
          {confirmed === 0
            ? "no rider has confirmed them yet."
            : `riders have confirmed ${confirmed} of them.`}{" "}
          <Link className="link font-medium" href="/about#trust">
            What that means
          </Link>
        </p>
      </header>

      {unwritten ? (
        <Empty title="This page is not written yet">
          <span className="text-sm">
            We have too few checked facts for {route.name}. We would rather show little than show a guess.
          </span>
          <Link className="btn btn-primary" href={`/report?route=${route.slug}`}>
            I have ridden this · send a trip report
          </Link>
        </Empty>
      ) : null}

      <nav aria-label="On this page" className="scroll-row sticky top-14 z-20 -mx-4 border-b border-line bg-ground px-4 py-2">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="chip">
            {s.label}
          </a>
        ))}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-8">
          {/* ── Is it open? ─────────────────────────────────────────── */}
          {route.authorities.length > 0 || route.season.history.length > 0 ? (
            <section aria-labelledby="open" className="flex flex-col gap-3">
              <SectionHeading id="open" title="Is it open?" aside="We link, we do not guess" />
              <Callout tone="info" title="Meel does not say open or closed">
                Conditions change by the hour. These are the offices that decide, and where each one announces it.
              </Callout>
              <ShowMore first={4} noun="sources" className="grid gap-2 md:grid-cols-2">
                {route.authorities.map((a) => (
                  <FactCard
                    key={a.id}
                    id={a.id}
                    title={a.office}
                    source={a.source}
                    context={context}
                    actions={false}
                    extra={
                      a.url ? (
                        <a className="btn btn-soft mt-1 self-start" href={a.url} target="_blank" rel="noreferrer noopener">
                          <IconExternal />
                          Open their page
                        </a>
                      ) : null
                    }
                  >
                    {a.announces}
                    {a.stretch ? <span className="hint block">Covers: {a.stretch}</span> : null}
                    {a.channel ? <span className="hint block">Announces on: {a.channel}</span> : null}
                  </FactCard>
                ))}
              </ShowMore>

              {route.season.note ? <p className="text-sm">{route.season.note}</p> : null}
              {route.season.history.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h3 className="label">What happened each year</h3>
                  <div className="card overflow-x-auto">
                    <table className="num w-full min-w-[520px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-surface-2 text-left">
                          <th className="label px-3 py-2">Year</th>
                          <th className="label px-3 py-2">Connected</th>
                          <th className="label px-3 py-2">Open to motorcycles</th>
                          <th className="label px-3 py-2">Closed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {route.season.history.map((y) => (
                          <tr key={y.year} className="border-t border-line align-top">
                            <th scope="row" className="px-3 py-2 text-left font-semibold">
                              {y.year}
                            </th>
                            <td className="px-3 py-2">{sayDate(y.connected) ?? <span className="text-ink-2">Not found</span>}</td>
                            <td className="px-3 py-2">
                              {sayDate(y.open_to_motorcycles) ?? <span className="text-ink-2">Not found</span>}
                            </td>
                            <td className="px-3 py-2">{sayDate(y.closed) ?? <span className="text-ink-2">Not found</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <details className="hint">
                    <summary className="link cursor-pointer text-sm font-medium">Notes and sources for each year</summary>
                    <ul className="mt-1 flex flex-col gap-2">
                      {route.season.history.map((y) => (
                        <li key={y.year}>
                          <b className="text-ink">{y.year}.</b> {y.note}{" "}
                          {y.sources.map((s) => (
                            <a key={s.url} className="link font-medium" href={s.url} target="_blank" rel="noreferrer noopener">
                              {hostOf(s.url)}{" "}
                            </a>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </details>
                  <p className="hint">
                    “Not found” means no source gave a date. It does not mean the road stayed shut.
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* ── Fuel ────────────────────────────────────────────────── */}
          {route.line.length > 0 ? (
            <section aria-labelledby="fuel" className="flex flex-col gap-3">
              <SectionHeading
                id="fuel"
                title="Fuel"
                aside={
                  route.fuel.pump_count > 0
                    ? `${plural(route.fuel.pump_count, "pump")} on the map${route.fuel.longest_gaps[0] ? ` · longest gap ${km(route.fuel.longest_gaps[0].gap_km)}` : ""}`
                    : "No pumps on the map"
                }
              />
              {route.fuel.pump_count > 0 && distance > 0 ? (
                <GapStrip fuel={route.fuel} distanceKm={distance} from={first} to={last} />
              ) : null}

              <div className="card flex flex-col gap-3 p-3">
                <h3 className="display flex items-center gap-2 text-xl">
                  <IconFuel className="size-5" />
                  Fuel check for your bike
                </h3>
                <FuelCheck
                  bikes={bikes}
                  gaps={route.fuel.longest_gaps}
                  terrain={route.terrain}
                  routeName={route.name}
                  pumpsListed={route.fuel.listed}
                />
              </div>

              {route.fuel.longest_gaps.length > 1 ? (
                <div className="flex flex-col gap-1">
                  <h3 className="label">Longest stretches with no pump</h3>
                  <ol className="card num flex flex-col text-sm">
                    {route.fuel.longest_gaps.slice(0, 4).map((g) => (
                      <li key={`${g.from_km}-${g.to_km}`} className="flex justify-between gap-3 border-b border-line px-3 py-2 last:border-b-0">
                        <span>
                          Near {g.near_from} to near {g.near_to}
                        </span>
                        <b>{km(g.gap_km)}</b>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {route.fuel.listed ? (
                <details open={route.fuel.pumps.length <= 4}>
                  <summary className="link cursor-pointer text-sm font-medium">
                    Every pump on the map, {route.fuel.pumps.length} in all
                  </summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {route.fuel.pumps.map((p) => (
                      <FactCard
                        key={p.id}
                        id={p.id}
                        title={`${p.name}${p.near ? `, near ${p.near}` : ""}`}
                        source={{
                          url: p.osm_url,
                          title: "OpenStreetMap",
                          kind: "map",
                          opened: true,
                          source_date: null,
                          accessed: route.fuel.fetched ?? route.built,
                        }}
                        context={context}
                      >
                        <span className="num">
                          {km(p.km_from_start)} from {first}
                          {p.brand && p.brand !== p.name ? ` · ${p.brand}` : ""}
                          {p.opening_hours ? ` · hours on the map: ${p.opening_hours}` : ""}
                        </span>
                      </FactCard>
                    ))}
                  </div>
                </details>
              ) : route.fuel.pump_count > 0 ? (
                <p className="hint">
                  This road is long and has {route.fuel.pump_count.toLocaleString("en-IN")} pumps on the map, so they
                  are counted and not listed.
                </p>
              ) : null}
            </section>
          ) : null}

          {/* ── Rules ───────────────────────────────────────────────── */}
          {route.rules.length > 0 ? (
            <section aria-labelledby="rules" className="flex flex-col gap-3">
              <SectionHeading id="rules" title="Rules, permits and fees" aside={plural(route.rules.length, "fact")} />
              <ShowMore first={6} noun="rules" className="grid gap-2 md:grid-cols-2">
                {route.rules.map((r) => (
                  <FactCard
                    key={r.id}
                    id={r.id}
                    title={r.title}
                    source={r.source}
                    context={context}
                    extra={
                      <>
                        {r.official_url ? (
                          <a className="link text-sm font-medium" href={r.official_url} target="_blank" rel="noreferrer noopener">
                            Official page: {hostOf(r.official_url)}
                            <IconExternal className="ml-0.5 inline size-3 align-[-1px]" />
                          </a>
                        ) : null}
                        {r.history.length > 0 ? (
                          <details className="hint">
                            <summary className="link cursor-pointer text-sm font-medium">
                              What changed, and when ({r.history.length})
                            </summary>
                            <ul className="num mt-1 flex flex-col">
                              {r.history.map((c) => (
                                <li key={`${c.date}-${c.change}`} className="grid grid-cols-[92px_1fr] gap-2 border-b border-dashed border-line py-1.5 last:border-b-0">
                                  <span>{sayDate(c.date) ?? "No date"}</span>
                                  <span className="text-ink">
                                    {c.change}{" "}
                                    <a className="link font-medium" href={c.source.url} target="_blank" rel="noreferrer noopener">
                                      {hostOf(c.source.url)}
                                    </a>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                      </>
                    }
                  >
                    <span className="hint block">
                      {RULE_WORDS[r.kind] ?? "Rule"}
                      {r.applies_to ? ` · applies to ${r.applies_to}` : ""}
                      {r.set_by ? ` · set by ${r.set_by}` : ""}
                    </span>
                    {r.detail}
                    {!r.has_official_order ? (
                      <span className="mt-1 block font-medium text-ageing-fg">
                        No government order was found for this. It is reported as what happens in practice.
                      </span>
                    ) : null}
                  </FactCard>
                ))}
              </ShowMore>
            </section>
          ) : null}

          {/* ── Altitude ────────────────────────────────────────────── */}
          {highEnough ? (
            <section aria-labelledby="altitude" className="flex flex-col gap-3">
              <SectionHeading id="altitude" title="Altitude and night halts" aside="Where you sleep matters most" />
              <p className="text-sm">
                Pick the places you will sleep. The check compares the height of each night with the one before.
              </p>
              <NightHalts waypoints={route.waypoints} profile={route.profile} distanceKm={distance} />
            </section>
          ) : null}

          {/* ── Hazards ─────────────────────────────────────────────── */}
          {route.hazards.length > 0 ? (
            <section aria-labelledby="hazards" className="flex flex-col gap-3">
              <SectionHeading id="hazards" title="Hazards on the road" aside={plural(route.hazards.length, "fact")} />
              <ShowMore first={4} noun="hazards" className="grid gap-2 md:grid-cols-2">
                {route.hazards.map((z) => (
                  <FactCard key={z.id} id={z.id} title={z.title} source={z.source} context={context}>
                    {z.detail}
                    <span className="hint block">{sayMonths(z.months)}</span>
                  </FactCard>
                ))}
              </ShowMore>
            </section>
          ) : null}

          {/* ── Stretches ───────────────────────────────────────────── */}
          {route.stretches.length > 0 ? (
            <section aria-labelledby="stretches" className="flex flex-col gap-3">
              <SectionHeading id="stretches" title="Stretch by stretch" aside={`${km(distance)} in all`} />
              <Callout title="A map app is wrong on roads like these">
                It assumes a car on a clear road. The hours below are what a map app claims, shown so you can see how
                far off they are once riders report theirs.
              </Callout>
              <div className="card overflow-x-auto">
                <table className="num w-full min-w-[420px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-2 text-left">
                      <th className="label px-3 py-2">Stretch</th>
                      <th className="label px-3 py-2 text-right">Distance</th>
                      <th className="label px-3 py-2 text-right">A map app says</th>
                    </tr>
                  </thead>
                  <tbody>
                    {route.stretches.map((s, i) => (
                      <tr key={`${s.from}-${s.to}-${i}`} className="border-t border-line">
                        <td className="px-3 py-2">
                          {s.from} to {s.to}
                          {s.doubtful ? (
                            <span className="block text-xs font-medium text-ageing-fg">
                              Doubtful. The open map may not know the road riders use.
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right">{km(s.distance_km)}</td>
                        <td className="px-3 py-2 text-right">{hours(s.map_app_hours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <LockedRow icon={<IconClock />} title="Real riding hours" reports={reports} />
            </section>
          ) : null}

          {/* ── Videos ──────────────────────────────────────────────── */}
          <section aria-labelledby="videos" className="flex flex-col gap-3">
            <SectionHeading id="videos" title="Riders’ videos" aside={route.videos.length ? plural(route.videos.length, "video") : undefined} />
            {route.videos.length > 0 ? (
              <>
                <Callout title="Watch the date, not the view">
                  Each video shows the road as it was when it was filmed. They play on YouTube, under the maker’s own
                  channel.
                </Callout>
                <div className="grid gap-2 md:grid-cols-2">
                  {route.videos.map((v) => (
                    <a
                      key={v.id}
                      href={v.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="card grid grid-cols-[120px_1fr] items-center gap-2.5 overflow-hidden hover:border-ink-2"
                    >
                      <span className="relative block h-[68px] bg-ink">
                        <Image
                          src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}
                          alt=""
                          width={320}
                          height={180}
                          sizes="120px"
                          className="size-full object-cover"
                        />
                        <span className="absolute inset-0 grid place-items-center text-surface">
                          <IconPlay className="size-6 drop-shadow" />
                        </span>
                      </span>
                      <span className="min-w-0 py-1.5 pr-2.5">
                        <b className="line-clamp-2 text-sm leading-[1.2rem]">{v.title}</b>
                        <span className="hint block text-xs">
                          {v.channel ?? "YouTube"}
                          {v.stretch ? ` · ${v.stretch}` : ""}
                          {v.filmed ? ` · filmed ${sayDate(v.filmed)}` : " · date filmed not known"}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <Empty title="No videos of this route yet">
                <span className="text-sm">Filmed it? Send the link with a trip report. It plays on YouTube, with your channel’s name.</span>
              </Empty>
            )}
            <Link className="btn btn-soft self-start" href={`/report?route=${route.slug}#video`}>
              Add a video
            </Link>
          </section>

          {/* ── Packing ─────────────────────────────────────────────── */}
          {packing ? (
            <section aria-labelledby="packing" className="flex flex-col gap-3">
              <SectionHeading id="packing" title="Packing list" aside="By month" />
              <PackingList list={packing} routeSlug={route.slug} />
            </section>
          ) : null}

          {/* ── From riders ─────────────────────────────────────────── */}
          <section aria-labelledby="from-riders" className="flex flex-col gap-3">
            <SectionHeading id="from-riders" title="Not here yet" aside="These come from riders" />
            <div className="card flex flex-col">
              <LockedRow icon={<IconShield />} title="Mechanics and puncture repair" reports={reports} flat />
              <LockedRow icon={<IconPeak />} title="Mobile network, halt by halt" reports={reports} flat />
              <LockedRow icon={<IconBag />} title="Stays with no online listing" reports={reports} flat />
              <LockedRow icon={<IconFlag />} title="Bikes riders took, and what the trip cost" reports={reports} flat />
            </div>
            <Callout tone="info" title="These come from riders, not from us">
              They appear when riders who have done this route send a trip report. {plural(reports, "trip report")} so
              far for {route.name}. Bikes, gear and costs show after 10.
            </Callout>
            <Link className="btn btn-primary self-start" href={`/report?route=${route.slug}`}>
              I have ridden this · send a trip report
            </Link>
          </section>

          {/* ── Gaps and sources ────────────────────────────────────── */}
          {route.gaps.length > 0 ? (
            <section aria-labelledby="gaps" className="flex flex-col gap-2">
              <SectionHeading id="gaps" title="What we could not find" aside={plural(route.gaps.length, "gap")} />
              <p className="hint">A gap is not a fact. It means we looked and found no source.</p>
              <details open={route.gaps.length <= 3}>
                <summary className="link cursor-pointer text-sm font-medium">
                  Show what is missing for {route.name}
                </summary>
                <ul className="card mt-2 flex flex-col text-sm">
                  {route.gaps.map((g) => (
                    <li key={g} className="flex gap-2 border-b border-line px-3 py-2 last:border-b-0">
                      <IconAlert className="mt-0.5 size-4 shrink-0 text-ageing-fg" />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          ) : null}

          <section aria-labelledby="sources" className="flex flex-col gap-2">
            <SectionHeading id="sources" title="Sources for this page" aside={plural(sources.length + 2, "source")} />
            <details>
              <summary className="link cursor-pointer text-sm font-medium">Show every source</summary>
              <ul className="mt-2 flex flex-col gap-2">
                <li className="hint">
                  Distances, the line of the road and fuel pumps: ©{" "}
                  <a className="link font-medium" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">
                    OpenStreetMap contributors
                  </a>
                  , Open Database Licence. Routes worked out with the Open Source Routing Machine.
                </li>
                <li className="hint">
                  Heights: NASA Shuttle Radar Topography Mission, public domain, served by Open Topo Data.
                </li>
                {sources.map((s) => (
                  <li key={s.url}>
                    <span className="text-sm">{s.title}</span>
                    <SourceLine source={s} prefix="" />
                  </li>
                ))}
              </ul>
            </details>
            <Link className="link self-start text-sm" href="/credits">
              Credits for the whole site
            </Link>
          </section>
        </div>

        {/* ── Side column ───────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-32 lg:self-start">
          {route.line.length > 0 ? <RouteLine line={route.line} waypoints={route.waypoints} /> : null}

          <section aria-labelledby="trips" className="flex flex-col gap-2">
            <SectionHeading id="trips" title="Trips on this route" aside={trips.length ? plural(trips.length, "trip") : undefined} />
            {trips.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {trips.map((t) => (
                  <li key={t.id}>
                    <Link href={`/trips/${t.id}`} className="card flex flex-col gap-0.5 px-3 py-2.5 hover:border-ink-2">
                      <b className="text-[0.9375rem]">
                        {sayDate(t.leaves_on)} to {sayDate(t.back_on)}
                      </b>
                      <span className="hint">
                        From {t.from_city} · led by {t.leader_name} · {t.going} of {t.places} going
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">Nobody has posted a trip here yet.</p>
            )}
            <Link className="btn btn-outline self-start" href={`/trips/new?route=${route.slug}`}>
              Post a trip on this route
            </Link>
          </section>

          <section id="save" className="scroll-mt-24">
            <Callout title="Going where there is no network?">
              Open this page once while you still have signal, on the morning you leave. Your phone keeps what it last
              showed. Saving a whole route for later is not built yet.
            </Callout>
          </section>
        </aside>
      </div>
    </div>
  );
}

function LockedRow({
  icon,
  title,
  reports,
  flat = false,
}: {
  icon: React.ReactNode;
  title: string;
  reports: number;
  flat?: boolean;
}) {
  return (
    <div
      className={`flex min-h-12 items-center gap-2.5 px-3 py-2.5 text-ink-2 ${
        flat ? "border-b border-line last:border-b-0" : "card"
      }`}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2">{icon}</span>
      <span className="min-w-0 flex-1">
        <b className="block text-[0.9375rem] leading-5">{title}</b>
        {flat ? null : (
          <span className="hint block">
            Not here yet. Comes from trip reports: {reports} so far.
          </span>
        )}
      </span>
      <IconLock className="size-4 shrink-0" />
    </div>
  );
}
