import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import type { SeasonFile } from "./seasons";

import type {
  Bike,
  FactKind,
  ImageCredit,
  PackingList,
  RideCity,
  Route,
  RouteApproach,
  RouteDistrict,
  RouteHelp,
  RouteIndex,
  RouteSummary,
  ShopFile,
  Terrain,
} from "./types";

const CONTENT = path.join(process.cwd(), "content");

async function readJson<T>(...parts: string[]): Promise<T | null> {
  try {
    const text = await readFile(path.join(CONTENT, ...parts), "utf8");
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export const getSeasons = cache(async (): Promise<SeasonFile["routes"]> => (await readJson<SeasonFile>("site", "seasons.json"))?.routes ?? {});

export const getIndex = cache(async (): Promise<RouteIndex> => {
  const [index, seasons] = await Promise.all([readJson<RouteIndex>("routes", "index.json"), getSeasons()]);
  if (!index) return { built: "", regions: [], routes: [] };
  // Each route card carries its months, for its season chip and the "In season now" list.
  return { ...index, routes: index.routes.map((r) => ({ ...r, season: seasons[r.slug]?.months ?? null })) };
});

export const getRoute = cache(async (slug: string): Promise<Route | null> => {
  // A slug is letters, digits and hyphens only. Anything else is not a route.
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  return readJson<Route>("routes", `${slug}.json`);
});

export async function getAllRoutes(): Promise<Route[]> {
  const index = await getIndex();
  const all = await Promise.all(index.routes.map((r) => getRoute(r.slug)));
  return all.filter((r): r is Route => r !== null);
}

export async function getSummary(slug: string): Promise<RouteSummary | null> {
  const index = await getIndex();
  return index.routes.find((r) => r.slug === slug) ?? null;
}

export const getBikes = cache(async (): Promise<Bike[]> => {
  const bikes = await readJson<Bike[]>("site", "bikes.json");
  return (bikes ?? []).filter((b) => typeof b.tank_litres === "number");
});

export const getPackingList = cache(
  async (terrain: Terrain): Promise<PackingList | null> =>
    readJson<PackingList>("site", "packing", `${terrain}.json`),
);

export const getShop = cache(async (): Promise<ShopFile | null> => readJson<ShopFile>("site", "shop.json"));

export const getFactKinds = cache(async (): Promise<FactKind[]> => {
  const file = await readJson<{ kinds: FactKind[] }>("site", "fact-kinds.json");
  return file?.kinds ?? [];
});

export const getImageCredits = cache(
  async (): Promise<Record<string, ImageCredit>> =>
    (await readJson<Record<string, ImageCredit>>("site", "image-credits.json")) ?? {},
);

const getDistrictFile = cache(
  async () => (await readJson<{ routes: Record<string, RouteDistrict[]> }>("site", "route-districts.json"))?.routes ?? {},
);

/** The districts a route's road passes through, in order. Empty for a route outside India, or not yet worked out. */
export async function getRouteDistricts(slug: string): Promise<RouteDistrict[]> {
  return (await getDistrictFile())[slug] ?? [];
}

const getHelpFile = cache(
  async () =>
    (await readJson<{ routes: Record<string, RouteHelp>; fetched: string }>("site", "route-help.json")) ?? {
      routes: {},
      fetched: "",
    },
);

const getApproachFile = cache(
  async () =>
    (await readJson<{ cities: RideCity[]; routes: Record<string, RouteApproach>; built: string }>(
      "site",
      "route-approaches.json",
    )) ?? { cities: [], routes: {}, built: "" },
);

/** The cities riders set out from, every route's distance from each, and the day they were worked out. */
export async function getApproaches(): Promise<{ cities: RideCity[]; routes: Record<string, RouteApproach>; built: string }> {
  return getApproachFile();
}

/** Hospitals and police stations near a route's road, and the day they were read from the open map. */
export async function getRouteHelp(slug: string): Promise<{ help: RouteHelp | null; fetched: string }> {
  const file = await getHelpFile();
  return { help: file.routes[slug] ?? null, fetched: file.fetched };
}
