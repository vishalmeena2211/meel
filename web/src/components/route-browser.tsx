"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { track } from "@/lib/analytics";
import { km, plural } from "@/lib/format";
import { useHomeView } from "@/lib/home-view";
import { IN_THE_CITY_KM, useRidingFrom } from "@/lib/riding-from";
import { spelledLike } from "@/lib/search";
import type { Region, RouteSummary } from "@/lib/types";

import { IconSearch } from "./icons";
import { RidingFromField, type CityName } from "./riding-from";
import { SearchSuggest } from "./search-suggest";
import { Badge, Callout } from "./ui";

/** The cities riders set out from, and how far each route's start is from each, in km. */
export interface FromCities {
  cities: CityName[];
  routes: Record<string, { start: string; km: Record<string, number> }>;
}

/** How far a route's start is from the rider's city. */
interface FromCity {
  km: number;
  city: string;
  start: string;
}

export interface RoadLine {
  slug: string;
  /** [longitude, latitude] pairs, thinned to a few dozen. */
  line: [number, number][];
}

function LevelBadge({ level }: { level: RouteSummary["level"] }) {
  if (level === "full") return <Badge tone="full">Full page</Badge>;
  if (level === "basic") return <Badge>Basic page</Badge>;
  return <Badge tone="unchecked">Not written yet</Badge>;
}

