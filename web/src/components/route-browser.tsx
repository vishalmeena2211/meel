"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { km, plural } from "@/lib/format";
import type { Region, RouteSummary } from "@/lib/types";

import { IconSearch } from "./icons";
import { Badge, Empty } from "./ui";

function LevelBadge({ level }: { level: RouteSummary["level"] }) {
  if (level === "full") return <Badge tone="full">Full page</Badge>;
  if (level === "basic") return <Badge>Basic page</Badge>;
  return <Badge tone="unchecked">Not written yet</Badge>;
}

function RouteCard({ route }: { route: RouteSummary }) {
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
          {route.distance_km ? `${km(route.distance_km)} · ` : ""}
          {unwritten ? "No page yet. Ridden it? Send a trip report." : plural(route.facts, "fact")}
        </span>
      </span>
    </Link>
  );
}

export function RouteBrowser({ routes, regions }: { routes: RouteSummary[]; regions: Region[] }) {
  const [region, setRegion] = useState<string>("all");
  const [query, setQuery] = useState("");

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

  return (
    <div className="flex flex-col gap-4">
      <label className="field-input flex items-center gap-2 !py-0">
        <IconSearch className="size-4 shrink-0 text-ink-2" />
        <span className="sr-only">Search a route or place</span>
        <input
          id="route-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a route or place"
          className="min-h-[44px] w-full bg-transparent outline-none"
          autoComplete="off"
        />
      </label>

      <div className="scroll-row" role="group" aria-label="Region">
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

      {groups.length === 0 ? (
        <Empty title={query ? `No route called “${query}” yet` : "No routes here yet"}>
          <span className="text-sm">
            Meel has {routes.length} routes so far. Tell us about this one and it goes on the list.
          </span>
          <Link className="btn btn-soft" href={`/report?suggest=${encodeURIComponent(query)}`}>
            Suggest this place
          </Link>
        </Empty>
      ) : (
        groups.map((g) => (
          <section key={g.id} aria-labelledby={`region-${g.id}`} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 id={`region-${g.id}`} className="display text-2xl">
                {g.name}
              </h2>
              <span className="hint">{plural(g.routes.length, "route")}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {g.routes.map((r) => (
                <RouteCard key={r.slug} route={r} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
