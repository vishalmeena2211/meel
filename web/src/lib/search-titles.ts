import type { FactView } from "./fact-view";
import { feet, km, sayDate, stretchWords } from "./format";
import { coldHalts, fuelGap, longCashGap, longFuelGap } from "./road-facts";
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

/** Sections of facts get a title in the words riders search; so do the packing list and the fuel check. */
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
    case "packing":
      return packingSearchTitle(route);
    default:
      return fallback;
  }
}

/** The first title that fits; the last one if none does. */
function firstThatFits(...titles: string[]): string {
  return titles.find((t) => t.length <= ROOM) ?? titles.at(-1)!;
}

/** Sentences added in order, skipping any that would push the description past what Google shows. */
function sentences(...parts: Array<string | null | undefined>): string {
  let out = "";
  for (const p of parts) {
    if (!p) continue;
    const next = out ? `${out} ${p}` : p;
    if (next.length <= DESCRIPTION_ROOM) out = next;
  }
  return out;
}

const DESCRIPTION_ROOM = 160;

/** "From Keylong to Upshi." as "from Keylong to Upshi". */
function stretchPart(from: string, to: string): string {
  const words = stretchWords(from, to).replace(/\.$/, "");
  return words.charAt(0).toLowerCase() + words.slice(1);
}

/*
  Searched as "manali to leh bike trip packing list" or "what to carry for spiti". The title adds the one fact about
  this road that most changes what to pack, picked in the same order a rider would worry about it: freezing nights,
  then no ATM, then no pump.
*/
export function packingSearchTitle(route: Route): string {
  const short = shortRouteName(route);
  const cold = coldHalts(route, 1)[0];
  const cash = longCashGap(route);
  const fuel = longFuelGap(route);
  const base = firstThatFits(`${short} bike trip packing list`, `${short} packing list`);
  const hooks = [
    cold ? `: freezing nights at ${cold.name}` : null,
    cash ? `: no ATM for ${km(cash.gap_km)}` : null,
    fuel ? `: ${km(fuel.gap_km)} between pumps` : null,
    ", month by month",
  ].filter((h): h is string => h !== null);
  const hook = hooks.find((h) => (base + h).length <= ROOM);
  return hook ? base + hook : base;
}

export function packingDescription(route: Route): string {
  const short = shortRouteName(route);
  const cold = coldHalts(route);
  const cash = longCashGap(route);
  const fuel = longFuelGap(route);
  const coldWords = cold.map((w) => `${w.name} (${feet(w.altitude_m)})`).join(" and ");
  return sentences(
    `What to carry on ${short} by bike, month by month.`,
    cold.length ? `${coldWords} can drop below freezing at night, even in summer.` : null,
    cash ? `No ATM or bank for ${km(cash.gap_km)}, ${stretchPart(cash.from, cash.to)}.` : null,
    fuel ? `${km(fuel.gap_km)} between pumps, ${stretchPart(fuel.near_from, fuel.near_to)}.` : null,
    "A list you can tick off and keep on your phone.",
  );
}

/*
  The Fuel section already answers "petrol pumps on Manali to Leh". The fuel check answers the other question riders
  search: will my bike make it? So its title asks that, with the longest gap when it is long enough to worry about.
  A route with no pumps listed keeps the plain name: there is nothing to check against.
*/
export function fuelCheckSearchTitle(route: Route, fallback: string): string {
  const short = shortRouteName(route);
  if (!fuelGap(route)) return fallback;
  const long = longFuelGap(route);
  if (long) return firstThatFits(`${short}: can your tank do ${km(long.gap_km)}?`, `${short}: fuel range for your bike`, fallback);
  return firstThatFits(`${short}: fuel range for your bike`, `${short}: fuel range by bike`, fallback);
}

export function fuelCheckDescription(route: Route, bikeCount: number, fallback: string): string {
  const short = shortRouteName(route);
  const gap = fuelGap(route);
  if (!gap) return fallback;
  const bikes = bikeCount > 0 ? `${bikeCount} bikes to pick from, or enter your own tank and mileage.` : null;
  const long = longFuelGap(route);
  if (long) {
    return sentences(
      `Pick your bike and see if one tank covers the ${km(long.gap_km)} ${stretchPart(long.near_from, long.near_to)}, the longest stretch without a pump on ${short}.`,
      bikes,
    );
  }
  return sentences(
    `Pick your bike and see how far one tank goes on ${short}. The longest stretch without a pump is ${km(gap.gap_km)}.`,
    bikes,
  );
}
