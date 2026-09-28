import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageTitle } from "@/components/form";
import { Callout } from "@/components/ui";
import { getAllRoutes, getBikes } from "@/lib/content";
import { hostOf, plural } from "@/lib/format";

export const metadata: Metadata = {
  title: "Credits and sources",
  description: "Everything Meel is built on: the open map, NASA's heights, fifty photographers, and the source of every fact.",
};

export default async function CreditsPage() {
  const [routes, bikes] = await Promise.all([getAllRoutes(), getBikes()]);
  const pictured = routes.filter((r) => r.image !== null);
  const urls = new Set<string>();
  let videos = 0;
  for (const r of routes) {
    for (const x of r.rules) {
      urls.add(x.source.url);
      for (const h of x.history) urls.add(h.source.url);
    }
    for (const y of r.season.history) for (const s of y.sources) urls.add(s.url);
    for (const a of r.authorities) urls.add(a.source.url);
    for (const h of r.hazards) urls.add(h.source.url);
    videos += r.videos.length;
  }
  const hosts = new Map<string, number>();
  for (const u of urls) hosts.set(hostOf(u), (hosts.get(hostOf(u)) ?? 0) + 1);
  const topHosts = [...hosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageTitle
        title="Credits and sources"
        lede="Meel is built on other people’s work. This page names all of it."
        phone={{ sub: "Meel", back: "/" }}
      />
      <p className="text-sm md:hidden">Meel is built on other people’s work. This page names all of it.</p>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">Maps, distances and fuel pumps</h2>
        <div className="card flex flex-col gap-1 px-3 py-2.5 text-[0.9375rem]">
          <b>
            ©{" "}
            <a className="link" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">
              OpenStreetMap contributors
            </a>
          </b>
          <span className="hint">
            Positions of places, the line of each road, and every fuel pump. Used under the{" "}
            <a className="link font-medium" href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noreferrer noopener">
              Open Database Licence
            </a>
            . Places were looked up with Nominatim, roads worked out with the{" "}
            <a className="link font-medium" href="https://project-osrm.org/" target="_blank" rel="noreferrer noopener">
              Open Source Routing Machine
            </a>
            , and pumps found with the Overpass service.
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">Heights</h2>
        <div className="card flex flex-col gap-1 px-3 py-2.5 text-[0.9375rem]">
          <b>NASA Shuttle Radar Topography Mission</b>
          <span className="hint">
            Public domain. Served by{" "}
            <a className="link font-medium" href="https://www.opentopodata.org/datasets/srtm/" target="_blank" rel="noreferrer noopener">
              Open Topo Data
            </a>
            . Heights are read from a 90 m grid and can differ from a signboard by some tens of metres.
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">Pictures · {pictured.length}</h2>
        <p className="hint">
          All from Wikimedia Commons, each under a free licence. Every picture has been resized. Those marked “edited by”
          were edited by that person before Meel used them. Nothing else was changed.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {pictured.map((r) =>
            r.image ? (
              <li key={r.slug} className="card grid grid-cols-[96px_1fr] gap-2.5 overflow-hidden">
                <Image
                  src={`/route-images/${r.image.small}`}
                  alt=""
                  width={640}
                  height={427}
                  sizes="96px"
                  className="size-full object-cover"
                />
                <span className="flex min-w-0 flex-col py-2 pr-2.5 text-sm">
                  <Link className="link" href={`/routes/${r.slug}`}>
                    {r.name}
                  </Link>
                  <span>{r.image.shows}</span>
                  <span className="hint">
                    {r.image.author} ·{" "}
                    <a className="link font-medium" href={r.image.licence_url || r.image.source_page} target="_blank" rel="noreferrer noopener">
                      {r.image.licence}
                    </a>{" "}
                    ·{" "}
                    <a className="link font-medium" href={r.image.source_page} target="_blank" rel="noreferrer noopener">
                      original
                    </a>
                  </span>
                </span>
              </li>
            ) : null,
          )}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">Facts · {plural(urls.size, "source")}</h2>
        <p className="hint">
          Official pages, news reports, encyclopedias and published guides. Each fact on a route page links to the page
          it came from. No sentence was copied from any of them. The sites used most:
        </p>
        <ul className="card num grid text-sm sm:grid-cols-2">
          {topHosts.map(([host, count]) => (
            <li key={host} className="flex justify-between gap-3 border-b border-line px-3 py-1.5">
              <span className="truncate">{host}</span>
              <span className="text-ink-2">{count}</span>
            </li>
          ))}
        </ul>
        <p className="hint">Every source for a route is listed at the foot of that route’s page.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">Videos · {videos}</h2>
        <p className="text-[0.9375rem]">
          Riders’ videos play on YouTube, under the maker’s own channel. Meel shows the title, the channel’s name and
          YouTube’s own small picture of the video, and links to it. Nothing is copied or uploaded again.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">Motorcycles · {bikes.length}</h2>
        <ul className="card flex flex-col text-sm">
          {bikes.map((b) => (
            <li key={b.id} className="num flex flex-wrap justify-between gap-x-3 border-b border-line px-3 py-1.5 last:border-b-0">
              <span>
                {b.maker} {b.model} · {b.tank_litres} litres
              </span>
              {b.source ? (
                <a className="link font-medium" href={b.source.url} target="_blank" rel="noreferrer noopener">
                  {hostOf(b.source.url)}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">Type and drawings</h2>
        <p className="text-[0.9375rem]">
          Lettering is Barlow Condensed and Hind, both under the SIL Open Font Licence. Icons follow the Lucide set,
          under the ISC licence.
        </p>
      </section>

      <Callout tone="warn" title="This is not legal advice">
        This page follows what each licence plainly asks. It has not been reviewed by a lawyer. If you own something
        shown here and want it credited differently or removed, write to the person who keeps Meel.
      </Callout>
    </div>
  );
}
