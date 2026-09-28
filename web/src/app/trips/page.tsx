import type { Metadata } from "next";
import Link from "next/link";

import { PageTitle } from "@/components/form";
import { IconPlus, IconRight } from "@/components/icons";
import { Foot } from "@/components/shell";
import { Seats, TripCardView } from "@/components/trips/trip-card";
import { Badge, Empty } from "@/components/ui";
import { getIndex } from "@/lib/content";
import { indiaMonth, plural } from "@/lib/format";
import { currentUser } from "@/server/auth";
import { openTrips } from "@/server/trips";

export const metadata: Metadata = {
  title: "Motorcycle trips riders are planning",
  alternates: { canonical: "/trips" },
  description: "Trips posted by riders, with dates, starting city and places left. Read without an account; join with one.",
};

const STEPS = [
  "A rider posts a trip: the road, the dates, and the city it starts from.",
  "Others ask to join. The leader says yes or no.",
  "Only riders the leader accepts see the chat group link.",
];

const PLAN_ON = ["manali-leh", "srinagar-leh", "spiti-circuit"];

// The board changes whenever a rider posts or joins, so it is built on each visit.
export const dynamic = "force-dynamic";

export default async function TripsPage(props: PageProps<"/trips">) {
  const query = await props.searchParams;
  const [index, user, all] = await Promise.all([getIndex(), currentUser(), openTrips()]);
  const routeOf = (slug: string) => index.routes.find((r) => r.slug === slug);
  const nameOf = (slug: string) => routeOf(slug)?.name ?? slug;

  const when = query.when === "month" ? "month" : null;
  const from = typeof query.from === "string" ? query.from : null;
  const region = typeof query.region === "string" ? query.region : null;
  const thisMonth = indiaMonth();

  // The chips: this month, the city the rider starts from, and each region that has a trip.
  const cities = [...new Set(all.map((t) => t.from_city))];
  const home = user?.home_city && cities.includes(user.home_city) ? user.home_city : (cities[0] ?? null);
  const regions = index.regions.filter((r) => all.some((t) => routeOf(t.route_slug)?.region === r.id)).slice(0, 4);

  const trips = all.filter(
    (t) =>
      (!when || t.leaves_on.slice(0, 7) === thisMonth) &&
      (!from || t.from_city === from) &&
      (!region || routeOf(t.route_slug)?.region === region),
  );
  // Three roads to plan on, for an empty board. No claim is made that they are the most popular.
  const planOn = PLAN_ON.map((slug) => routeOf(slug)).filter((r) => r !== undefined);
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
        <>
          <Empty title="Nobody has posted a trip yet">
            <span className="text-sm">Planning one? Post it, and riders who want that road will find you.</span>
          </Empty>

          {/* Until the first trip, the board says how riding together works (wireframes, frame 18.4). */}
          <section className="flex flex-col gap-2">
            <h2 className="label">How riding together works</h2>
            <ol className="flex flex-col gap-2">
              {STEPS.map((step, i) => (
                <li key={step} className="flex items-start gap-2.5 text-[0.9375rem]">
                  <span className="display grid size-6 shrink-0 place-items-center rounded-full bg-stone text-sm">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="label">What a trip looks like</h2>
            <div className="card flex flex-col gap-0.5 border-dashed px-3 py-2.5 opacity-85" aria-label="An example trip, not a real one">
              <span className="flex items-start justify-between gap-2">
                <b className="display text-lg leading-tight">Manali to Leh</b>
                <Badge tone="unchecked">Example</Badge>
              </span>
              <span className="num text-sm">In June · 9 days</span>
              <span className="hint">From Delhi · led by a rider like you · Relaxed pace</span>
              <Seats going={3} places={8} />
            </div>
          </section>

          {planOn.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="label">Plan on a route</h2>
              <div className="card flex flex-col">
                {planOn.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/routes/${r.slug}/trips`}
                    className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2.5 last:border-b-0 hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <b className="block text-[0.9375rem] leading-5">{r.name}</b>
                      <span className="hint">Trips on this route</span>
                    </span>
                    <IconRight className="size-4 shrink-0 text-ink-2" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
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
