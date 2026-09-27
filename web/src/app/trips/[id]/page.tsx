import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { leaveAction, takeBackAction, withdrawAction } from "@/app/actions/trips";
import { ShareButton } from "@/components/route/share-button";
import { AskToJoin, ReportTrip } from "@/components/trips/forms";
import { PACE_WORDS, Seats, TripCardView, placesBadge, tripLength } from "@/components/trips/trip-card";
import { Badge, Callout, KeyFacts } from "@/components/ui";
import { getIndex, getRoute } from "@/lib/content";
import { dayOf, indiaDay, initials, km, metres, plural, sayDate } from "@/lib/format";
import { nightGains } from "@/lib/trip-checks";
import { currentUser } from "@/server/auth";
import { getTrip, membersOf, membershipOf, openTripsOnRoute } from "@/server/trips";

export async function generateMetadata(props: PageProps<"/trips/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const trip = getTrip(id);
  if (!trip) return { title: "No such trip" };
  const route = await getRoute(trip.route_slug);
  return {
    title: `Trip: ${route?.name ?? trip.route_slug}, ${sayDate(trip.leaves_on)}`,
    robots: { index: false },
  };
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="font-display grid size-9 shrink-0 place-items-center rounded-full border-[1.5px] border-ink bg-stone text-sm font-bold">
      {initials(name)}
    </span>
  );
}

