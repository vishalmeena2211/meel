"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { hours, km, sayDate } from "@/lib/format";
import { IN_THE_CITY_KM, useRidingFrom } from "@/lib/riding-from";
import { roadLinks, type RoadEnd } from "@/lib/route-file";
import type { Leg, RideCity, RouteApproach } from "@/lib/types";

import { IconExternal, IconMap, IconRight } from "../icons";
import { RidingFromField } from "../riding-from";
import { Callout } from "../ui";

/*
  Getting there (wireframes, screen 36): how far a route's start is from the city a rider sets out from, by road, and
  how far it is back from its end. The city is the one picked on the front page, kept on this phone.
  It never says where to stop, how many days it takes, or which way is better.
*/

/** "Panipat, Dera Bassi and Bilaspur". */
function andList(words: string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

/** The nearest cities to a route's start, nearest first. */
function nearest(approach: RouteApproach, cities: Pick<RideCity, "id" | "name">[]) {
  return cities
    .map((c) => ({ city: c, leg: approach.to[c.id] }))
    .filter((x): x is { city: Pick<RideCity, "id" | "name">; leg: Leg } => x.leg !== undefined)
    .sort((a, b) => a.leg.km - b.leg.km);
}

/** The row under "Before you leave". Its words follow the city picked, so it is drawn in the browser. */
export function GettingThereRow({
  href,
  approach,
  cities,
}: {
  href: string;
  approach: RouteApproach;
  cities: Pick<RideCity, "id" | "name">[];
}) {
  const picked = useRidingFrom();
  const city = cities.find((c) => c.id === picked);
  const there = city ? approach.to[city.id] : undefined;
  const back = city && !approach.round_trip ? approach.back[city.id] : undefined;
  const near = nearest(approach, cities)[0];
  const title = city && there ? `Getting there from ${city.name}` : "Getting there";
  const sub =
    city && there
      ? `${there.km < IN_THE_CITY_KM ? `Starts in ${city.name}` : `${km(there.km)} to ${approach.start}`}${back ? ` · ${km(back.km)} back from ${approach.end}` : ""}`
      : near
        ? `${km(near.leg.km)} from ${near.city.name} to ${approach.start}`
        : `To ${approach.start} from where you ride`;
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2.5 last:border-b-0 hover:bg-surface-2"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2 text-ink">
        <IconMap />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[0.9375rem] leading-5">{title}</b>
        <span className="hint num block">{sub}</span>
      </span>
      <IconRight className="size-4 shrink-0 text-ink-2" />
    </Link>
  );
}

/** How the road back goes: "The shortest way by road, through …", or, when kept in India, just its towns. */
function BackWay({ leg }: { leg: Leg }) {
  const towns = leg.through && leg.through.length > 0 ? andList(leg.through) : null;
  if (leg.via && leg.via.length > 0) return towns ? <p className="hint">Through {towns}.</p> : null;
  return <p className="hint">The shortest way by road{towns ? `, through ${towns}` : ""}.</p>;
}

function LegCard({ title, leg, children }: { title: string; leg: Leg; children?: ReactNode }) {
  return (
    <section className="card flex flex-col gap-1 px-3 py-2.5">
      <h3 className="text-[0.9375rem] font-semibold leading-5">{title}</h3>
      <p className="display num text-3xl leading-none">{km(leg.km)}</p>
      {children}
      {leg.via && leg.via.length > 0 ? (
        <p className="hint">By way of {andList(leg.via)}, to stay in India: the shortest road crosses a border.</p>
      ) : null}
    </section>
  );
}

/** A route that ends where this one starts: its name, its own length, and how far its start is from the city. */
export interface RouteBefore {
  slug: string;
  name: string;
  length_km: number | null;
  /** By city id, km from the city to that route's start. */
  km: Record<string, number>;
}

