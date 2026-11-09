import { getShop } from "@/lib/content";
import { trackOnServer } from "@/server/analytics";

/*
  A shop link on a packing list, on Meel's own address. It sends the rider on to the store with Meel's tag, so a
  tag or a store can change in one place (site/shop.json) without breaking a link already shared or pasted into a
  video description, and so Meel can count which links riders open.

  It only ever sends riders to the store's own host, named in shop.json: never to an address taken from the request.
  Search engines are kept out (robots.ts, and the header below): these links are paid ones.
*/

const SOURCES = new Set(["page", "youtube"]);

function notHere(): Response {
  return new Response("No shop link here.", {
    status: 404,
    headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request, context: RouteContext<"/go/[item]">) {
  const { item } = await context.params;
  const shop = await getShop();
  const tag = shop?.store.tag.trim();
  const entry = shop && /^[a-z0-9-]{1,60}$/.test(item) ? shop.items[item] : undefined;
  if (!shop || !tag || !entry) return notHere();

  let target: URL;
  if (entry.url) {
    try {
      target = new URL(entry.url);
    } catch {
      return notHere();
    }
    if (target.protocol !== "https:" || target.hostname !== shop.store.host) return notHere();
  } else if (entry.search) {
    target = new URL(`https://${shop.store.host}/s`);
    target.searchParams.set("k", entry.search);
  } else {
    return notHere();
  }
  target.searchParams.set("tag", tag);

  const asked = new URL(request.url).searchParams;
  const route = asked.get("route") ?? "";
  const from = asked.get("from") ?? "page";
  await trackOnServer("Shop link opened", {
    item,
    store: shop.store.name,
    route: /^[a-z0-9-]{1,80}$/.test(route) ? route : "none",
    from: SOURCES.has(from) ? from : "page",
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer-when-downgrade",
    },
  });
}
