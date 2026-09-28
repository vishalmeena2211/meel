"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import { km, plural } from "@/lib/format";
import { spelledLike } from "@/lib/search";
import type { Region, RouteSummary } from "@/lib/types";

import { IconSearch } from "./icons";
import { SearchSuggest } from "./search-suggest";
import { Badge, Callout } from "./ui";

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

function RouteCard({ route, confirmed }: { route: RouteSummary; confirmed: number }) {
  const unwritten = route.level === "unwritten";
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
          <LevelBadge level={route.level} />
        </span>
        <span className="hint line-clamp-2">{route.places.join(", ")}</span>
        <span className="hint num">
          {unwritten
            ? "No page yet. Ridden it? Send a trip report."
            : confirmed > 0
              ? `${plural(route.facts, "fact")} · ${confirmed} confirmed by riders this week`
              : `${route.distance_km ? `${km(route.distance_km)} · ` : ""}${plural(route.facts, "fact")}`}
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

/**
 * Every route, drawn as a road. There is no map beneath and no border is drawn:
 * a road has no border, and a border drawn wrongly is against Indian law.
 * North is up. East and west are squeezed to match the latitude, so distances look right.
 */
function Roads({ routes, lines, named }: { routes: RouteSummary[]; lines: RoadLine[]; named: boolean }) {
  const mine = lines.filter((l) => routes.some((r) => r.slug === l.slug) && l.line.length > 1);
  if (mine.length === 0) return null;
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
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full bg-surface-2" role="img" aria-label={`${plural(mine.length, "route")}, each drawn as a road. North is up.`}>
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
            <a key={l.slug} href={`/routes/${l.slug}`} aria-label={route.name}>
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
                  fontSize={10.5}
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
        <text x={W - 8} y={14} textAnchor="end" fontSize={10} fill="var(--color-ink-2)">
          North is up
        </text>
      </svg>
      <figcaption className="hint flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-3 py-1.5 text-xs">
        <span className="flex items-center gap-1.5">
          <i className="h-0.5 w-5 bg-sign" />
          Full page
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-0.5 w-5 bg-ink-2" />
          Basic page
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-5 border-t-2 border-dashed border-rule" />
          Not written yet
        </span>
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
  confirmed,
}: {
  routes: RouteSummary[];
  regions: Region[];
  lines: RoadLine[];
  /** For each route, how many facts riders confirmed in the last seven days. */
  confirmed: Record<string, number>;
}) {
  const [region, setRegion] = useState<string>("all");
  // A search typed elsewhere on the site arrives in the address. What is typed here takes over from it.
  const asked = useSyncExternalStore(onAddress, askedInAddress, () => "");
  const [typed, setTyped] = useState<string | null>(null);
  const query = typed ?? asked;
  const setQuery = setTyped;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return routes.filter((r) => {
      if (region !== "all" && r.region !== region) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.region_name.toLowerCase().includes(q) ||
        r.places.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [routes, region, query]);

  const groups = regions
    .map((g) => ({ ...g, routes: shown.filter((r) => r.region === g.id) }))
    .filter((g) => g.routes.length > 0);
  const like = groups.length === 0 && query.trim() ? spelledLike(query, routes) : [];

  return (
    <div className="flex flex-col gap-4">
      <SearchSuggest
        routes={routes}
        value={query}
        onValueChange={setQuery}
        className="field-input flex items-center gap-2 !py-0 focus-within:border-sign focus-within:shadow-[0_0_0_3px_var(--color-sign-soft)]"
        // The frame shows the focus, so the box inside it draws none of its own.
        inputClassName="min-h-[44px] w-full bg-transparent !outline-none"
      >
        <IconSearch className="size-4 shrink-0 text-ink-2" />
      </SearchSuggest>

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
                  <RouteCard key={r.slug} route={r} confirmed={confirmed[r.slug] ?? 0} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <>
          <div className="scroll-row -mx-4 px-4 md:mx-0 md:px-0" role="group" aria-label="Region">
            <button type="button" className="chip" aria-pressed={region === "all"} onClick={() => setRegion("all")}>
              All
            </button>
            {regions.map((g) => (
              <button
                key={g.id}
                type="button"
                className="chip"
                aria-pressed={region === g.id}
                onClick={() => setRegion(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>

          <Roads routes={shown} lines={lines} named={region !== "all" || shown.length <= 8} />

          {groups.map((g) => (
            <section key={g.id} aria-labelledby={`region-${g.id}`} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <h2 id={`region-${g.id}`} className="display text-2xl">
                  {g.name}
                </h2>
                <span className="hint">{plural(g.routes.length, "route")}</span>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {g.routes.map((r) => (
                  <RouteCard key={r.slug} route={r} confirmed={confirmed[r.slug] ?? 0} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
