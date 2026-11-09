import "server-only";

import { getIndex, getRoute } from "@/lib/content";
import type { RouteSummary } from "@/lib/types";

/*
  Which routes are near each other, for "Nearby routes" on a route page and "Trips on roads nearby".

  Two routes are near when they share a night halt (Leh, Srinagar, Padum, Gangtok…), or when a halt on one is within
  NEAR_KM of a halt on the other. The two very long routes (Golden Quadrilateral, Kashmir to Kanyakumari) pass near
  almost everything, so they list the short routes they pass, but are not listed on a short route's page.

  Worked out once per server process from every route's halts. The routes only change with a new build.
*/

const NEAR_KM = 50;
const MOST = 6;
const LONG_REGION = "long";

interface Halt {
  name: string;
  lat: number;
  lon: number;
}

function kmBetween(a: Halt, b: Halt): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** How many halts of one route are shared with, or near, a halt of the other. */
function closeness(a: Halt[], b: Halt[]): number {
  let n = 0;
  for (const x of a) if (b.some((y) => y.name === x.name || kmBetween(x, y) <= NEAR_KM)) n++;
  return n;
}

let memo: { built: string; near: Promise<Map<string, string[]>> } | null = null;

async function nearMap(): Promise<Map<string, string[]>> {
  const index = await getIndex();
  if (memo && memo.built === index.built) return memo.near;
  const near = (async () => {
    const written = index.routes.filter((r) => r.level !== "unwritten");
    const halts = new Map<string, Halt[]>();
    for (const r of written) {
      const route = await getRoute(r.slug);
      halts.set(
        r.slug,
        (route?.waypoints ?? []).filter((w) => w.kind === "place").map((w) => ({ name: w.name, lat: w.lat, lon: w.lon })),
      );
    }
    const out = new Map<string, string[]>();
    for (const r of written) {
      const mine = halts.get(r.slug) ?? [];
      const ranked = written
        .filter((o) => o.slug !== r.slug && (r.region === LONG_REGION || o.region !== LONG_REGION))
        .map((o) => ({ slug: o.slug, score: closeness(mine, halts.get(o.slug) ?? []) }))
        .filter((o) => o.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, MOST)
        .map((o) => o.slug);
      out.set(r.slug, ranked);
    }
    return out;
  })();
  memo = { built: index.built, near };
  return near;
}

/**
 * Routes near this one, closest first. A route with nothing near (Kerala hills, say) falls back to written routes in
 * its own region, so the list is never empty when a neighbour exists.
 */
export async function nearbyRoutes(slug: string, region: string): Promise<RouteSummary[]> {
  const index = await getIndex();
  const bySlug = new Map(index.routes.map((r) => [r.slug, r]));
  const near = ((await nearMap()).get(slug) ?? []).map((s) => bySlug.get(s)).filter((r): r is RouteSummary => !!r);
  if (near.length > 0) return near;
  return index.routes.filter((r) => r.slug !== slug && r.region === region && r.level !== "unwritten").slice(0, 3);
}
