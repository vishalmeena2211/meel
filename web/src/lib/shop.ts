import type { ShopFile, ShopOffer } from "./types";

/*
  Shop links, wherever they are shown. Each goes through /go/<item> on Meel's own address, which adds the store's tag
  and counts the click with where it came from, so Meel can tell which places riders actually use.
*/

/** Where a shop link was shown. /go/ records one of these; anything else is counted as "page". */
export const SHOP_FROM = ["page", "youtube", "packing", "fuel-check", "altitude", "daylight", "road"] as const;
export type ShopFrom = (typeof SHOP_FROM)[number];

/** A shop item as a link for one route. Null while the store has no tag, or the item is unknown. */
export function shopOffer(shop: ShopFile | null, key: string | undefined, routeSlug: string): ShopOffer | null {
  if (!shop || !key || !shop.store.tag.trim()) return null;
  const item = shop.items[key];
  if (!item) return null;
  return {
    store: shop.store.name,
    name: item.name ?? key.replace(/-/g, " "),
    href: `/go/${key}?route=${encodeURIComponent(routeSlug)}`,
  };
}

/** The link with where it was shown, for /go/ to count. */
export function shopHrefFrom(offer: ShopOffer, from: ShopFrom): string {
  return `${offer.href}&from=${from}`;
}
