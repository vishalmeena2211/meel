import type { FuelGap, Route, Waypoint } from "./types";

/*
  The few facts about a road that change what a rider packs: a long stretch with no ATM, a long stretch with no pump,
  and night halts high enough to freeze. The packing list gives them as reasons, and the packing list's search title
  and description name them too, so all three always say the same thing.
*/

/** Stretches shorter than these are ordinary, and keep the list's general reason. */
export const CASH_GAP_KM = 100;
export const FUEL_GAP_KM = 100;
/** Halts this high or higher are named in the reason for warm layers. */
export const COLD_HALT_M = 3500;

export function longCashGap(route: Route): { from: string; to: string; gap_km: number } | undefined {
  const gap = route.cash?.longest_gaps[0];
  return gap && gap.gap_km >= CASH_GAP_KM ? gap : undefined;
}

/** The longest stretch between pumps, when the route lists its pumps at all. */
export function fuelGap(route: Route): FuelGap | undefined {
  return route.fuel.pump_count > 0 ? route.fuel.longest_gaps[0] : undefined;
}

export function longFuelGap(route: Route): FuelGap | undefined {
  const gap = fuelGap(route);
  return gap && gap.gap_km >= FUEL_GAP_KM ? gap : undefined;
}

/** The highest night halts at or above COLD_HALT_M, highest first, each place once. */
export function coldHalts(route: Route, count = 2): Waypoint[] {
  const seen = new Set<string>();
  return route.waypoints
    .filter((w) => w.kind === "place" && (w.altitude_m ?? 0) >= COLD_HALT_M)
    .sort((a, b) => (b.altitude_m ?? 0) - (a.altitude_m ?? 0))
    .filter((w) => !seen.has(w.name) && seen.add(w.name))
    .slice(0, count);
}