export function GettingThereScreen({
  start,
  approach,
  cities,
  before,
  built,
}: {
  start: RoadEnd;
  approach: RouteApproach;
  cities: RideCity[];
  before: RouteBefore[];
  built: string;
}) {
  const picked = useRidingFrom();
  const city = cities.find((c) => c.id === picked) ?? null;
  const there = city ? approach.to[city.id] : undefined;
  const back = city && !approach.round_trip ? approach.back[city.id] : undefined;
  const all = nearest(approach, cities);
  const others = all.filter((x) => x.city.id !== city?.id).slice(0, city ? 3 : 5);
  const links = city ? roadLinks(city, start) : null;

  return (
    <div className="flex flex-col gap-3 md:max-w-xl">
      <RidingFromField
        cities={cities}
        id="getting-there-from"
        hint="Not on the list? Pick the city nearest you. Remembered on this phone, not in an account."
      />

      {city && there && there.km < IN_THE_CITY_KM ? (
        <>
          <Callout tone="info" title={`This route starts in ${city.name}`}>
            {approach.start === city.name ? "" : `At ${approach.start}, ${km(there.km)} from the city’s centre. `}
            {approach.round_trip ? "It ends there too." : `It ends in ${approach.end}.`}
          </Callout>
          {back ? (
            <LegCard title={`Coming back: ${approach.end} to ${city.name}`} leg={back}>
              <BackWay leg={back} />
            </LegCard>
          ) : null}
        </>
      ) : city && there ? (
        <>
          <LegCard title={`${city.name} to ${approach.start}`} leg={there}>
            <p className="hint">A map app says {hours(there.hours)}: a car’s time on an empty road.</p>
            {there.through && there.through.length > 0 ? (
              <p className="hint">
                Through {andList(there.through)}.
                {there.halfway ? ` Halfway is ${there.halfway.name}, ${km(there.halfway.km)}.` : ""}
              </p>
            ) : null}
          </LegCard>
          {links ? (
            <div className="grid grid-cols-2 gap-2">
              <a
                className="btn btn-soft"
                href={links.google}
                target="_blank"
                rel="noopener noreferrer"
                data-track="Map app opened"
                data-track-props={JSON.stringify({ app: "Google Maps", from: city.id })}
              >
                <IconExternal />
                Google Maps
              </a>
              <a
                className="btn btn-soft"
                href={links.organic}
                target="_blank"
                rel="noopener noreferrer"
                data-track="Map app opened"
                data-track-props={JSON.stringify({ app: "Organic Maps", from: city.id })}
              >
                <IconExternal />
                Organic Maps
              </a>
            </div>
          ) : null}
          {back ? (
            <LegCard title={`Coming back: ${approach.end} to ${city.name}`} leg={back}>
              <BackWay leg={back} />
            </LegCard>
          ) : null}
        </>
      ) : city ? (
        <Callout title={`Not worked out from ${city.name} yet`}>Pick another city, or check again after the next update.</Callout>
      ) : (
        <Callout tone="info" title="Pick where you ride from">
          The page then says how far {approach.start} is from your city by road, and how far it is back.
        </Callout>
      )}

      {others.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <h2 className="label">{city ? `From other cities, to ${approach.start}` : `From the nearest cities, to ${approach.start}`}</h2>
          <div className="card flex flex-col">
            {others.map(({ city: c, leg }) => (
              <div key={c.id} className="flex min-h-11 items-center gap-2 border-b border-line px-3 py-2 last:border-b-0">
                <b className="min-w-0 flex-1 text-[0.9375rem]">{c.name}</b>
                <span className="num">{leg.km < IN_THE_CITY_KM ? "starts here" : km(leg.km)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {before.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <Callout tone="info" title={`${before.length === 1 ? "A Meel route ends" : `${before.length} Meel routes end`} in ${approach.start}`}>
            Ride {before.length === 1 ? "it" : "one of them"} to start this one, and read its page for the way up.
          </Callout>
          <div className="card flex flex-col">
            {before.map((r) => {
              const d = city ? r.km[city.id] : undefined;
              return (
                <Link
                  key={r.slug}
                  href={`/routes/${r.slug}`}
                  className="flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2.5 last:border-b-0 hover:bg-surface-2"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2 text-ink">
                    <IconMap />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block text-[0.9375rem] leading-5">{r.name}</b>
                    <span className="hint num block">
                      {[r.length_km ? km(r.length_km) : null, city && d !== undefined ? `starts ${km(d)} from ${city.name}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <IconRight className="size-4 shrink-0 text-ink-2" />
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <p className="hint">
        By road from the city’s centre to {approach.start}
        {approach.round_trip ? "" : `, and from ${approach.end} back`}, worked out from the open map (OpenStreetMap, with
        the OSRM router; towns named by Nominatim) on {sayDate(built) ?? built}. Not checked by a rider.
      </p>
    </div>
  );
}
