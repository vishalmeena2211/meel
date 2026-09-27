import Link from "next/link";

import { RouteBrowser } from "@/components/route-browser";
import { getIndex } from "@/lib/content";

export default async function HomePage() {
  const index = await getIndex();
  const written = index.routes.filter((r) => r.level !== "unwritten").length;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h1 className="display text-[2rem] uppercase md:text-5xl">Every fact has a date</h1>
        <p className="max-w-[60ch] text-[0.9375rem]">
          Fuel gaps, permits, passes and night halts for {index.routes.length} Indian motorcycle routes. Every fact
          shows where it came from, and when it was last confirmed.
        </p>
        <p className="hint">
          {written} of {index.routes.length} routes have a page.{" "}
          <Link className="link" href="/about">
            How far to trust it
          </Link>
        </p>
      </section>

      <RouteBrowser routes={index.routes} regions={index.regions} />
    </div>
  );
}
