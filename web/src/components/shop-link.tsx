import type { ReactNode } from "react";

import { shopHrefFrom, type ShopFrom } from "@/lib/shop";
import type { ShopOffer } from "@/lib/types";

/*
  A shop link as a small outlined button that names the thing: "See winter gloves on Amazon ↗". Outlined, so it never
  competes with a page's own main button; named, so a rider knows what opens. It opens in a new tab, so the rider
  keeps their place, and it is marked as a paid link for search engines.

  A press is counted by the rider's browser (analytics-start.tsx adds the route), not by /go/: a program that follows
  the link without pressing it is never counted. The new tab leaves this page open long enough to send the count.
*/
export function ShopLink({ offer, from }: { offer: ShopOffer; from: ShopFrom }) {
  return (
    <a
      className="btn btn-outline !min-h-9 self-start !px-3 text-sm"
      href={shopHrefFrom(offer, from)}
      target="_blank"
      rel="sponsored nofollow noopener"
      data-track="Shop link opened"
      data-track-props={JSON.stringify({ item: offer.item, store: offer.store, from, counted_by: "browser" })}
    >
      See {offer.name} on {offer.store} ↗
    </a>
  );
}

/**
 * The thing that solves a problem the page has just shown, placed under it: the road's own reason first, then the
 * link, then the plain note that Meel may earn from it. Shown only when the route's data shows the problem.
 */
export function ShopNeed({
  children,
  offers,
  from,
  disclosure,
}: {
  children: ReactNode;
  offers: ShopOffer[];
  from: ShopFrom;
  disclosure: string | null;
}) {
  if (offers.length === 0) return null;
  return (
    <aside className="card flex flex-col gap-2 p-3" aria-label="Gear for this">
      <p className="text-sm leading-5">{children}</p>
      <div className="flex flex-wrap gap-2">
        {offers.map((o) => (
          <ShopLink key={o.href} offer={o} from={from} />
        ))}
      </div>
      <p className="hint text-xs">
        Meel may earn a small commission if you buy through these. {disclosure ?? ""}
      </p>
    </aside>
  );
}
