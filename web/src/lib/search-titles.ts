import type { FactView } from "./fact-view";
import { sayDate } from "./format";
import type { SectionId } from "./sections";
import type { Route } from "./types";

/*
  The title a search result shows, which is not always the heading on the page. A rider searches "petrol pump in
  Munsiyari" or "toong check post": the title says the answer in those words, with the month it was last checked,
  and names the route only when the fact doesn't already. Google shows about 60 letters; " · Meel" is added after.
*/

const ROOM = 64;

/** "Munsiyari and the Kumaon hills" from "Munsiyari and the Kumaon hills: ..." */
export function shortRouteName(route: Route): string {
  return route.name.split(":")[0]!.trim();
}

/** Whether a title already names the route, by any of its own words ("North Sikkim: …" on North Sikkim). */
function namesRoute(title: string, route: Route): boolean {
  const words = shortRouteName(route)
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 && !["hills", "valley", "coast", "circuit", "route", "road"].includes(w));
  const t = title.toLowerCase();
  return words.some((w) => t.includes(w));
}

/** "Oct 2026", from a fact's last-checked date. */
function checked(f: FactView): string | null {
  return f.touched ? sayDate(f.touched.slice(0, 7), true) : null;
}

/** Adds a part only while the title still fits. */
function fit(base: string, ...parts: Array<string | null>): string {
  let out = base;
  for (const p of parts) if (p && (out + p).length <= ROOM) out += p;
  return out;
}

export function factSearchTitle(f: FactView, route: Route): string {
  const short = shortRouteName(route);
  if (f.section === "fuel") {
    // Searched as "petrol pump in Chitkul", "malvan cng pump", or by the pump's own name.
    const pump = route.fuel.pumps.find((p) => p.id === f.id);
    if (pump) {
      const kind = /\bcng\b/i.test(`${pump.name} ${pump.brand ?? ""}`) ? "Petrol and CNG pump" : "Petrol pump";
      const brand = pump.brand && !pump.name.toLowerCase().includes(pump.brand.toLowerCase()) ? ` (${pump.brand})` : "";
      const where = pump.near ? `near ${pump.near}` : `on ${short}`;
      return fit(`${kind} ${where}: ${pump.name}${brand}`, pump.near ? ` · ${short}` : null);
    }
  }
  if (f.section === "open") {
    // An office: searched when a road might be shut.
    return fit(`${f.title}: closures and road updates`, ` · ${short}`);
  }
  const when = checked(f);
  return fit(f.title, when ? ` (${when})` : null, namesRoute(f.title, route) ? null : ` · ${short}`);
}

/** Sections of facts get a title in the words riders search; tools keep their plain name. */
export function sectionSearchTitle(section: SectionId, route: Route, fallback: string): string {
  const short = shortRouteName(route);
  const year = route.built.slice(0, 4);
  switch (section) {
    case "fuel": {
      const n = route.fuel.pump_count;
      const gap = route.fuel.longest_gaps[0];
      if (!n) return `Fuel on ${short}`;
      return fit(`Petrol pumps on ${short}: ${n.toLocaleString("en-IN")} pumps`, gap ? `, longest gap ${Math.round(gap.gap_km)} km` : null);
    }
    case "rules":
      return fit(`${short}: permits and rules for bikes`, ` (${year})`);
    case "open":
      return fit(`Is ${short} open? Who announces closures`, ` (${year})`);
    case "road":
      return fit(`${short}: road warnings and trouble spots`, ` (${year})`);
    case "altitude":
      return fit(`${short}: altitude and where to sleep`, ` (${year})`);
    default:
      return fallback;
  }
}
