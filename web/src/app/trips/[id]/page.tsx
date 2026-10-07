import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { leaveAction, takeBackAction, withdrawAction } from "@/app/actions/trips";
import { GoogleButton, OrWithEmail } from "@/components/account/google";
import { IconPlus, IconRight } from "@/components/icons";
import { SaveRoute } from "@/components/offline/save-route";
import { ShareButton } from "@/components/route/share-button";
import { BackHead, Foot } from "@/components/shell";
import { FuelRow, PackingRow } from "@/components/trips/checklist";
import { AskToJoin, ReportTrip } from "@/components/trips/forms";
import { ShareTrip } from "@/components/trips/share-trip";
import { PACE_WORDS, Seats, TripCardView, placesBadge, tripLength } from "@/components/trips/trip-card";
import { Badge, Callout, KeyFacts } from "@/components/ui";
import { getIndex } from "@/lib/content";
import { dayOf, indiaDay, initials, km, feet, monthName, plural, sayDate } from "@/lib/format";
import { nightGains } from "@/lib/trip-checks";
import { currentUser, googleIsOn } from "@/server/auth";
import { tripCardLine, tripShareText } from "@/lib/trip-share";
import { savedPages } from "@/server/route-pages";
import { getRouteView } from "@/server/route-view";
import { cameBackFrom, getTrip, membersOf, openTrips } from "@/server/trips";

export async function generateMetadata(props: PageProps<"/trips/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const trip = await getTrip(id);
  if (!trip) return { title: "No such trip" };
  // Only a trip on the board says what it is. Anything else, such as a first trip the editor has not read,
  // shows Meel's card, so a pasted link never gives away a trip that is not on the board.
  if (trip.status !== "open") return { title: "A trip", robots: { index: false } };
  const view = await getRouteView(trip.route_slug);
  const name = view?.route.name ?? trip.route_slug;
  const title = `Trip: ${name}, ${sayDate(trip.leaves_on)}`;
  const description = tripCardLine({ ...trip, route: name });
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, url: `/trips/${trip.id}`, siteName: "Meel", locale: "en_IN", type: "article" },
  };
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="font-display grid size-9 shrink-0 place-items-center rounded-full border-[1.5px] border-stone-ink bg-stone text-sm font-bold text-stone-ink">
      {initials(name)}
    </span>
  );
}

/** "19 June", from "2027-06-19". The year is in the header. */
function day(value: string | null | undefined): string {
  return (sayDate(value ? value.slice(0, 10) : null) ?? "").replace(/ \d{4}$/, "");
}

/** "5 to 13 September 2026", or "28 June to 4 July 2027". */
function span(from: string, to: string): string {
  const a = sayDate(from) ?? from;
  const b = sayDate(to) ?? to;
  if (from.slice(0, 7) === to.slice(0, 7)) return `${Number(from.slice(8, 10))} to ${b}`;
  if (from.slice(0, 4) === to.slice(0, 4)) return `${day(from)} to ${b}`;
  return `${a} to ${b}`;
}

