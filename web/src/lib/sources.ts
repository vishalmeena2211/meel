import type { Route, Source } from "./types";

/** Every page a route's facts came from, once each, in the order they are first used. */
export function allSources(route: Route): Source[] {
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
    for (const c of r.history) add(c.source);
  }
  for (const y of route.season.history) for (const s of y.sources) add(s);
  for (const a of route.authorities) add(a.source);
  for (const z of route.hazards) add(z.source);
  for (const m of route.mechanics ?? []) add(m.source);
  for (const s of route.stays ?? []) add(s.source);
  // Pumps taken from an oil company's own locator, where the open map had none.
  for (const p of route.fuel.pumps) add(p.source);
  return found;
}