export default async function TripPage(props: PageProps<"/trips/[id]">) {
  const { id } = await props.params;
  const query = await props.searchParams;
  const trip = getTrip(id);
  if (!trip || trip.status === "withdrawn") notFound();

  const [route, user, index] = await Promise.all([getRoute(trip.route_slug), currentUser(), getIndex()]);
  if (!route) notFound();

  const isLeader = user?.id === trip.leader_id;
  // A trip the editor has not yet read, or has hidden, is seen only by its leader and the editor.
  if (trip.status !== "open" && !isLeader && !user?.is_editor) notFound();

  const mine = user && !isLeader ? membershipOf(trip.id, user.id) : null;
  const members = membersOf(trip.id);
  const going = members.filter((m) => m.status === "accepted");
  const waiting = members.filter((m) => m.status === "asked" || m.status === "waiting-for-place");
  const today = indiaDay();
  const over = trip.back_on < today;
  const full = trip.going >= trip.places;
  const gains = nightGains(route, trip.nights);
  const gap = route.fuel.longest_gaps[0];
  const inside = isLeader || mine === "accepted";
  const others = openTripsOnRoute(trip.route_slug).filter((t) => t.id !== trip.id).slice(0, 3);
  const nameOf = (slug: string) => index.routes.find((r) => r.slug === slug)?.name ?? slug;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <nav aria-label="Where you are" className="hint">
        <Link className="link font-medium" href="/trips">
          All trips
        </Link>{" "}
        ·{" "}
        <Link className="link font-medium" href={`/routes/${route.slug}`}>
          {route.name}
        </Link>
      </nav>

      {query.posted === "waiting" ? (
        <Callout tone="warn" title="Your trip is waiting for the editor">
          A rider’s first trip is read before it appears on the board. After that, your trips appear at once.
        </Callout>
      ) : query.posted === "open" ? (
        <Callout tone="info" title="Your trip is on the board" />
      ) : null}

      {over ? (
        <Callout tone="info" title={`This trip was ridden from ${sayDate(trip.leaves_on)} to ${sayDate(trip.back_on)}`}>
          {plural(trip.going, "rider")} went.
        </Callout>
      ) : mine === "accepted" ? (
        <Callout tone="info" title="You are in">
          {trip.leader_name} accepted you. {trip.going} of {trip.places} places are taken.
        </Callout>
      ) : mine === "asked" ? (
        <Callout tone="warn" title="You asked to join">
          {trip.leader_name} has not answered yet. You will see it here when they do.
        </Callout>
      ) : mine === "waiting-for-place" ? (
        <Callout tone="warn" title="You are waiting for a place">
          The trip is full. If a rider leaves, {trip.leader_name} can accept you.
        </Callout>
      ) : mine === "declined" ? (
        <Callout title={`${trip.leader_name} could not take you on this trip`}>
          Leaders do not have to give a reason. It says nothing about you as a rider.
        </Callout>
      ) : null}

      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="display text-[1.75rem] md:text-4xl">{route.name}</h1>
          <p className="hint num mt-1">
            {tripLength(trip.leaves_on, trip.back_on)} · {PACE_WORDS[trip.pace] ?? trip.pace}
            {trip.is_company ? " · run by a tour company" : ""}
          </p>
        </div>
        {placesBadge(trip, new Date())}
        <ShareButton title={`Trip: ${route.name}`} />
      </header>

      <KeyFacts
        items={[
          { label: "Leaves", value: sayDate(trip.leaves_on) ?? trip.leaves_on },
          { label: "Back", value: sayDate(trip.back_on) ?? trip.back_on },
          { label: "From", value: trip.from_city },
        ]}
      />

      <div className="card flex items-center gap-2.5 px-3 py-2.5">
        <Avatar name={trip.leader_name} />
        <div className="min-w-0 flex-1">
          <b className="block text-[0.9375rem] leading-5">Led by {trip.leader_name}</b>
          <span className="hint">
            On Meel since {sayDate(dayOf(trip.leader_since).slice(0, 7))} · {plural(trip.leader_trips, "trip")} posted ·{" "}
            {plural(trip.leader_facts, "fact")} confirmed
          </span>
        </div>
      </div>

      {gains.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="label">Night by night</h2>
          <ol className="card flex flex-col">
            {gains.map((g) => (
              <li key={g.place} className="grid min-h-[52px] grid-cols-[30px_1fr_auto] items-center gap-2.5 border-b border-line px-3 py-2 last:border-b-0">
                <span className="font-display grid size-[30px] place-items-center rounded-full bg-stone text-[0.9375rem] font-bold">
                  {g.night}
                </span>
                <span>
                  <b className="block text-[0.9375rem] leading-5">{g.place}</b>
                  <span className="hint num">{g.altitude_m === null ? "Height not known" : `Sleeps at ${metres(g.altitude_m)}`}</span>
                </span>
                <span
                  className={`font-display num text-right text-[1.0625rem] leading-none font-bold ${
                    g.verdict === "too-steep" ? "text-stale-fg" : g.verdict === "steep" ? "text-ageing-fg" : "text-ink-2"
                  }`}
                >
                  {g.gain_m === null ? "—" : `${g.gain_m > 0 ? "+" : "−"}${metres(Math.abs(g.gain_m))}`}
                  <small className="block font-sans text-[0.6875rem] leading-4 font-normal text-ink-2">
                    {g.verdict === "too-steep" ? "too steep" : g.verdict === "unknown" ? "" : g.verdict}
                  </small>
                </span>
              </li>
            ))}
          </ol>
          <p className="hint">This compares the height of the beds, nothing more. It is not medical advice.</p>
        </section>
      ) : null}

      {gap && gap.gap_km >= 100 ? (
        <Callout title={`Fuel: ${km(gap.gap_km)} with no pump`}>
          From near {gap.near_from} to near {gap.near_to}.{" "}
          <Link className="link" href={`/routes/${route.slug}#fuel`}>
            Check your bike
          </Link>
        </Callout>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="label">What {trip.leader_name} asks</h2>
        <div className="card px-3 py-2.5">
          <b className="block text-[0.9375rem]">
            {PACE_WORDS[trip.pace] ?? trip.pace}, {trip.who_can_join.toLowerCase()}
          </b>
          {trip.asks ? <span className="hint">{trip.asks}</span> : null}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="label">
          Going · {trip.going} of {trip.places}
        </h2>
        <Seats going={trip.going} places={trip.places} />
        <ul className="card flex flex-col">
          <li className="flex items-center gap-2.5 border-b border-line px-3 py-2.5 last:border-b-0">
            <Avatar name={trip.leader_name} />
            <span>
              <b className="block text-[0.9375rem] leading-5">{trip.leader_name}</b>
              <span className="hint">Leading</span>
            </span>
          </li>
          {going.map((m) => (
            <li key={m.user_id} className="flex items-center gap-2.5 border-b border-line px-3 py-2.5 last:border-b-0">
              <Avatar name={m.name} />
              <span>
                <b className="block text-[0.9375rem] leading-5">{m.name}</b>
                <span className="hint">
                  {m.bike ?? "Bike not given"} · {m.home_city}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {inside && !over ? (
        <section className="flex flex-col gap-2">
          <h2 className="label">Reaching the group</h2>
          {trip.chat_link ? (
            <a className="btn btn-soft self-start" href={trip.chat_link} target="_blank" rel="noreferrer noopener">
              Join the trip’s chat group
            </a>
          ) : (
            <p className="hint">{isLeader ? "You have not added a chat group link." : `${trip.leader_name} has not added a chat group link yet.`}</p>
          )}
          <h2 className="label mt-2">Before you leave</h2>
          <ul className="card flex flex-col text-[0.9375rem]">
            <li className="border-b border-line px-3 py-2.5">
              <Link className="link" href={`/routes/${route.slug}#fuel`}>
                Fuel check for your bike
              </Link>
            </li>
            <li className="border-b border-line px-3 py-2.5">
              <Link className="link" href={`/routes/${route.slug}#packing`}>
                Packing list for the month
              </Link>
            </li>
            <li className="px-3 py-2.5">
              <Link className="link" href={`/routes/${route.slug}#rules`}>
                Rules, permits and fees
              </Link>
            </li>
          </ul>
          <Callout title="You are riding with people you have not met">
            Meet in a public place first. Tell someone at home your route and dates.{" "}
            <Link className="link" href="/rules">
              More on riding with strangers
            </Link>
          </Callout>
        </section>
      ) : !over ? (
        <p className="hint">How to reach the group is shown once {trip.leader_name} accepts you.</p>
      ) : null}

      {/* ── what the rider can do now ───────────────────────────────── */}
      {over ? null : isLeader ? (
        <section className="flex flex-col gap-2">
          <Link className="btn btn-primary" href={`/trips/${trip.id}/requests`}>
            {waiting.length > 0 ? `Answer ${plural(waiting.length, "request")}` : "See requests to join"}
          </Link>
          <form action={withdrawAction}>
            <input type="hidden" name="trip" value={trip.id} />
            <button type="submit" className="btn btn-outline btn-block">
              Withdraw this trip
            </button>
          </form>
        </section>
      ) : mine === "accepted" ? (
        <form action={leaveAction}>
          <input type="hidden" name="trip" value={trip.id} />
          <button type="submit" className="btn btn-outline btn-block">
            Leave this trip
          </button>
        </form>
      ) : mine === "asked" || mine === "waiting-for-place" ? (
        <form action={takeBackAction} className="flex flex-col gap-2">
          <p role="status" className="rounded-lg border border-sign-line bg-sign-soft px-3 py-2.5 text-sm font-medium">
            {mine === "asked"
              ? `Your request is with ${trip.leader_name}. Look here again for the answer.`
              : `You are in line for a place. ${trip.leader_name} is told when one opens.`}
          </p>
          <input type="hidden" name="trip" value={trip.id} />
          <button type="submit" className="btn btn-outline btn-block">
            Take back my request
          </button>
        </form>
      ) : mine === "declined" ? (
        <Link className="btn btn-primary" href={`/trips/new?route=${route.slug}`}>
          Post your own trip
        </Link>
      ) : user ? (
        <section className="flex flex-col gap-2">
          {full ? (
            <Callout title={`All ${trip.places} places are taken`}>Places open when a rider leaves.</Callout>
          ) : null}
          <AskToJoin tripId={trip.id} leader={trip.leader_name} full={full} />
        </section>
      ) : (
        <section className="card flex flex-col gap-3 p-3">
          <h2 className="display text-xl">Joining a trip needs an account</h2>
          <p className="text-sm">
            {trip.leader_name} is taking strangers on the road. They need to know who is asking.
          </p>
          <ul className="flex flex-col gap-1.5 text-sm">
            <li>Your name, home city and bike are shown to the leader.</li>
            <li>Your email is never shown to anyone.</li>
            <li>Reading routes and sending reports stay open to all.</li>
          </ul>
          <Link className="btn btn-primary" href={`/signup?next=/trips/${trip.id}`}>
            Create an account
          </Link>
          <Link className="btn btn-outline" href={`/login?next=/trips/${trip.id}`}>
            I already have one
          </Link>
        </section>
      )}

      {(full || mine === "declined") && others.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="label">Other trips on this route</h2>
          {others.map((t) => (
            <TripCardView key={t.id} trip={t} routeName={nameOf(t.route_slug)} />
          ))}
        </section>
      ) : null}

      {user && !isLeader ? <ReportTrip tripId={trip.id} /> : null}
      {trip.status === "hidden" ? <Badge tone="stale">Hidden while the editor looks at reports about it</Badge> : null}
    </div>
  );
}