export default async function TripPage(props: PageProps<"/trips/[id]">) {
  const { id } = await props.params;
  const query = await props.searchParams;
  const trip = await getTrip(id);
  if (!trip || trip.status === "withdrawn") notFound();

  const [view, user, index, members, openNow] = await Promise.all([
    getRouteView(trip.route_slug),
    currentUser(),
    getIndex(),
    membersOf(trip.id),
    openTrips(),
  ]);
  if (!view) notFound();
  const { route } = view;

  const isLeader = user?.id === trip.leader_id;
  // A trip the editor has not yet read, or has hidden, is seen only by its leader and the editor.
  if (trip.status !== "open" && !isLeader && !user?.is_editor) notFound();

  const me = user && !isLeader ? (members.find((m) => m.user_id === user.id) ?? null) : null;
  const mine = me?.status ?? null;
  const going = members.filter((m) => m.status === "accepted");
  const waiting = members.filter((m) => m.status === "asked" || m.status === "waiting-for-place");
  const inLine = members.filter((m) => m.status === "waiting-for-place").length;
  const over = trip.back_on < indiaDay();
  const full = trip.going >= trip.places;
  const gains = nightGains(route, trip.nights);
  const gap = route.fuel.longest_gaps[0] ?? null;
  const inside = isLeader || mine === "accepted";
  const nameOf = (slug: string) => index.routes.find((r) => r.slug === slug)?.name ?? slug;
  const leader = trip.leader_name.split(" ")[0] ?? trip.leader_name;

  // Trips a rider might take in its place: the same road first, then roads in the same region.
  const near = new Set([trip.route_slug, ...view.nearby.map((r) => r.slug)]);
  const others = openNow
    .filter((t) => t.id !== trip.id && near.has(t.route_slug) && t.going < t.places)
    .slice(0, 3);

  const month = monthName(Number(trip.leaves_on.slice(5, 7)));
  const packed = (view.packing?.items ?? [])
    .filter((i) => i.months.length === 0 || i.months.includes(Number(trip.leaves_on.slice(5, 7))))
    .map((i) => i.item);
  const saving = savedPages(view);
  const back = over ? await cameBackFrom(trip) : null;
  const gave = back
    ? [
        back.facts > 0 ? { title: `${plural(back.facts, "fact")} confirmed`, sub: "On this route, by riders of this trip" } : null,
        back.legs > 0 ? { title: `Riding hours for ${plural(back.legs, "leg")}`, sub: null } : null,
        back.videos > 0 ? { title: plural(back.videos, "video"), sub: null } : null,
      ].filter((x): x is { title: string; sub: string | null } => x !== null)
    : [];

  // Anyone may share a trip that is on the board and still to be ridden. The message never holds the chat link.
  const canShare = trip.status === "open" && !over;
  const shareText = tripShareText({ ...trip, route: route.name });
  const tripPath = `/trips/${trip.id}`;
  const leaderFirst = isLeader && query.posted !== "open";

  const details = (
    <>
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="display text-[1.625rem] md:text-4xl">{route.name}</h2>
          <p className="hint num mt-1">
            {tripLength(trip.leaves_on, trip.back_on)} · {PACE_WORDS[trip.pace] ?? trip.pace}
            {trip.is_company ? " · run by a tour company" : ""}
          </p>
        </div>
        <span className="mt-1">{placesBadge(trip, new Date())}</span>
      </header>

      <KeyFacts
        items={[
          { label: "Leaves", value: (sayDate(trip.leaves_on, true) ?? "").replace(/ \d{4}$/, "") },
          { label: "Back", value: (sayDate(trip.back_on, true) ?? "").replace(/ \d{4}$/, "") },
          { label: "From", value: trip.from_city },
        ]}
      />

      <div className="card flex items-center gap-2.5 px-3 py-2.5">
        <Avatar name={trip.leader_name} />
        <div className="min-w-0 flex-1">
          <b className="block text-[0.9375rem] leading-5">Led by {trip.leader_name}</b>
          <span className="hint num">
            On Meel since {sayDate(dayOf(trip.leader_since).slice(0, 7))} · {plural(trip.leader_trips, "trip")} posted ·{" "}
            {plural(trip.leader_facts, "fact")} confirmed
          </span>
        </div>
      </div>

      {/* Straight after publishing, the prompt at the top carries the share buttons instead. */}
      {canShare && query.posted !== "open" ? <ShareTrip text={shareText} path={tripPath} /> : null}
    </>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <BackHead
        title="Trip"
        sub={`${route.name} · ${sayDate(trip.leaves_on.slice(0, 7))}`}
        back="/trips"
        right={<ShareButton title={`Trip: ${route.name}`} />}
      />
      <nav aria-label="Where you are" className="hint hidden md:block">
        <Link className="link font-medium" href="/trips">
          All trips
        </Link>{" "}
        ·{" "}
        <Link className="link font-medium" href={`/routes/${route.slug}`}>
          {route.name}
        </Link>
      </nav>

      {/* A leader looking at their own trip sees the trip first, then what is happening to it (frame 21.5). Straight after
          publishing, the prompt to share it comes first instead (frame 21.4). */}
      {leaderFirst ? details : null}

      {query.posted === "waiting" || trip.status === "waiting-for-editor" ? (
        <Callout tone="warn" title="Your trip is waiting for the editor">
          A rider’s first trip is read before it appears on the board. After that, your trips appear at once.
        </Callout>
      ) : query.posted === "open" ? (
        <section className="flex flex-col gap-2">
          <Callout tone="info" title="Your trip is on the board">
            Share it with your riding groups. The message carries the dates, the places left and a link to ask to join.
          </Callout>
          {canShare ? <ShareTrip text={shareText} path={tripPath} primary withCopy /> : null}
          <p className="hint">The chat group link is not in the message. Only riders you accept see it.</p>
        </section>
      ) : null}
      {trip.status === "hidden" ? <Badge tone="stale">Hidden while the editor looks at reports about it</Badge> : null}

      {over ? (
        <Callout tone="info" title={`This trip was ridden from ${span(trip.leaves_on, trip.back_on)}`}>
          {plural(trip.going, "rider")} went.
          {back && back.reports > 0
            ? ` ${back.reports} sent a trip report afterwards.`
            : " None has sent a trip report yet."}
        </Callout>
      ) : mine === "accepted" ? (
        <Callout tone="info" title="You are in">
          {leader} accepted you{me?.answered_at ? ` on ${day(dayOf(me.answered_at))}` : ""}. {trip.going} of {trip.places}{" "}
          places are taken.
        </Callout>
      ) : mine === "asked" ? (
        <Callout tone="warn" title={`You asked to join${me ? ` on ${day(dayOf(me.asked_at))}` : ""}`}>
          {leader} has not answered yet. You will see it here when they do.
        </Callout>
      ) : mine === "waiting-for-place" ? (
        <Callout tone="warn" title="You are waiting for a place">
          The trip is full. If a rider leaves, {leader} can accept you.
        </Callout>
      ) : mine === "declined" ? (
        <Callout title={`${leader} could not take you on this trip`}>
          Leaders do not have to give a reason. It says nothing about you as a rider.
        </Callout>
      ) : null}

      {/* A rider who is going sees what to do before leaving first. The trip itself follows. */}
      {inside && !over ? (
        <>
          <section className="flex flex-col gap-1.5">
            <h2 className="label">Reaching the group</h2>
            {trip.chat_link ? (
              <div className="card flex flex-col" data-private-block>
                <a
                  href={trip.chat_link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex min-h-12 items-center gap-2.5 px-3 py-2.5 hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <b className="block text-[0.9375rem] leading-5">Join the trip’s chat group</b>
                    <span className="hint block">Opens your chat app</span>
                  </span>
                  <IconRight className="size-4 shrink-0 text-ink-2" />
                </a>
              </div>
            ) : (
              <p className="hint">
                {isLeader ? "You have not added a chat group link." : `${leader} has not added a chat group link yet.`}
              </p>
            )}
          </section>
          <section className="flex flex-col gap-1.5">
            <h2 className="label">Before you leave</h2>
            <div className="card flex flex-col">
              <FuelRow routeSlug={route.slug} gap={gap} />
              {packed.length > 0 ? <PackingRow routeSlug={route.slug} month={month} items={packed} /> : null}
              <SaveRoute
                routeSlug={route.slug}
                routeName={route.name}
                facts={route.counts.facts}
                tools={saving.tools}
                pages={saving.pages}
                extras={saving.extras}
              />
            </div>
          </section>
          <Callout title="You are riding with people you have not met">
            Meet in a public place first. Tell someone at home your route and dates.{" "}
            <Link className="link" href="/rules">
              More on riding with strangers
            </Link>
          </Callout>
        </>
      ) : null}

      {over && gave.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <h2 className="label">What came back from it</h2>
          <div className="card flex flex-col">
            {gave.map((g) => (
              <Link
                key={g.title}
                href={`/routes/${route.slug}`}
                className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2.5 last:border-b-0 hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.9375rem] leading-5">{g.title}</b>
                  {g.sub ? <span className="hint block">{g.sub}</span> : null}
                </span>
                <IconRight className="size-4 shrink-0 text-ink-2" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {leaderFirst ? null : details}

      {full && !inside && !over && mine !== "declined" ? (
        <Callout title={`All ${trip.places} places are taken`}>
          Places open when a rider leaves.
          {inLine > 0 ? ` ${plural(inLine, "rider")} ${inLine === 1 ? "is" : "are"} already waiting for one.` : ""}
        </Callout>
      ) : null}

      {gains.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="label">Night by night</h2>
          <ol className="card flex flex-col">
            {gains.map((g) => (
              <li key={g.place} className="grid min-h-[52px] grid-cols-[30px_1fr_auto] items-center gap-2.5 border-b border-line px-3 py-2 last:border-b-0">
                <span className="font-display grid size-[30px] place-items-center rounded-full border-[1.5px] border-stone-ink bg-stone text-[0.9375rem] font-bold text-stone-ink">
                  {g.night}
                </span>
                <span>
                  <b className="block text-[0.9375rem] leading-5">{g.place}</b>
                  <span className="hint num">{g.altitude_m === null ? "Height not known" : `Sleeps at ${feet(g.altitude_m)}`}</span>
                </span>
                <span
                  className={`font-display num text-right text-[1.0625rem] leading-none font-bold ${
                    g.verdict === "too-steep" ? "text-stale-fg" : g.verdict === "steep" ? "text-ageing-fg" : "text-ink-2"
                  }`}
                >
                  {g.gain_m === null ? "—" : `${g.gain_m > 0 ? "+" : "−"}${feet(Math.abs(g.gain_m))}`}
                  <small className="block font-sans text-[0.6875rem] leading-4 font-normal text-ink-2">
                    {g.verdict === "too-steep" ? "too steep" : g.verdict === "unknown" || g.verdict === "start" ? "" : g.verdict}
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
          {gap.near_from} to {gap.near_to}.{" "}
          <Link className="link" href={`/routes/${route.slug}/fuel-check`}>
            Check your bike
          </Link>
        </Callout>
      ) : null}

      <section className="flex flex-col gap-1.5">
        <h2 className="label">What {leader} asks</h2>
        <div className="card px-3 py-2.5">
          <b className="block text-[0.9375rem]">
            {PACE_WORDS[trip.pace] ?? trip.pace}, {trip.who_can_join.toLowerCase()}
          </b>
          {trip.asks ? <span className="hint">{trip.asks}</span> : null}
        </div>
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="label">
          Going · {trip.going} of {trip.places}
        </h2>
        <Seats going={trip.going} places={trip.places} />
        {/* Riders' names, bikes and home towns are left out of screen recordings. */}
        <ul className="card flex flex-col" data-private-block>
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

      {!inside && !over ? (
        <p className="hint">How to reach the group is shown once {leader} accepts you.</p>
      ) : null}

      {(full || mine === "declined" || over) && !inside && others.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="label">Other trips on roads nearby</h2>
          {others.map((t) => (
            <TripCardView key={t.id} trip={t} routeName={nameOf(t.route_slug)} />
          ))}
        </section>
      ) : null}

      {/* ── what the rider can do now ───────────────────────────────── */}
      {over ? null : isLeader ? (
        <Foot>
          <Link className="btn btn-primary btn-block" href={`/trips/${trip.id}/requests`}>
            {waiting.length > 0 ? `Answer ${plural(waiting.length, "request")}` : "See requests to join"}
          </Link>
          <form action={withdrawAction}>
            <input type="hidden" name="trip" value={trip.id} />
            <button type="submit" className="link mx-auto block text-sm">
              Withdraw this trip
            </button>
          </form>
        </Foot>
      ) : mine === "accepted" ? (
        <Foot>
          <form action={leaveAction}>
            <input type="hidden" name="trip" value={trip.id} />
            <button type="submit" className="btn btn-outline btn-block">
              Leave this trip
            </button>
          </form>
        </Foot>
      ) : mine === "asked" || mine === "waiting-for-place" ? (
        <Foot>
          <form action={takeBackAction}>
            <input type="hidden" name="trip" value={trip.id} />
            <button type="submit" className="btn btn-outline btn-block">
              Take back my request
            </button>
          </form>
        </Foot>
      ) : mine === "declined" ? (
        <Foot>
          <Link className="btn btn-primary btn-block" href={`/trips/new?route=${route.slug}`}>
            <IconPlus />
            Post your own trip
          </Link>
        </Foot>
      ) : user ? (
        <AskToJoin tripId={trip.id} leader={leader} full={full} />
      ) : (
        <section className="card flex flex-col gap-3 p-3">
          <h2 className="display text-xl">Joining a trip needs an account</h2>
          <p className="text-sm">{leader} is taking strangers on the road. They need to know who is asking.</p>
          <ul className="flex flex-col gap-1.5 text-sm">
            <li>Your name, home city and bike are shown to the leader</li>
            <li>Your email is never shown to anyone</li>
            <li>Reading routes and sending reports stay open to all</li>
          </ul>
          {googleIsOn ? (
            <>
              <GoogleButton next={`/trips/${trip.id}`} />
              <OrWithEmail />
            </>
          ) : null}
          <Link className="btn btn-primary" href={`/signup?next=/trips/${trip.id}`}>
            Create an account
          </Link>
          <Link className="btn btn-outline" href={`/login?next=/trips/${trip.id}`}>
            I already have one
          </Link>
        </section>
      )}

      {user && !isLeader ? <ReportTrip tripId={trip.id} /> : null}
    </div>
  );
}
