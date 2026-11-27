/*
  Checks what Google shows for Meel's pages: the search title (" · Meel" is added after) and the line under it.

    pnpm titles:check              problems only, and a count of every page
    pnpm titles:check --all        every title and description
    pnpm titles:check <href> ...   the title and description of the pages named, as Google gets them

  It fails when:
  - a hand-written title or line (data/site/search-titles.json) names a page that does not exist, runs past the room
    Google gives it, or holds a number (a time, a distance) that is not in the fact itself, so a changed fact forces
    its hand-written title to change too;
  - a packing list, fuel check or route title runs past 56 letters;
  - any description runs past 155 letters, or is empty.
  A fact title written in the data that runs past 56 letters is counted but does not fail: Google cuts it.
*/
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { factViews, type FactView } from "../src/lib/fact-view";
import {
  factCanonical,
  factSearchDescription,
  factSearchTitle,
  fuelCheckDescription,
  fuelCheckSearchTitle,
  packingDescription,
  packingSearchTitle,
  routeSearchTitle,
  type SearchTitlesFile,
} from "../src/lib/search-titles";
import type { FactKind, Route } from "../src/lib/types";

const DATA = join(import.meta.dirname, "..", "..", "data");
const TITLE_MAX = 56;
const DESCRIPTION_MAX = 155;

const args = process.argv.slice(2);
const showAll = args.includes("--all");
const asked = args.filter((a) => a.startsWith("/routes/"));

const read = <T,>(...parts: string[]) => JSON.parse(readFileSync(join(DATA, ...parts), "utf8")) as T;
const bikes = read<unknown[]>("site", "bikes.json");
const kinds = read<{ kinds: FactKind[] }>("site", "fact-kinds.json").kinds;
const searchTitles = read<SearchTitlesFile>("site", "search-titles.json");
const routes = readdirSync(join(DATA, "routes"))
  .filter((f) => f.endsWith(".json") && f !== "index.json")
  .sort()
  .map((f) => read<Route>("routes", f));

const factRoutes = new Map<string, string[]>();
for (const route of routes) for (const rule of route.rules) factRoutes.set(rule.id, [...(factRoutes.get(rule.id) ?? []), route.slug]);

/** Every number in a text, written one way: "10.00 pm" and "10 pm" are both 10, "4:30" is 4.30. */
function numbers(text: string): string[] {
  return (text.match(/\d+(?:[.:]\d+)?/g) ?? []).map((n) => n.replace(":", ".").replace(/\.0+$/, ""));
}

let problems = 0;
let longFactTitles = 0;
let pages = 0;
const factsByHref = new Map<string, { fact: FactView; route: Route }>();
const routePages = new Set<string>();

function report(href: string, title: string, description: string, issues: Array<string | null>) {
  pages++;
  const found = issues.filter((i): i is string => i !== null);
  if (found.length) problems++;
  if (found.length || showAll || asked.includes(href)) {
    console.log(`${href}${found.length ? `  <-- ${found.join("; ")}` : ""}`);
    console.log(`  ${title} · Meel`);
    console.log(`  ${description}`);
  }
}

const descriptionIssues = (d: string) => [
  d.length > DESCRIPTION_MAX ? `description ${d.length} letters` : null,
  d.length === 0 ? "no description" : null,
];

const today = new Date();
for (const route of routes) {
  const top = `/routes/${route.slug}`;

  const routeOverride = searchTitles.pages[top];
  const routeTitle = routeSearchTitle(route, routeOverride);
  const isFallback = routeTitle === `${route.name} by motorcycle`;
  // A hand-written route title: its numbers must be the route's own (its length in km).
  const routeKnown = new Set(numbers(`${route.name} ${Math.round(route.header.distance_km ?? 0)}`));
  report(top, routeTitle, "(route description unchanged)", [
    routeTitle.length > TITLE_MAX && !isFallback ? `title ${routeTitle.length} letters` : null,
    ...numbers(routeOverride?.title ?? "")
      .filter((n) => !routeKnown.has(n))
      .map((n) => `"${n}" in the hand-written title is not the route's`),
  ]);
  routePages.add(top);

  const packTitle = packingSearchTitle(route);
  const packDescription = packingDescription(route);
  report(`${top}/packing`, packTitle, packDescription, [
    packTitle.length > TITLE_MAX ? `title ${packTitle.length} letters` : null,
    ...descriptionIssues(packDescription),
  ]);

  const fuelTitle = fuelCheckSearchTitle(route, `Fuel check · ${route.name}`);
  const fuelDescription = fuelCheckDescription(route, bikes.length, "(plain description)");
  report(`${top}/fuel-check`, fuelTitle, fuelDescription, [
    fuelTitle.length > TITLE_MAX && !fuelTitle.startsWith("Fuel check · ") ? `title ${fuelTitle.length} letters` : null,
    ...descriptionIssues(fuelDescription),
  ]);

  for (const fact of factViews(route, [], kinds, today).all) {
    factsByHref.set(fact.href, { fact, route });
    const override = searchTitles.pages[fact.href];
    const title = factSearchTitle(fact, route, override);
    const description = factSearchDescription(fact, override);
    const canonical = factCanonical(fact, searchTitles, factRoutes.get(fact.id) ?? []);
    if (title.length > TITLE_MAX && !override) longFactTitles++;
    report(fact.href, canonical === fact.href ? title : `${title}  [main page: ${canonical}]`, description, [
      ...descriptionIssues(description),
    ]);
  }
}

// The hand-written titles and lines: the page exists, they fit, and every number in them is in the fact.
for (const [href, override] of Object.entries(searchTitles.pages)) {
  if (routePages.has(href)) continue;
  const found = factsByHref.get(href);
  if (!found) {
    problems++;
    console.log(`${href}  <-- hand-written title for a page that does not exist`);
    continue;
  }
  const { fact, route } = found;
  const rule = route.rules.find((r) => r.id === fact.id);
  const factText = [fact.title, fact.answer, fact.short, fact.long, fact.snippet, rule?.detail].filter(Boolean).join(" ");
  const known = new Set(numbers(factText));
  const issues = [
    override.title && override.title.length > TITLE_MAX ? `hand-written title ${override.title.length} letters` : null,
    ...[override.title ?? "", override.lead ?? ""].flatMap((text) =>
      numbers(text)
        .filter((n) => !known.has(n))
        .map((n) => `"${n}" in "${text.slice(0, 40)}…" is not in the fact`),
    ),
  ].filter((i): i is string => i !== null);
  if (issues.length) {
    problems++;
    console.log(`${href}  <-- ${issues.join("; ")}`);
  }
}

for (const [from, to] of Object.entries(searchTitles.canonical)) {
  if (!factsByHref.has(from) || !factsByHref.has(to)) {
    problems++;
    console.log(`${from} -> ${to}  <-- a named main page, or the page pointing to it, does not exist`);
  }
}

console.log(
  `\n${pages} pages, ${problems} with problems. ` +
    `${longFactTitles} fact titles from the data run past ${TITLE_MAX} letters (Google cuts them; not a failure).`,
);
process.exit(problems ? 1 : 0);
