/*
  Prints the search title and description of every route's packing list and fuel check, and fails when a title is
  longer than Google shows (" · Meel" is added after) or a description runs past about 160 letters.

    pnpm titles:check
*/
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  fuelCheckDescription,
  fuelCheckSearchTitle,
  packingDescription,
  packingSearchTitle,
} from "../src/lib/search-titles";
import type { Route } from "../src/lib/types";

const DATA = join(import.meta.dirname, "..", "..", "data");
const TITLE_MAX = 64;
const DESCRIPTION_MAX = 160;

const bikes = JSON.parse(readFileSync(join(DATA, "site", "bikes.json"), "utf8")) as unknown[];
const files = readdirSync(join(DATA, "routes")).filter((f) => f.endsWith(".json") && f !== "index.json");

let bad = 0;
for (const file of files.sort()) {
  const route = JSON.parse(readFileSync(join(DATA, "routes", file), "utf8")) as Route;
  const pages: Array<[string, string, string]> = [
    ["packing", packingSearchTitle(route), packingDescription(route)],
    [
      "fuel-check",
      fuelCheckSearchTitle(route, `Fuel check · ${route.name}`),
      fuelCheckDescription(route, bikes.length, "(plain description)"),
    ],
  ];
  for (const [page, title, description] of pages) {
    const problems = [
      title.length > TITLE_MAX && !title.startsWith("Fuel check · ") ? `title ${title.length} letters` : null,
      description.length > DESCRIPTION_MAX ? `description ${description.length} letters` : null,
      description.length === 0 ? "no description" : null,
    ].filter(Boolean);
    if (problems.length) bad++;
    console.log(`${route.slug}/${page}${problems.length ? `  <-- ${problems.join(", ")}` : ""}`);
    console.log(`  ${title} · Meel`);
    console.log(`  ${description}`);
  }
}
console.log(`\n${files.length * 2} pages, ${bad} with problems`);
process.exit(bad ? 1 : 0);
