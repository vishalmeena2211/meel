import type { FactView } from "./fact-view";
import { feet, km, stretchWords } from "./format";
import { coldHalts, fuelGap, longCashGap, longFuelGap } from "./road-facts";
import type { SectionId } from "./sections";
import type { Route } from "./types";

/*
  The title a search result shows, which is not always the heading on the page. A rider searches "petrol pump in
  Munsiyari", "dabhol ferry timing" or "are bikes allowed on atal setu": the title says the answer in those words,
  and names the route only when the fact doesn't already. Google shows about 60 letters on a phone, and " · Meel" is
  added after, so a title keeps to 56. No month: the date is on the page and at the end of the description, and an
  old month in a title reads as stale next to the other results.

  The most-searched pages have titles and first lines written by hand, in data/site/search-titles.json, checked by
  `pnpm titles:check` against the fact so a hand-written number can't drift from it.
*/

const ROOM = 56;

/** data/site/search-titles.json: hand-written titles and first lines, and which copy of a repeated rule Google indexes. */
export interface SearchTitlesFile {
  pages: Record<string, SearchOverride>;
  /** A page that is the same as another page, mapped to the one Google should show. */
  canonical: Record<string, string>;
  /** A rule repeated on several routes: the route whose page is the one Google shows. */
  primary_route: Record<string, string>;
}

export interface SearchOverride {
  title?: string;
  /** The first line under a search result, before where the fact is from. */
  lead?: string;
}

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

/** Adds a part only while the title still fits. */
function fit(base: string, ...parts: Array<string | null>): string {
  let out = base;
  for (const p of parts) if (p && (out + p).length <= ROOM) out += p;
  return out;
}

/** A pump's own name that says nothing more than "a pump": OpenStreetMap often has just "Petrol pump". */
function genericPumpName(name: string): boolean {
  return /^(petrol|fuel|gas|diesel|filling)\s*(pump|station|bunk)s?$/i.test(name.trim());
}

/** The town a pump stands in: a place on the route within 1.5 km before it, the same rule as the pump's own page. */
function pumpTown(route: Route, at: number): string | null {
  if (at < 0.5) return route.waypoints[0]?.name ?? null;
  const before = route.waypoints.findLast((w) => w.km_from_start <= at + 0.5);
  return before && at - before.km_from_start < 1.5 ? before.name : null;
}

export function factSearchTitle(f: FactView, route: Route, override?: SearchOverride): string {
  if (override?.title) return override.title;
  const short = shortRouteName(route);
  if (f.section === "fuel") {
    // Searched as "petrol pump in Chitkul", "malvan cng pump", or by the pump's own name. "In" only when the pump is
    // in the town; "near" is the nearest named place, which can be some way off.
    const pump = route.fuel.pumps.find((p) => p.id === f.id);
    if (pump) {
      const kind = /\bcng\b/i.test(`${pump.name} ${pump.brand ?? ""}`) ? "Petrol and CNG pump" : "Petrol pump";
      const town = pumpTown(route, pump.km_from_start);
      const where = town ? `in ${town}` : pump.near ? `near ${pump.near}` : `on ${short}`;
      const brand = pump.brand && !pump.name.toLowerCase().includes(pump.brand.toLowerCase()) ? ` (${pump.brand})` : "";
      const label = genericPumpName(pump.name) ? (pump.brand ?? null) : `${pump.name}${brand}`;
      return firstThatFits(label ? `${kind} ${where}: ${label}` : `${kind} ${where}`, `${kind} ${where}`);
    }
  }
  if (f.section === "open") {
    // An office: searched when a road might be shut.
    return fit(`${f.title}: closures and road updates`, ` · ${short}`);
  }
  return fit(f.title, namesRoute(f.title, route) ? null : ` · ${short}`);
}

/**
 * The line under a search result: the answer first, cut at a sentence so it ends cleanly where Google stops showing,
 * then where it is from and when, if that still fits.
 */
export function factSearchDescription(f: FactView, override?: SearchOverride): string {
  return sentences(upTo(override?.lead ?? f.answer, DESCRIPTION_ROOM), f.trustShort);
}

/**
 * Searched as "manali to leh by bike" or "spiti circuit by bike": the route's own name, its two ends and how far, when
 * all of that fits. Otherwise the route keeps its full name, because the places riders search for (Kasol, Sach Pass,
 * Chopta) are in the name and not always at the ends. A loop keeps its name too.
 */
export function routeSearchTitle(route: Route, override?: SearchOverride): string {
  if (override?.title) return override.title;
  const fallback = `${route.name} by motorcycle`;
  const first = route.waypoints[0]?.name;
  const last = route.waypoints.at(-1)?.name;
  if (!first || !last || first === last || !route.header.distance_km) return fallback;
  const length = km(route.header.distance_km);
  const short = shortRouteName(route);
  const has = (place: string) => short.toLowerCase().includes(place.toLowerCase());
  const candidates =
    has(first) && has(last)
      ? [`${short} by bike: ${length} route guide`, `${short} by bike: ${length}`]
      : has(last)
        ? [`${short} from ${first}: ${length} by bike`]
        : [`${short}: ${first} to ${last}, ${length} by bike`];
  return firstThatFits(...candidates, fallback);
}

/** The page Google should show for a fact: itself, or the main copy of a rule repeated on several routes. */
export function factCanonical(f: FactView, file: SearchTitlesFile | null, routesWithFact: string[]): string {
  const named = file?.canonical[f.href];
  if (named) return named;
  if (routesWithFact.length < 2) return f.href;
  const wanted = file?.primary_route[f.id];
  const primary = wanted && routesWithFact.includes(wanted) ? wanted : [...routesWithFact].sort()[0]!;
  return `/routes/${primary}/${f.section}/${f.slug}`;
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

const DESCRIPTION_ROOM = 155;

/** Text cut to whole sentences that fit; one long sentence is cut at a word, with "…". */
function upTo(text: string, room: number): string {
  if (text.length <= room) return text;
  let out = "";
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > room) break;
    out = next;
  }
  if (out) return out;
  const cut = text.slice(0, room - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

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
