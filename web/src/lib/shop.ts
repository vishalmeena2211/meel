import type { ShopFile, ShopOffer } from "./types";

/*
  Shop links, wherever they are shown. Each goes through /go/<item> on Meel's own address, which adds the store's tag,
  so a tag or a store can change in one place.

  A click is counted with where the link was shown, so Meel can tell which places riders actually use, and it is
  counted where a person can be told from a program:
  - a link on one of Meel's pages is counted by the rider's browser when it is pressed (ShopLink's data-track), which
    leaves out programs and "Do Not Track" browsers like every other count on Meel;
  - a link from outside Meel (a video's description, from=youtube) has no Meel page to count it, so /go/ counts it on
    the server, only for a request that looks like a person's browser.
  Nothing else is counted. Programs that ignore robots.txt fetch /go/ addresses all day; counting every fetch on the
  server made robots look like riders (November 2026).
*/

/** Where a shop link was shown. "page" is what links carried before 23 November 2026; none is shown with it now. */
export const SHOP_FROM = ["page", "youtube", "packing", "fuel-check", "altitude", "daylight", "road"] as const;
export type ShopFrom = (typeof SHOP_FROM)[number];

/** The one place a link comes from outside Meel's pages, so it can only be counted by /go/ itself. */
export const SHOP_FROM_OUTSIDE: ShopFrom = "youtube";

/** A shop item as a link for one route. Null while the store has no tag, or the item is unknown. */
export function shopOffer(shop: ShopFile | null, key: string | undefined, routeSlug: string): ShopOffer | null {
  if (!shop || !key || !shop.store.tag.trim()) return null;
  const item = shop.items[key];
  if (!item) return null;
  return {
    item: key,
    store: shop.store.name,
    name: item.name ?? key.replace(/-/g, " "),
    href: `/go/${key}?route=${encodeURIComponent(routeSlug)}`,
  };
}

/** The link with where it was shown. */
export function shopHrefFrom(offer: ShopOffer, from: ShopFrom): string {
  return `${offer.href}&from=${from}`;
}
