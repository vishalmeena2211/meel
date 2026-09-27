import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { answerAction } from "@/app/actions/trips";
import { PageTitle } from "@/components/form";
import { IconCheck } from "@/components/icons";
import { Badge, Callout, Empty } from "@/components/ui";
import { getRoute } from "@/lib/content";
import { plural, sayDate } from "@/lib/format";
import { currentUser } from "@/server/auth";
import { getTrip, membersOf } from "@/server/trips";

export const metadata: Metadata = { title: "Requests to join", robots: { index: false } };

const ANSWERED: Record<string, { label: string; tone: "fresh" | "plain" }> = {
  accepted: { label: "Going", tone: "fresh" },
  declined: { label: "Declined", tone: "plain" },
  left: { label: "Left the trip", tone: "plain" },
  "took-back": { label: "Took back the request", tone: "plain" },
};

export default async function RequestsPage(props: PageProps<"/trips/[id]/requests">) {
  const { id } = await props.params;
  const query = await props.searchParams;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/trips/${id}/requests`);
  const trip = getTrip(id);
  if (!trip || trip.leader_id !== user.id) notFound();
  const route = await getRoute(trip.route_slug);

  const members = membersOf(trip.id);
  const waiting = members.filter((m) => m.status === "asked" || m.status === "waiting-for-place");
  const answered = members.filter((m) => !(m.status === "asked" || m.status === "waiting-for-place"));
  const left = trip.places - trip.going;
  const wantsCc = /(\d{3,4})\s*cc/i.exec(trip.who_can_join);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <nav aria-label="Where you are" className="hint">
        <Link className="link font-medium" href={`/trips/${trip.id}`}>
          Back to the trip
        </Link>
      </nav>
      <PageTitle title="Requests to join" lede={`${route?.name ?? trip.route_slug} · ${sayDate(trip.leaves_on)}`} />

      {query.full ? (
        <Callout tone="warn" title="The trip is full">
          Nobody was accepted. A place opens when a rider leaves.
        </Callout>
      ) : null}

      <Callout tone="info" title={waiting.length > 0 ? `${plural(waiting.length, "rider")} waiting for your answer` : "Nobody is waiting"}>
        {left > 0 ? `${plural(left, "place")} left.` : "All places are taken."}
      </Callout>

      {waiting.length === 0 ? (
        <Empty title="No requests to answer">
          <span className="text-sm">They appear here when riders ask to join.</span>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {waiting.map((m) => {
            const bikeCc = m.bike ? /(\d{3,4})/.exec(m.bike) : null;
            const tooSmall = wantsCc && bikeCc ? Number(bikeCc[1]) < Number(wantsCc[1]) : false;
            return (
              <li key={m.user_id} className="card flex flex-col gap-1 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <b className="text-[0.9375rem]">{m.name}</b>
                  <span className="hint">{m.home_city}</span>
                </div>
                <span className="text-sm">{m.bike ?? "Bike not given"}</span>
                <span className="hint">
                  On Meel since {sayDate(m.since.slice(0, 7))} · {plural(m.trips_done, "trip")} ridden ·{" "}
                  {plural(m.facts_confirmed, "fact")} confirmed
                </span>
                {m.note ? <p className="border-l-[3px] border-line py-0.5 pl-2.5 text-sm">“{m.note}”</p> : null}
                {tooSmall ? (
                  <Callout tone="warn" title={`${bikeCc?.[1]} cc. You asked for ${trip.who_can_join.toLowerCase()}.`}>
                    You can still accept.
                  </Callout>
                ) : null}
                {m.status === "waiting-for-place" ? <span className="hint">Asked after the trip was full.</span> : null}
                <form action={answerAction} className="mt-1.5 grid grid-cols-2 gap-2">
                  <input type="hidden" name="trip" value={trip.id} />
                  <input type="hidden" name="rider" value={m.user_id} />
                  <button type="submit" name="answer" value="decline" className="btn btn-outline">
                    Decline
                  </button>
                  <button type="submit" name="answer" value="accept" className="btn btn-soft" disabled={left <= 0}>
                    <IconCheck />
                    Accept
                  </button>
                </form>
                {left <= 0 ? <span className="hint">Accepting needs a free place. There are none.</span> : null}
              </li>
            );
          })}
        </ul>
      )}
      <p className="hint">Declining sends no reason. The rider sees only that you could not take them.</p>

      {answered.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="label">Answered</h2>
          <ul className="card flex flex-col">
            {answered.map((m) => {
              const words = ANSWERED[m.status] ?? { label: m.status, tone: "plain" as const };
              return (
                <li key={m.user_id} className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5 last:border-b-0">
                  <span>
                    <b className="block text-[0.9375rem] leading-5">{m.name}</b>
                    <span className="hint">{m.answered_at ? sayDate(m.answered_at.slice(0, 10)) : ""}</span>
                  </span>
                  <Badge tone={words.tone}>{words.label}</Badge>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
