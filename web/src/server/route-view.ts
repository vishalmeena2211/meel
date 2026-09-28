import "server-only";

import { cache } from "react";

import { getFactKinds, getIndex, getPackingList, getRoute } from "@/lib/content";
import { factViews, warningsIn, type FactView, type FactViews } from "@/lib/fact-view";
import { km, plural } from "@/lib/format";
import { FROM_REPORTS, FROM_RIDERS, REPORTS_NEEDED, SECTION_NAMES, SECTION_ORDER, type SectionId } from "@/lib/sections";
import { monthsFrom } from "@/lib/trip-checks";
import type { PackingList, Route, RouteSummary } from "@/lib/types";

import { confirmationsFor, tripReportCount, tripReportsUsed } from "./reports";
import { openTripsOnRoute, pastTripsOnRoute, type TripCard } from "./trips";

export interface RouteSection {
  id: SectionId;
  name: string;
  chip: string;
  href: string;
  /** One line under the name: what is inside, in numbers. */
  sub: string;
  /** Small warnings beside the name, such as "1 ageing". Most sections have none. */
  warn: Array<{ words: string; tone: "ageing" | "stale" }>;
}

export interface UsedReport {
  month: string;
  bike: string;
  by: string | null;
  body: Record<string, unknown>;
}

export interface RouteView {
  route: Route;
  views: FactViews;
  /** Sections that have something in them, in order. */
  sections: RouteSection[];
  /** Sections that wait for riders. */
  missing: Array<{ id: SectionId; name: string }>;
  packing: PackingList | null;
  /** Months of the usual season, 1 to 12. Null when the words could not be read. */
  seasonMonths: number[] | null;
  /** Trip reports sent for this route, read or not. */
  reports: number;
  /** Trip reports the editor has read and used. */
  used: UsedReport[];
  trips: TripCard[];
  pastTrips: TripCard[];
  /** Facts a rider or the editor has confirmed. */
  confirmed: number;
  nearby: RouteSummary[];
  halts: number;
  start: string;
  end: string;
}

function warnings(views: FactView[]): RouteSection["warn"] {
  const w = warningsIn(views);
  const out: RouteSection["warn"] = [];
  if (w.stale > 0) out.push({ words: `${w.stale} stale`, tone: "stale" });
  if (w.ageing > 0) out.push({ words: `${w.ageing} ageing`, tone: "ageing" });
  if (w.pending > 0) out.push({ words: `${w.pending} changed`, tone: "ageing" });
  if (w.conflict > 0) out.push({ words: `${w.conflict} disputed`, tone: "ageing" });
  return out.slice(0, 1);
}

const RULE_KINDS: Array<[string, string]> = [
  ["permit", "permits"],
  ["fee", "fees"],
  ["tax", "tolls"],
  ["motorcycle-rule", "rules for bikes"],
  ["timing", "timings"],
  ["document", "papers"],
];

function ruleWords(route: Route): string {
  const have = RULE_KINDS.filter(([kind]) => route.rules.some((r) => r.kind === kind)).map(([, word]) => word);
  const words = have.slice(0, 3).join(", ");
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Rules";
}

/** Everything one route's screens need, read once for each request. */
export const getRouteView = cache(async (slug: string): Promise<RouteView | null> => {
  const route = await getRoute(slug);
  if (!route) return null;
  const [kinds, index, packing, confirmations, used, reportCount, trips, pastTrips] = await Promise.all([
    getFactKinds(),
    getIndex(),
    getPackingList(route.terrain),
    confirmationsFor(slug),
    tripReportsUsed(slug),
    tripReportCount(slug),
    openTripsOnRoute(slug),
    pastTripsOnRoute(slug),
  ]);
  const views = factViews(route, confirmations, kinds, new Date());

  const halts = new Set(route.waypoints.filter((w) => w.kind === "place" && w.altitude_m !== null).map((w) => w.name)).size;
  const highEnough = (route.header.highest_point?.altitude_m ?? 0) >= 2500 && route.profile.length > 1 && halts >= 2;
  const gap = route.fuel.longest_gaps[0];
  const legs = new Set((route.leg_hours ?? []).map((l) => `${l.from}|${l.to}`)).size;
  const netHalts = new Set((route.network ?? []).map((n) => n.halt)).size;

  const has: Record<SectionId, boolean> = {
    open: route.authorities.length > 0 || route.season.history.length > 0 || (route.sightings?.length ?? 0) > 0,
    fuel: route.line.length > 0,
    rules: route.rules.length > 0,
    altitude: highEnough,
    road: route.hazards.length > 0,
    network: netHalts > 0,
    mechanics: views.mechanics.length > 0,
    hours: legs > 0,
    stays: views.stays.length > 0,
    packing: packing !== null,
    videos: route.level !== "unwritten",
    bikes: used.length >= REPORTS_NEEDED,
    costs: used.length >= REPORTS_NEEDED,
  };

  const sub: Record<SectionId, string> = {
    open: `${plural(route.authorities.length, "official source")} · we link, we do not guess`,
    fuel:
      route.fuel.pump_count > 0
        ? `${plural(route.fuel.pump_count, "pump")}${gap ? ` · longest gap ${km(gap.gap_km)}` : ""}`
        : "No pumps on the open map",
    rules: `${ruleWords(route)} · ${plural(route.rules.length, "fact")}`,
    altitude: plural(halts, "halt"),
    road: `${plural(route.hazards.length, "warning")} · from published guides`,
    network: plural(netHalts, "halt"),
    mechanics: plural(views.mechanics.length, "shop"),
    hours: `${plural(legs, "leg")} · from ${plural(used.length, "trip report")}`,
    stays: plural(views.stays.length, "place"),
    packing: "By month",
    videos: route.videos.length > 0 ? plural(route.videos.length, "rider video") : "None yet",
    bikes: `From ${plural(used.length, "trip report")}`,
    costs: `From ${plural(used.length, "trip report")}`,
  };

  const facts: Partial<Record<SectionId, FactView[]>> = {
    open: views.open,
    fuel: views.fuel,
    rules: views.rules,
    road: views.road,
    mechanics: views.mechanics,
    stays: views.stays,
  };

  const sections = SECTION_ORDER.filter((id) => has[id]).map((id) => ({
    id,
    ...SECTION_NAMES[id],
    href: `/routes/${slug}/${id}`,
    sub: sub[id],
    warn: warnings(facts[id] ?? []),
  }));

  const missing = [...FROM_RIDERS, ...FROM_REPORTS]
    .filter((id) => !has[id])
    .map((id) => ({ id, name: SECTION_NAMES[id].name }));

  const season = route.header.usual_season?.value;
  const mine = index.routes.find((r) => r.slug === slug);
  const nearby = index.routes
    .filter((r) => r.slug !== slug && r.region === (mine?.region ?? route.region) && r.level !== "unwritten")
    .slice(0, 3);

  return {
    route,
    views,
    sections,
    missing,
    packing,
    seasonMonths: season ? monthsFrom(season) : null,
    reports: Math.max(used.length, reportCount),
    used,
    trips,
    pastTrips,
    confirmed: views.all.filter((v) => v.state === "fresh" || v.state === "ageing" || v.state === "stale").length,
    nearby,
    halts,
    start: route.waypoints[0]?.name ?? route.places[0] ?? "Start",
    end: route.waypoints[route.waypoints.length - 1]?.name ?? route.places[route.places.length - 1] ?? "End",
  };
});
