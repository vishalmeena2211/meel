import "server-only";

import { clock12, feet, km, monthName, stretchWords } from "@/lib/format";
import { coldHalts, longCashGap, longFuelGap } from "@/lib/road-facts";
import type { PackingItem, PackingList, Route, ShopFile } from "@/lib/types";

/*
  One route's packing list: the list for its kind of road, with this road's own reasons where its data has them,
  and a shop link beside each thing a rider can buy.

  The list itself never changes here. An item is on it because the road needs it, never because it sells; this only
  rewrites why, and says where to buy.
*/

/** A sunset before this, on the country's own clock, is named in the reason for a head lamp. */
const EARLY_SUNSET = "18:00";

/** "From Keylong to Upshi." as the end of a sentence: "from Keylong to Upshi." */
function stretch(from: string, to: string): string {
  const words = stretchWords(from, to);
  return words.charAt(0).toLowerCase() + words.slice(1);
}

function cashReason(route: Route): string | undefined {
  const gap = longCashGap(route);
  if (!gap) return undefined;
  return `No ATM or bank on the map for ${km(gap.gap_km)}, ${stretch(gap.from, gap.to)} Card machines and phone payments need a network.`;
}

function fuelReason(route: Route): string | undefined {
  const gap = longFuelGap(route);
  if (!gap) return undefined;
  return `${km(gap.gap_km)} between pumps, ${stretch(gap.near_from, gap.near_to)} Only if the fuel check says so for your bike.`;
}

function coldReason(route: Route): string | undefined {
  const high = coldHalts(route).map((w) => `${w.name} (${feet(w.altitude_m)})`);
  if (high.length === 0) return undefined;
  return `${high.join(" and ")} can drop below freezing at night, even in summer.`;
}

/** For each month with an early sunset at some halt: the earliest one, named. */
function sunsetReasons(route: Route, general: string): Record<number, string> | undefined {
  const halts = route.daylight ?? [];
  const out: Record<number, string> = {};
  for (let m = 1; m <= 12; m++) {
    let earliest: { name: string; set: string } | null = null;
    for (const h of halts) {
      const set = h.months[m - 1]?.[1];
      if (set && (!earliest || set < earliest.set)) earliest = { name: h.name, set };
    }
    if (earliest && earliest.set < EARLY_SUNSET) {
      out[m] = `Sunset at ${earliest.name} is ${clock12(earliest.set)} in ${monthName(m)}. ${general}`;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function waterReason(route: Route, general: string): string | undefined {
  const crossing = route.hazards.find((h) => /water crossing/i.test(h.title));
  return crossing ? `${crossing.title}. ${general}` : undefined;
}

function withPeriod(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/** Where a shop key's link goes on Meel's own address. Null while the store has no tag, or the key is unknown. */
export function shopHref(shop: ShopFile | null, key: string | undefined, routeSlug: string): string | null {
  if (!shop || !key || !shop.store.tag.trim() || !shop.items[key]) return null;
  return `/go/${key}?route=${encodeURIComponent(routeSlug)}`;
}

export function packingForRoute(list: PackingList | null, route: Route, shop: ShopFile | null): PackingList | null {
  if (!list) return null;
  const items: PackingItem[] = list.items.map((item) => {
    const general = withPeriod(item.reason);
    let road_reason: string | undefined;
    let month_reasons: Record<number, string> | undefined;
    if (/^Cash in small notes/i.test(item.item)) road_reason = cashReason(route);
    else if (item.shop === "fuel-can") road_reason = fuelReason(route);
    else if (item.shop === "winter-gloves" || item.shop === "warm-layer") road_reason = coldReason(route);
    else if (item.shop === "head-lamp") month_reasons = sunsetReasons(route, general);
    else if (item.shop === "waterproof-boots") road_reason = waterReason(route, general);

    const href = shopHref(shop, item.shop, route.slug);
    return {
      ...item,
      ...(road_reason ? { road_reason } : {}),
      ...(month_reasons ? { month_reasons } : {}),
      ...(href && shop ? { shop_link: { store: shop.store.name, href } } : {}),
    };
  });
  const anyShop = items.some((i) => i.shop_link);
  return { ...list, items, ...(anyShop && shop ? { shop_disclosure: shop.disclosure } : {}) };
}
