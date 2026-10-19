import type { Route } from "../types";

/*
  Ask Meel finds facts by meaning. Each fact on a route becomes one short entry, a "chunk", written the same way for
  the search index (scripts/ask-index.ts, which turns it into numbers) and for the answer (what the model reads).

  A chunk that is also a fact on the route page carries that fact's id, so its title, age and link are read live from
  the page's own fact (lib/fact-view.ts) when it is shown. The other chunks (the route overview, stretches, seasons,
  videos, heights and what Meel could not find) have ids of their own.

  This file must stay free of server-only imports: the index script runs it outside Next.js.
*/

export type ChunkKind =
  | "pump"
  | "rule"
  | "hazard"
  | "office"
  | "route"
  | "stretch"
  | "season"
  | "gaps"
  | "video"
  | "places";

export interface AskChunk {
  id: string;
  slug: string;
  kind: ChunkKind;
  title: string;
  /** One or two plain sentences. What is embedded, and what the model reads. */
  text: string;
  href: string;
  /** Distance from the start of the route, for a pump or a place. */
  km?: number;
}

const one = (n: number) => (Math.round(n * 10) / 10).toLocaleString("en-IN");
const feet = (m: number) => Math.round(m * 3.28084).toLocaleString("en-IN");
const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** Every chunk on one route. */
export function chunksOf(route: Route): AskChunk[] {
  const out: AskChunk[] = [];
  const at = `/routes/${route.slug}`;
  const start = route.waypoints[0]?.name ?? route.places[0] ?? "the start";
  const name = route.name;
  const h = route.header;

  // The route itself.
  const gap = route.fuel.longest_gaps[0];
  out.push({
    id: `route:${route.slug}`,
    slug: route.slug,
    kind: "route",
    title: name,
    href: at,
    text: [
      `${name} (${route.region_name}).`,
      route.one_line ? `${clean(route.one_line)}.` : null,
      route.places.length ? `Places on it: ${route.places.join(", ")}.` : null,
      h.distance_km ? `${one(h.distance_km)} km long.` : null,
      h.highway ? `Road: ${clean(h.highway.value)}.` : null,
      h.usual_days ? `Usual days: ${clean(h.usual_days.value)}.` : null,
      h.highest_point ? `Highest point: ${h.highest_point.name}, ${feet(h.highest_point.altitude_m)} ft (${h.highest_point.altitude_m} m).` : null,
      h.usual_season ? `Usually open or best: ${clean(h.usual_season.value)}.` : null,
      gap ? `Longest gap between pumps: ${one(gap.gap_km)} km, from near ${gap.near_from} to near ${gap.near_to}.` : null,
    ]
      .filter(Boolean)
      .join(" "),
  });

  // Places and their heights, as one entry: what an altitude or night-halt question needs.
  const placed = route.waypoints.filter((w) => w.altitude_m !== null);
  if (placed.length) {
    out.push({
      id: `places:${route.slug}`,
      slug: route.slug,
      kind: "places",
      title: `Places and heights on ${name}`,
      href: `${at}/altitude`,
      text: `Places and heights on ${name}, with distance from ${start}: ${placed
        .map((w) => `${w.name}${w.kind === "pass" ? " (pass)" : ""} ${feet(w.altitude_m as number)} ft at km ${one(w.km_from_start)}`)
        .join("; ")}.`,
    });
  }

  route.stretches.forEach((s, i) => {
    const mins = Math.round(s.map_app_hours * 60);
    const hm = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`;
    out.push({
      id: `stretch:${route.slug}:${i}`,
      slug: route.slug,
      kind: "stretch",
      title: `${s.from} to ${s.to}`,
      href: at,
      text: `On ${name}, ${s.from} to ${s.to} is ${one(s.distance_km)} km; a map app says ${hm} of riding.${s.doubtful ? " The open map may not know the road riders use here." : ""}`,
    });
  });

  // Pumps. The id is the fact's own.
  if (route.fuel.listed) {
    for (const p of route.fuel.pumps) {
      const before = route.waypoints.findLast((w) => w.km_from_start <= p.km_from_start + 0.5);
      const after = route.waypoints.find((w) => w.km_from_start > p.km_from_start + 0.5);
      const where =
        before && p.km_from_start - before.km_from_start < 1.5
          ? `in ${before.name}`
          : before && after
            ? `between ${before.name} and ${after.name}`
            : `${one(p.km_from_start)} km from ${start}`;
      out.push({
        id: p.id,
        slug: route.slug,
        kind: "pump",
        title: `${p.name}${p.near ? `, near ${p.near}` : ""}`,
        href: `${at}/fuel`,
        km: p.km_from_start,
        text: `Petrol pump on ${name}: ${p.brand && p.brand !== p.name ? `${p.brand}, ` : ""}${p.name}${p.near ? ` near ${p.near}` : ""}, ${where}, km ${one(p.km_from_start)} from ${start}.${p.opening_hours ? ` Hours on the map: ${p.opening_hours}.` : ""}`,
      });
    }
  }
  if (route.fuel.note) {
    out.push({ id: `fuelnote:${route.slug}`, slug: route.slug, kind: "gaps", title: `Fuel on ${name}`, href: `${at}/fuel`, text: `Fuel on ${name}: ${clean(route.fuel.note)}` });
  }

  for (const r of route.rules) {
    const changes = [...r.history]
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .slice(0, 3)
      .map((c) => `${c.date ?? "undated"}: ${clean(c.change)}`)
      .join(" ");
    out.push({
      id: r.id,
      slug: route.slug,
      kind: "rule",
      title: r.title,
      href: `${at}/rules`,
      text: `Rule on ${name}: ${clean(r.title)}. ${clean(r.detail)}${r.applies_to ? ` Applies to: ${clean(r.applies_to)}.` : ""}${r.set_by ? ` Set by: ${clean(r.set_by)}.` : ""}${r.has_official_order ? "" : " No government order was found; reported as what happens in practice."}${changes ? ` Past changes: ${changes}` : ""}`,
    });
  }

  for (const z of route.hazards) {
    out.push({
      id: z.id,
      slug: route.slug,
      kind: "hazard",
      title: z.title,
      href: `${at}/road`,
      text: `Road warning on ${name}: ${clean(z.title)}. ${clean(z.detail)}`,
    });
  }

  route.authorities.forEach((a, i) => {
    const twin = route.authorities.findIndex((b) => b.id === a.id) !== i;
    out.push({
      id: twin ? `${a.id}-${i + 1}` : a.id,
      slug: route.slug,
      kind: "office",
      title: a.office,
      href: `${at}/open`,
      text: `Office that announces road news for ${name}: ${clean(a.office)}. Announces: ${clean(a.announces)}.${a.stretch ? ` Covers ${clean(a.stretch)}.` : ""}${a.channel ? ` Where: ${clean(a.channel)}.` : ""}`,
    });
  });

  if (route.season.note) {
    out.push({ id: `seasonnote:${route.slug}`, slug: route.slug, kind: "season", title: `The season on ${name}`, href: `${at}/open`, text: `The season on ${name}: ${clean(route.season.note)}` });
  }
  for (const y of route.season.history) {
    out.push({
      id: `season:${route.slug}:${y.year}`,
      slug: route.slug,
      kind: "season",
      title: `${name}, season ${y.year}`,
      href: `${at}/open`,
      text: `${name} in ${y.year}: ${[
        y.connected ? `connected ${y.connected}` : null,
        y.open_to_motorcycles ? `open to motorcycles from ${y.open_to_motorcycles}` : null,
        y.closed ? `closed ${y.closed}` : "no closing date recorded",
      ]
        .filter(Boolean)
        .join("; ")}. ${clean(y.note)}`,
    });
  }

  route.gaps.forEach((g, i) => {
    out.push({ id: `gaps:${route.slug}:${i}`, slug: route.slug, kind: "gaps", title: `What Meel could not find on ${name}`, href: at, text: `What Meel looked for and could not find on ${name}: ${clean(g)}` });
  });

  for (const v of route.videos) {
    out.push({
      id: `video:${route.slug}:${v.id}`,
      slug: route.slug,
      kind: "video",
      title: v.title,
      href: `${at}/videos`,
      text: `Rider's video of ${name}${v.stretch ? `, ${v.stretch}` : ""}: "${clean(v.title)}"${v.channel ? ` by ${v.channel}` : ""}${v.filmed ? `, filmed ${v.filmed}` : ""}${v.bike ? `, on a ${v.bike}` : ""}.`,
    });
  }

  return out;
}

/** A short, stable fingerprint of a chunk's words: a chunk is embedded again only when this changes. */
export function hashOf(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return h1.toString(36) + h2.toString(36);
}
