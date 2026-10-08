import { feet, km } from "./format";
import { SITE_URL } from "./site";
import type { Route, Waypoint } from "./types";

/*
  A route taken to the rider's own map app. Meel draws no map: the app draws the road on its own map,
  from a file Meel writes (GPX) or from the app's own link with the places on the way.
*/

function xml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] ?? c);
}

const at = (lat: number, lon: number) => `lat="${lat.toFixed(5)}" lon="${lon.toFixed(5)}"`;

/** The route as a GPX 1.1 file: the road line, the named places and passes, and the pumps, with the map's credit inside. */
export function routeGpx(route: Route): string {
  const start = route.waypoints[0]?.name ?? "the start";
  const places = route.waypoints.map(
    (w) => `  <wpt ${at(w.lat, w.lon)}>${w.altitude_m !== null ? `<ele>${w.altitude_m}</ele>` : ""}<name>${xml(w.name)}</name><desc>${xml(
      [`${km(w.km_from_start)} from ${start}`, w.altitude_m !== null ? feet(w.altitude_m) : null].filter(Boolean).join(" · "),
    )}</desc><type>${w.kind === "pass" ? "Pass" : "Place"}</type></wpt>`,
  );
  const pumps = (route.fuel.listed ? route.fuel.pumps : []).map(
    (p) => `  <wpt ${at(p.lat, p.lon)}><name>${xml(p.name)}</name><desc>${xml(
      `${km(p.km_from_start)} from ${start}. ${p.source ? `From ${p.source.title}.` : "From the open map."} Not checked by Meel: it may be closed.`,
    )}</desc><sym>Gas Station</sym><type>Fuel</type></wpt>`,
  );
  const track = route.line.map(([lon, lat]) => `<trkpt ${at(lat, lon)}/>`).join("");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<gpx version="1.1" creator="Meel, ${SITE_URL}" xmlns="http://www.topografix.com/GPX/1/1">`,
    `  <metadata>`,
    `    <name>${xml(route.name)}</name>`,
    `    <desc>${xml(
      `${route.one_line ?? route.name}. Road line from OpenStreetMap contributors, Open Database Licence. Meel never says a road is open: check the offices on the route's page before you ride.`,
    )}</desc>`,
    `    <author><name>Meel</name><link href="${SITE_URL}"><text>Meel</text></link></author>`,
    `    <copyright author="OpenStreetMap contributors"><year>${route.built.slice(0, 4)}</year><license>https://opendatacommons.org/licenses/odbl/</license></copyright>`,
    `    <link href="${SITE_URL}/routes/${route.slug}"><text>${xml(route.name)} on Meel</text></link>`,
    `  </metadata>`,
    ...places,
    ...pumps,
    `  <trk><name>${xml(route.name)}</name><trkseg>${track}</trkseg></trk>`,
    `</gpx>`,
    ``,
  ].join("\n");
}

/** The places between the start and the end, at most `most` of them, spread along the road. */
function between(route: Route, most: number): Waypoint[] {
  const inner = route.waypoints.slice(1, -1);
  if (inner.length <= most) return inner;
  return Array.from({ length: most }, (_, i) => inner[Math.round(((i + 1) * (inner.length + 1)) / (most + 1)) - 1]).filter(
    (w, i, all): w is Waypoint => w !== undefined && all.indexOf(w) === i,
  );
}

const ll = (w: Waypoint) => `${w.lat.toFixed(5)},${w.lon.toFixed(5)}`;

/** Organic Maps' own link for directions through the places on the way. */
export function organicMapsLink(route: Route): string | null {
  const first = route.waypoints[0];
  const last = route.waypoints.at(-1);
  if (!first || !last || route.waypoints.length < 2) return null;
  const via = between(route, 8);
  const q = new URLSearchParams({
    origin: ll(first),
    origin_name: first.name,
    destination: ll(last),
    destination_name: last.name,
    mode: "drive",
  });
  if (via.length > 0) {
    q.set("waypoints", via.map(ll).join("|"));
    q.set("waypoint_names", via.map((w) => w.name).join("|"));
  }
  return `https://omaps.app/v2/dir?${q.toString()}`;
}

/** Google Maps' own link for two-wheeler directions. It takes at most nine places on the way. */
export function googleMapsLink(route: Route): string | null {
  const first = route.waypoints[0];
  const last = route.waypoints.at(-1);
  if (!first || !last || route.waypoints.length < 2) return null;
  const via = between(route, 9);
  const q = new URLSearchParams({ api: "1", origin: ll(first), destination: ll(last), travelmode: "two-wheeler" });
  if (via.length > 0) q.set("waypoints", via.map(ll).join("|"));
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}

/** A named place on a road: a city, or a route's first place. */
export interface RoadEnd {
  name: string;
  lat: number;
  lon: number;
}

/** The map apps' own links for the road from one place to another, such as from Delhi to Manali. */
export function roadLinks(from: RoadEnd, to: RoadEnd): { google: string; organic: string } {
  const at = (p: RoadEnd) => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`;
  const google = new URLSearchParams({ api: "1", origin: at(from), destination: at(to), travelmode: "two-wheeler" });
  const organic = new URLSearchParams({
    origin: at(from),
    origin_name: from.name,
    destination: at(to),
    destination_name: to.name,
    mode: "drive",
  });
  return {
    google: `https://www.google.com/maps/dir/?${google.toString()}`,
    organic: `https://omaps.app/v2/dir?${organic.toString()}`,
  };
}

/** Where the route file is served. */
export function gpxPath(slug: string): string {
  return `/routes/${slug}/route.gpx`;
}
