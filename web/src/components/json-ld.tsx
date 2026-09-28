/**
 * Structured data for search engines, as JSON-LD. Every "<" is escaped, so nothing in the data can end the
 * script early, even though all of it comes from Meel's own files.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** "Meel › Manali to Leh › Fuel": the trail search results show above a page's title. */
export function breadcrumbs(site: string, trail: Array<[name: string, path: string]>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${site}${path}`,
    })),
  };
}
