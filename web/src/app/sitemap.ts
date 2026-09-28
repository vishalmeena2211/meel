import type { MetadataRoute } from "next";

import { getIndex } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
import { routePaths } from "@/server/route-pages";
import { getRouteView } from "@/server/route-view";

/*
  Every page a rider might search for: the site's own pages, then for each route its page, its sections,
  its tools and every fact, each of which has an address of its own. Routes not written yet are left out.
  Made when the site is built, so it lists what that build contains.
*/
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/trips`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/tools`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/report`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/rules`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/credits`, changeFrequency: "monthly", priority: 0.3 },
  ];
  const seen = new Set(pages.map((p) => p.url));
  const add = (entry: MetadataRoute.Sitemap[number]) => {
    if (seen.has(entry.url)) return;
    seen.add(entry.url);
    pages.push(entry);
  };

  const index = await getIndex();
  for (const summary of index.routes) {
    const view = await getRouteView(summary.slug);
    if (!view || view.route.level === "unwritten") continue;
    const lastModified = new Date(`${view.route.built}T00:00:00Z`);
    const top = `/routes/${view.route.slug}`;
    for (const path of routePaths(view)) {
      add({ url: SITE_URL + path, lastModified, changeFrequency: "weekly", priority: path === top ? 0.9 : 0.6 });
    }
    for (const fact of view.views.all) {
      add({ url: SITE_URL + fact.href, lastModified, changeFrequency: "weekly", priority: 0.4 });
    }
  }
  return pages;
}
