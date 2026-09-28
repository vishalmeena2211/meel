import type { Metadata } from "next";
import Link from "next/link";

import { PageTitle } from "@/components/form";
import { IconPlus } from "@/components/icons";
import { Foot } from "@/components/shell";
import { TripCardView } from "@/components/trips/trip-card";
import { Empty } from "@/components/ui";
import { getIndex } from "@/lib/content";
import { indiaMonth, plural } from "@/lib/format";
import { currentUser } from "@/server/auth";
import { openTrips } from "@/server/trips";

export const metadata: Metadata = {
  title: "Trips riders are planning",
  description: "Trips posted by riders, with dates, starting city and places left. Read without an account; join with one.",
};

// The board changes whenever a rider posts or joins, so it is built on each visit.
export const dynamic = "force-dynamic";

export default async function TripsPage(props: PageProps<"/trips">) {
  const query = await props.searchParams;
  const [index, user] = await Promise.all([getIndex(), currentUser()]);
  const all = openTrips();
  const routeOf = (slug: string) => index.routes.find((r) => r.slug === slug);
  const nameOf = (slug: string) => routeOf(slug)?.name ?? slug;

  const when = query.when === "month" ? "month" : null;
  const from = typeof query.from === "string" ? query.from : null;
  const region = typeof query.region === "string" ? query.region : null;
  const thisMonth = indiaMonth();

  // The chips: this month, the city the rider starts from, and each region that has a trip.
  const cities = [...new Set(all.map((t) => t.from_city))];
  const home = user && cities.includes(user.home_city) ? user.home_city : (cities[0] ?? null);
  const regions = index.regions.filter((r) => all.some((t) => routeOf(t.route_slug)?.region === r.id)).slice(0, 4);

  const trips = all.filter(
    (t) =>
      (!when || t.leaves_on.slice(0, 7) === thisMonth) &&
      (!from || t.from_city === from) &&
      (!region || routeOf(t.route_slug)?.region === region),
  );
  const own = trips.filter((t) => !t.is_company);
  const company = trips.filter((t) => t.is_company);
  const filtered = when !== null || from !== null || region !== null;

  const chip = (label: string, href: string, on: boolean) => (
    <Link key={href} href={href} className="chip" aria-current={on ? "true" : undefined}>
      {label}
    </Link>
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageTitle
        title="Trips riders are planning"
        lede="A rider posts a trip, others ask to join. Anyone can read the board. An account is asked for only to join or to post."
        phone={{ title: "Trips", sub: `${all.length} coming up` }}
      />

      {all.length > 0 ? (
        <nav aria-label="Narrow the board" className="scroll-row -mx-4 px-4 md:mx-0 md:px-0">
          {chip("All", "/trips", !filtered)}
          {chip("This month", "/trips?when=month", when === "month")}
          {home ? chip(`From ${home}`, `/trips?from=${encodeURIComponent(home)}`, from === home) : null}
          {regions.map((r) => chip(r.name, `/trips?region=${r.id}`, region === r.id))}
        </nav>
      ) : null}

      {all.length === 0 ? (
        <Empty title="Nobody has posted a trip yet">
          <span className="text-sm">Planning one? Post it, and riders who want that road will find you.</span>
        </Empty>
      ) : trips.length === 0 ? (
        <Empty title="No trips match that">
          <Link className="link text-sm" href="/trips">
            See all {plural(all.length, "trip")}
          </Link>
        </Empty>
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-2">
            {own.map((t) => (
              <TripCardView key={t.id} trip={t} routeName={nameOf(t.route_slug)} />
            ))}
          </div>
          {company.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="label">Run by tour companies</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {company.map((t) => (
                  <TripCardView key={t.id} trip={t} routeName={nameOf(t.route_slug)} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <Foot tabs>
        <Link className="btn btn-primary btn-block md:w-auto md:self-start" href="/trips/new">
          <IconPlus />
          Post a trip
        </Link>
      </Foot>
    </div>
  );
}
