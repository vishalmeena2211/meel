import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/*
  What search engines may fetch. Pages that should stay out of search results, such as logging in or a
  rider's account, are not blocked here but say "noindex" themselves: a page blocked here cannot be read,
  so its "noindex" would never be seen. Any host other than rideplanner.in is kept out of search by a
  header set in next.config.ts.
*/
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/editor", "/routes/*/facts.json"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