function RouteCard({
  route,
  confirmed,
  showLevel,
  from,
}: {
  route: RouteSummary;
  confirmed: number;
  showLevel: boolean;
  from?: FromCity | null;
}) {
  const unwritten = route.level === "unwritten";
  // With a city picked, the distance to the start says more than the route's own length.
  const lead = from ? (from.km < IN_THE_CITY_KM ? `Starts in ${from.city}` : `${km(from.km)} from ${from.city}, to ${from.start}`) : null;
  return (
    <Link
      href={`/routes/${route.slug}`}
      className={`group flex overflow-hidden rounded-lg border bg-surface hover:border-ink-2 ${
        unwritten ? "border-dashed border-rule bg-surface-2" : "border-line"
      }`}
    >
      {route.image ? (
        <Image
          src={`/route-images/${route.image}`}
          alt=""
          width={640}
          height={427}
          sizes="112px"
          className="h-auto w-28 shrink-0 object-cover"
        />
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-2.5">
        <span className="flex items-start justify-between gap-2">
          <b className="display text-lg leading-tight">{route.name}</b>
          {showLevel ? <LevelBadge level={route.level} /> : null}
        </span>
        <span className="hint line-clamp-2">{route.places.join(", ")}</span>
        <span className="hint num">
          {unwritten
            ? `${lead ? `${lead} · ` : ""}No page yet. Ridden it? Send a trip report.`
            : confirmed > 0
              ? `${lead ? `${lead} · ` : ""}${plural(route.facts, "fact")} · ${confirmed} confirmed by riders this week`
              : `${lead ?? (route.distance_km ? km(route.distance_km) : "")}${lead || route.distance_km ? " · " : ""}${plural(route.facts, "fact")}`}
        </span>
      </span>
    </Link>
  );
}

const STROKE: Record<RouteSummary["level"], { colour: string; dash?: string; width: number }> = {
  full: { colour: "var(--color-sign)", width: 3.5 },
  basic: { colour: "var(--color-ink-2)", width: 2.5 },
  unwritten: { colour: "var(--color-rule)", dash: "4 4", width: 2 },
};

const KEY: Record<RouteSummary["level"], { name: string; one: string; line: string }> = {
  full: { name: "Full page", one: "a full page", line: "h-0.5 w-5 bg-sign" },
  basic: { name: "Basic page", one: "a basic page", line: "h-0.5 w-5 bg-ink-2" },
  unwritten: { name: "Not written yet", one: "a route not written yet", line: "w-5 border-t-2 border-dashed border-rule" },
};

/**
 * Every route, drawn as a road. There is no map beneath and no border is drawn:
 * a road has no border, and a border drawn wrongly is against Indian law.
 * North is up. East and west are squeezed to match the latitude, so distances look right.
 */
function Roads({ routes, lines, named }: { routes: RouteSummary[]; lines: RoadLine[]; named: boolean }) {
  const mine = lines.filter((l) => routes.some((r) => r.slug === l.slug) && l.line.length > 1);
  if (mine.length === 0) return null;
  const kinds = (["full", "basic", "unwritten"] as const).filter((k) =>
    mine.some((l) => routes.find((r) => r.slug === l.slug)?.level === k),
  );
  const W = 343;
  const H = 214;
  const pad = 18;
  const all = mine.flatMap((l) => l.line);
  const lats = all.map((p) => p[1]);
  const lons = all.map((p) => p[0]);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const squeeze = Math.cos((midLat * Math.PI) / 180);
  const minX = Math.min(...lons) * squeeze;
  const maxX = Math.max(...lons) * squeeze;
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const scale = Math.min((W - 2 * pad) / Math.max(maxX - minX, 0.05), (H - 2 * pad) / Math.max(maxY - minY, 0.05));
  const offX = (W - (maxX - minX) * scale) / 2;
  const offY = (H - (maxY - minY) * scale) / 2;
  const px = (lon: number) => offX + (lon * squeeze - minX) * scale;
  const py = (lat: number) => H - offY - (lat - minY) * scale;

  const placed: Array<{ x: number; y: number }> = [];
  return (
    <figure className="card overflow-hidden">
      <span className="sr-only">{plural(mine.length, "route")} drawn as roads, north up. The same routes are in the list.</span>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto max-h-[360px] w-full bg-surface-2" aria-hidden="true">
        {mine.map((l) => {
          const route = routes.find((r) => r.slug === l.slug);
          if (!route) return null;
          const look = STROKE[route.level];
          const points = l.line.map((p) => `${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(" ");
          const mid = l.line[Math.floor(l.line.length / 2)] ?? l.line[0];
          const x = mid ? px(mid[0]) : 0;
          const y = mid ? py(mid[1]) : 0;
          const clear = placed.every((p) => Math.abs(p.x - x) > 70 || Math.abs(p.y - y) > 14);
          const label = named && clear;
          if (label) placed.push({ x, y });
          return (
            <a key={l.slug} href={`/routes/${l.slug}`} tabIndex={-1}>
              <polyline points={points} fill="none" stroke="transparent" strokeWidth={14} />
              <polyline
                points={points}
                fill="none"
                stroke={look.colour}
                strokeWidth={look.width}
                strokeDasharray={look.dash}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {label ? (
                <text
                  x={x > W - 90 ? x - 6 : x + 6}
                  y={y - 5}
                  textAnchor={x > W - 90 ? "end" : "start"}
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--color-ink)"
                  stroke="var(--color-surface-2)"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {route.name.length > 26 ? `${route.name.slice(0, 24)}…` : route.name}
                </text>
              ) : null}
            </a>
          );
        })}
        <text x={W - 8} y={15} textAnchor="end" fontSize={12} fill="var(--color-ink-2)">
          North is up
        </text>
      </svg>
      <figcaption className="hint flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-3 py-1.5 text-xs">
        {/* The key lists only the kinds of page drawn. One kind is said in words. */}
        {kinds.length === 1 ? (
          <span>Every road drawn here is {KEY[kinds[0] ?? "basic"].one}.</span>
        ) : (
          kinds.map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <i className={KEY[k].line} />
              {KEY[k].name}
            </span>
          ))
        )}
        <span className="basis-full">
          Roads only, with nothing beneath. Drawn from{" "}
          <a className="link font-medium" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">
            OpenStreetMap contributors
          </a>
          ’ data.
        </span>
      </figcaption>
    </figure>
  );
}

function onAddress(changed: () => void): () => void {
  window.addEventListener("popstate", changed);
  return () => window.removeEventListener("popstate", changed);
}

function askedInAddress(): string {
  return (new URLSearchParams(window.location.search).get("q") ?? "").slice(0, 80);
}

export function RouteBrowser({
  routes,
  regions,
  lines,
  fromCities,
  confirmed,
}: {
  routes: RouteSummary[];
  regions: Region[];
  lines: RoadLine[];
  fromCities: FromCities;
  /** For each route, how many facts riders confirmed in the last seven days. */
  confirmed: Record<string, number>;
}) {
  // With a city picked, the list starts nearest first (wireframes, screen 36). A chip, once tapped, wins.
  const picked = useRidingFrom();
  const city = fromCities.cities.find((c) => c.id === picked) ?? null;
  const cityId = city?.id ?? null;
  const [chip, setRegion] = useState<string | null>(null);
  const region = chip === "nearest" && !city ? "all" : (chip ?? (city ? "nearest" : "all"));
  const fromHere = (slug: string): FromCity | null => {
    const r = fromCities.routes[slug];
    const d = city ? r?.km[city.id] : undefined;
    return city && r && d !== undefined ? { km: d, city: city.name, start: r.start } : null;
  };
  // On a phone, the list or the drawing, chosen in the header. From a tablet up, both.
  const view = useHomeView();
  // A card's badge says how fully a route is written. While every route is written the same way, it says nothing.
  const showLevel = new Set(routes.map((r) => r.level)).size > 1;
  // A search typed elsewhere on the site arrives in the address. What is typed here takes over from it.
  const asked = useSyncExternalStore(onAddress, askedInAddress, () => "");
  const [typed, setTyped] = useState<string | null>(null);
  const query = typed ?? asked;
  const setQuery = setTyped;

  // Fifty routes: filtered and sorted afresh each time. The React Compiler keeps it from being redone needlessly.
  const shown = (() => {
    const q = query.trim().toLowerCase();
    const found = routes.filter((r) => {
      if (region !== "all" && region !== "nearest" && r.region !== region) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.region_name.toLowerCase().includes(q) ||
        r.places.some((p) => p.toLowerCase().includes(q))
      );
    });
    if (!cityId) return found;
    const away = (slug: string) => fromCities.routes[slug]?.km[cityId] ?? Number.POSITIVE_INFINITY;
    return [...found].sort((a, b) => away(a.slug) - away(b.slug));
  })();

  const groups =
    region === "nearest" && city
      ? [{ id: "nearest", name: `Nearest to ${city.name}`, routes: shown }]
      : regions.map((g) => ({ ...g, routes: shown.filter((r) => r.region === g.id) })).filter((g) => g.routes.length > 0);
  const like = groups.length === 0 && query.trim() ? spelledLike(query, routes) : [];

  // A search that finds nothing tells Meel which roads riders look for. Only how many letters were typed is sent,
  // never what, and only once the rider has stopped typing.
  const nothing = query.trim().length >= 3 && shown.length === 0 ? query.trim().length : 0;
  useEffect(() => {
    if (nothing === 0) return;
    const later = window.setTimeout(() => track("Search found nothing", { letters: nothing }), 1500);
    return () => window.clearTimeout(later);
  }, [nothing, query]);

  return (
    <div className="flex flex-col gap-4">
      <SearchSuggest
        routes={routes}
        value={query}
        onValueChange={setQuery}
        className="field-input flex items-center gap-2 !py-0 focus-within:border-sign focus-within:shadow-[0_0_0_3px_var(--color-sign-soft)]"
        // The frame shows the focus, so the box inside it draws none of its own.
        inputClassName="min-h-[44px] w-full bg-transparent pr-8 outline-none"
      >
        <IconSearch className="size-4 shrink-0 text-ink-2" />
      </SearchSuggest>
      {fromCities.cities.length > 0 ? (
        <div className="md:max-w-xs">
          <RidingFromField cities={fromCities.cities} />
        </div>
      ) : null}

      {groups.length === 0 ? (
        <>
          <Callout title={query ? `No route called “${query.trim()}” yet` : "No routes here yet"}>
            Meel has {routes.length} routes so far. Tell us about this one and it goes on the list.
          </Callout>
          <Link className="btn btn-primary btn-block md:w-auto md:self-start" href={`/report?suggest=${encodeURIComponent(query.trim())}`}>
            Suggest this place
          </Link>
          {like.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="label">Routes with names like it</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {like.map((r) => (
                  <RouteCard
                    key={r.slug}
                    route={r}
                    confirmed={confirmed[r.slug] ?? 0}
                    showLevel={showLevel}
                    from={fromHere(r.slug)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <>
          {/* Sideways on a phone. From a tablet up the chips wrap, so a mouse can reach every region. */}
          <div className="scroll-row -mx-4 px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0" role="group" aria-label="Region">
            {city ? (
              <button
                type="button"
                className="chip"
                aria-pressed={region === "nearest"}
                onClick={() => setRegion("nearest")}
                data-track="Routes filtered by region"
                data-track-props='{"region":"nearest"}'
              >
                Nearest first
              </button>
            ) : null}
            <button
              type="button"
              className="chip"
              aria-pressed={region === "all"}
              onClick={() => setRegion("all")}
              data-track="Routes filtered by region"
              data-track-props='{"region":"all"}'
            >
              All
            </button>
            {regions.map((g) => (
              <button
                key={g.id}
                type="button"
                className="chip"
                aria-pressed={region === g.id}
                onClick={() => setRegion(g.id)}
                data-track="Routes filtered by region"
                data-track-props={JSON.stringify({ region: g.id })}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* On a laptop the routes come first, with the drawing beside them, in view as the list scrolls. */}
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
            <div className={`lg:sticky lg:top-20 lg:order-2 ${view === "map" ? "" : "hidden md:block"}`}>
              <Roads routes={shown} lines={lines} named={region !== "all" || shown.length <= 8} />
            </div>

            <div className={`flex-col gap-4 lg:order-1 ${view === "map" ? "hidden md:flex" : "flex"}`}>
              {groups.map((g) => (
                <section key={g.id} aria-labelledby={`region-${g.id}`} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <h2 id={`region-${g.id}`} className="display text-2xl">
                      {g.name}
                    </h2>
                    <span className="hint">
                      {g.id === "nearest" ? "by road, to where each starts" : plural(g.routes.length, "route")}
                    </span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {g.routes.map((r) => (
                      <RouteCard
                        key={r.slug}
                        route={r}
                        confirmed={confirmed[r.slug] ?? 0}
                        showLevel={showLevel}
                        from={fromHere(r.slug)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
