import type { Metadata } from "next";
import Link from "next/link";

import { PageTitle } from "@/components/form";
import { IconPlus } from "@/components/icons";
import { TripCardView } from "@/components/trips/trip-card";
import { Callout, Empty } from "@/components/ui";
import { getIndex } from "@/lib/content";
import { plural } from "@/lib/format";
import { openTrips } from "@/server/trips";

export const metadata: Metadata = {
  title: "Trips riders are planning",
  description: "Trips posted by riders, with dates, starting city and places left. Read without an account; join with one.",
};

// The board changes whenever a rider posts or joins, so it is built on each visit.
export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const [index, trips] = await Promise.all([getIndex(), Promise.resolve(openTrips())]);
  const nameOf = (slug: string) => index.routes.find((r) => r.slug === slug)?.name ?? slug;
  const own = trips.filter((t) => !t.is_company);
  const company = trips.filter((t) => t.is_company);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageTitle
        title="Trips riders are planning"
        lede="A rider posts a trip, others ask to join. Anyone can read the board. An account is asked for only to join or to post."
      />
      <Link className="btn btn-primary self-start" href="/trips/new">
        <IconPlus />
        Post a trip
      </Link>

      {trips.length === 0 ? (
        <Empty title="Nobody has posted a trip yet">
          <span className="text-sm">Planning one? Post it, and riders who want that road will find you.</span>
        </Empty>
      ) : (
        <>
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 className="display text-2xl">Coming up</h2>
              <span className="hint">{plural(own.length, "trip")}</span>
            </div>
            {own.length === 0 ? <p className="hint">No riders’ own trips just now.</p> : null}
            <div className="grid gap-2 md:grid-cols-2">
              {own.map((t) => (
                <TripCardView key={t.id} trip={t} routeName={nameOf(t.route_slug)} />
              ))}
            </div>
          </section>
          {company.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="display text-2xl">Run by tour companies</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {company.map((t) => (
                  <TripCardView key={t.id} trip={t} routeName={nameOf(t.route_slug)} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <Callout title="You are riding with people you have not met">
        Meet in a public place first. Tell someone at home your route and dates.{" "}
        <Link className="link" href="/rules">
          Rules for riding together
        </Link>
      </Callout>
    </div>
  );
}
