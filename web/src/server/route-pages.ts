import "server-only";

import { TOOL_IDS } from "@/lib/sections";

import type { RouteView } from "./route-view";

/**
 * Every address that makes up one route. Used to build the pages ahead of time,
 * to keep a route on a rider's phone, and to make them again when a fact changes.
 */
export function routePaths(view: RouteView): string[] {
  const top = `/routes/${view.route.slug}`;
  const tools = TOOL_IDS.filter((t) => t !== "fuel-check" || view.route.fuel.longest_gaps.length > 0);
  return [top, ...view.sections.map((s) => s.href), ...tools.map((t) => `${top}/${t}`)];
}

export function savedPages(view: RouteView): { pages: string[]; extras: string[]; tools: number } {
  const { route } = view;
  const tools = ["fuel", "altitude", "packing"].filter((id) =>
    id === "fuel" ? route.fuel.longest_gaps.length > 0 : view.sections.some((s) => s.id === id),
  ).length;
  return {
    pages: [...routePaths(view), `/routes/${route.slug}/facts.json`],
    extras: route.image ? [`/route-images/${route.image.file}`] : [],
    tools,
  };
}
