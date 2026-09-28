import Link from "next/link";

import { RouteBrowser, type RoadLine } from "@/components/route-browser";
import { TopHead } from "@/components/shell";
import { getAllRoutes, getIndex } from "@/lib/content";
import { confirmedLately } from "@/server/reports";

// The count of facts confirmed this week is worked out when the page is built, not live. It is built again hourly.
export const revalidate = 3600;

/** A road thinned to a few dozen points. Enough to draw its shape on the front page. */
function thin(line: [number, number][], keep = 28): [number, number][] {
  if (line.length <= keep) return line.map((p) => [round(p[0]), round(p[1])]);
  const step = (line.length - 1) / (keep - 1);
  const out: [number, number][] = [];
  for (let i = 0; i < keep; i += 1) {
    const p = line[Math.round(i * step)];
    if (p) out.push([round(p[0]), round(p[1])]);
  }
  return out;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export default async function HomePage() {
  const [index, routes] = await Promise.all([getIndex(), getAllRoutes()]);
  const full = index.routes.filter((r) => r.level === "full").length;
  const lines: RoadLine[] = routes.map((r) => ({ slug: r.slug, line: thin(r.line) }));
  const sub = `${index.routes.length} routes · ${full === 0 ? "none written in full yet" : `${full} written in full`}`;

  return (
    <div className="flex flex-col gap-4">
      <TopHead title="Meel" sub={sub} />
      <section className="flex flex-col gap-2">
        <p role="heading" aria-level={1} className="display hidden text-5xl uppercase md:block">
          Every fact has a date
        </p>
        <p className="max-w-[60ch] text-[0.9375rem]">
          Dated facts for Indian motorcycle routes. Every fact shows who confirmed it, and when.{" "}
          <Link className="link" href="/about">
            How far to trust it
          </Link>
        </p>
      </section>

      <RouteBrowser
        routes={index.routes}
        regions={index.regions}
        lines={lines}
        confirmed={confirmedLately()}
      />
    </div>
  );
}
