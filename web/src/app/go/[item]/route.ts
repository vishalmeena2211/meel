import { getShop } from "@/lib/content";
import { isRobotName } from "@/lib/robots";
import { SHOP_FROM_OUTSIDE } from "@/lib/shop";
import { trackOnServer } from "@/server/analytics";

/*
  A shop link, on Meel's own address. It sends a rider on to the store with Meel's tag, so a tag or a store can change
  in one place (site/shop.json) without breaking a link already shared or pasted into a video description.

  It only ever sends riders to the store's own host, named in shop.json: never to an address taken from the request.
  Search engines are kept out (robots.ts, and the header below): these links are paid ones.

  Who is asking decides what happens (shop.ts says why):
  - a program that names itself (robots.ts) is not sent on to the store, so robots never reach it with Meel's tag;
  - a link pressed on one of Meel's pages was already counted by the rider's browser, so it is only sent on;
  - a link from outside Meel (a video's description) is counted here, when the request looks like a person's
    browser opening a page, then sent on. Any other link, such as an old one with no "from", is only sent on.
*/

const NO_INDEX = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };

function notHere(): Response {
  return new Response("No shop link here.", { status: 404, headers: NO_INDEX });
}

function notForPrograms(): Response {
  return new Response("This is a shop link on Meel. It opens for people, not programs.", {
    status: 403,
    headers: { ...NO_INDEX, "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * A request from a person's browser opening a page. A browser says so itself (Sec-Fetch-Mode: navigate); older ones,
 * such as an iPhone before iOS 16.4, say nothing, so a missing signal is allowed and only a wrong one counts against it.
 */
function opensAsAPage(request: Request): boolean {
  const mode = request.headers.get("sec-fetch-mode");
  return mode === null || mode === "navigate";
}

export async function GET(request: Request, context: RouteContext<"/go/[item]">) {
  const { item } = await context.params;
  const shop = await getShop();
  const tag = shop?.store.tag.trim();
  const entry = shop && /^[a-z0-9-]{1,60}$/.test(item) ? shop.items[item] : undefined;
  if (!shop || !tag || !entry) return notHere();

  const agent = request.headers.get("user-agent") ?? "";
  if (agent === "" || isRobotName(agent)) return notForPrograms();

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
  if (asked.get("from") === SHOP_FROM_OUTSIDE && opensAsAPage(request)) {
    const route = asked.get("route") ?? "";
    await trackOnServer("Shop link opened", {
      item,
      store: shop.store.name,
      route: /^[a-z0-9-]{1,80}$/.test(route) ? route : "none",
      from: SHOP_FROM_OUTSIDE,
      counted_by: "server",
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      ...NO_INDEX,
      "Referrer-Policy": "no-referrer-when-downgrade",
    },
  });
}
