/*
  Meel's helper for roads with no network.

  It does nothing until a rider chooses "Save to this phone" on a route. From then on:
  - with a network, every page comes from the network as usual, and a saved page is refreshed as it passes;
  - with no network, a saved page is answered from the phone.

  Nothing is saved without the rider asking. One route is one cache, named "meel-route-" and the route.
*/

const PREFIX = "meel-route-";
const SHARED = "meel-shared";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function assetsIn(html) {
  // The styles, scripts and lettering a saved page needs to draw itself.
  const found = new Set();
  for (const m of html.matchAll(/["'(](\/_next\/static\/[^"')\s\\]+)/g)) found.add(m[1]);
  return [...found];
}

async function saveRoute(route, pages, extras) {
  const cache = await caches.open(PREFIX + route);
  const shared = await caches.open(SHARED);
  let bytes = 0;
  let saved = 0;
  const assets = new Set(extras);
  for (const url of pages) {
    try {
      const reply = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      if (!reply.ok) continue;
      const copy = reply.clone();
      const body = await reply.text();
      bytes += body.length;
      saved += 1;
      await cache.put(url, copy);
      if ((copy.headers.get("content-type") || "").includes("text/html")) {
        for (const a of await assetsIn(body)) assets.add(a);
      }
    } catch {
      // One page could not be fetched. The rest are still worth keeping.
    }
  }
  for (const url of assets) {
    try {
      const had = await shared.match(url);
      if (had) continue;
      const reply = await fetch(url, { cache: "force-cache" });
      if (!reply.ok) continue;
      const copy = reply.clone();
      bytes += (await reply.arrayBuffer()).byteLength;
      await shared.put(url, copy);
    } catch {
      // As above.
    }
  }
  return { saved, bytes };
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  const port = event.ports && event.ports[0];
  if (data.type === "save" && typeof data.route === "string") {
    event.waitUntil(
      saveRoute(data.route, data.pages || [], data.extras || []).then(
        (result) => port && port.postMessage({ ok: result.saved > 0, ...result }),
        () => port && port.postMessage({ ok: false, saved: 0, bytes: 0 }),
      ),
    );
  }
  if (data.type === "remove" && typeof data.route === "string") {
    event.waitUntil(caches.delete(PREFIX + data.route).then(() => port && port.postMessage({ ok: true })));
  }
});

async function fromPhone(request) {
  const names = (await caches.keys()).filter((n) => n.startsWith(PREFIX) || n === SHARED);
  for (const name of names) {
    const cache = await caches.open(name);
    const hit = (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
    if (hit) return hit;
  }
  return null;
}

async function refresh(request, reply) {
  // A saved page that has just come from the network replaces the copy on the phone.
  const names = (await caches.keys()).filter((n) => n.startsWith(PREFIX));
  for (const name of names) {
    const cache = await caches.open(name);
    if (await cache.match(request)) await cache.put(request, reply.clone());
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // The site's own way of fetching part of a page. With no network it must fail, so the browser loads the whole page.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((reply) => {
        if (reply.ok) event.waitUntil(refresh(request, reply.clone()));
        return reply;
      })
      .catch(async () => {
        const hit = await fromPhone(request);
        if (hit) return hit;
        return new Response(
          "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>No network</title><body style='font:16px/1.5 system-ui;padding:24px;max-width:32rem;margin:auto'><h1 style='font-size:22px'>No network, and this page was not saved</h1><p>Only routes you chose to save open with no network. Go back to a saved route, or try again when you have a signal.</p><p><a href='/'>All routes</a></p>",
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      }),
  );
});
