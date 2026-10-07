"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { track } from "@/lib/analytics";
import { km } from "@/lib/format";
import type { Bike, FuelGap, Terrain } from "@/lib/types";
import { parseStored, useStored } from "@/lib/use-stored";

import { IconSearch } from "../icons";
import { BackHead, Foot } from "../shell";
import { Callout } from "../ui";

const RESERVE = 0.2; // one fifth of the tank is never counted

export interface SavedBike {
  bikeId: string;
  name: string;
  tank: number;
  kmpl: number;
  /** Where the mileage came from: the maker's figure cut down, or the rider's own. */
  from: "maker" | "rider";
}

export function isSavedBike(v: unknown): v is SavedBike {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Partial<SavedBike>;
  return (
    typeof s.bikeId === "string" &&
    typeof s.tank === "number" &&
    typeof s.kmpl === "number" &&
    typeof s.name === "string" &&
    (s.from === "maker" || s.from === "rider")
  );
}

/** What the fuel check knows about the pump at the start of the longest gap. */
export interface GapNote {
  /** "was last confirmed 8 months ago", or "has not been confirmed by any rider". */
  pumpWords: string | null;
  /** The pump before that one, and the gap if the first has no fuel. */
  before: { near: string; gapKm: number } | null;
}

/** On a climb, at height, a bike does worse than its maker says. How much worse is a guess, and the page says so. */
function cut(terrain: Terrain): { factor: number; words: string } {
  if (terrain === "mountain") return { factor: 0.8, words: "less one fifth" };
  if (terrain === "hills") return { factor: 0.85, words: "less one seventh" };
  return { factor: 0.9, words: "less one tenth" };
}

export function FuelCheckScreen({
  bikes,
  gaps,
  terrain,
  routeName,
  routeSlug,
  note,
  popular,
}: {
  bikes: Bike[];
  gaps: FuelGap[];
  terrain: Terrain;
  routeName: string;
  routeSlug: string;
  note: GapNote;
  /** Bike names from trip reports on this route, most taken first. Empty until riders report. */
  popular: string[];
}) {
  const [raw, setRaw] = useStored("meel:bike");
  const saved = parseStored(raw, isSavedBike);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [bikeId, setBikeId] = useState<string | null>(null);
  const [tank, setTank] = useState("");
  const [kmpl, setKmpl] = useState("");
  const longest = gaps[0] ?? null;
  const showResult = saved !== null && !picking;

  const ordered = useMemo(() => {
    const rank = (b: Bike) => {
      const i = popular.indexOf(`${b.maker} ${b.model}`);
      return i === -1 ? 1000 : i;
    };
    return [...bikes].sort((a, b) => rank(a) - rank(b));
  }, [bikes, popular]);
  const shown = ordered.filter((b) => `${b.maker} ${b.model}`.toLowerCase().includes(query.trim().toLowerCase()));

  const chosen = bikes.find((b) => b.id === bikeId) ?? null;
  const own = bikeId === "own";
  const makers = chosen?.claimed_kmpl ? Math.round(chosen.claimed_kmpl * cut(terrain).factor) : null;
  const tankL = own ? Number(tank) : (chosen?.tank_litres ?? 0);
  const mileage = kmpl ? Number(kmpl) : (makers ?? 0);
  const ready = (own || chosen !== null) && tankL > 0 && mileage > 0;

  function check() {
    if (!ready) return;
    const value: SavedBike = {
      bikeId: bikeId ?? "own",
      name: chosen ? `${chosen.maker} ${chosen.model}` : "My bike",
      tank: tankL,
      kmpl: mileage,
      from: kmpl || !makers ? "rider" : "maker",
    };
    setRaw(JSON.stringify(value));
    setPicking(false);
    track("Fuel check run", { route: routeSlug, bike: value.name, from: value.from });
  }

  // A bike on the list with a maker's figure has all the answer needs, so picking it shows the answer at once.
  function pickBike(b: Bike) {
    setBikeId(b.id);
    setKmpl("");
    const figure = b.claimed_kmpl ? Math.round(b.claimed_kmpl * cut(terrain).factor) : null;
    if (!figure || !b.tank_litres) return;
    const value: SavedBike = { bikeId: b.id, name: `${b.maker} ${b.model}`, tank: b.tank_litres, kmpl: figure, from: "maker" };
    setRaw(JSON.stringify(value));
    setPicking(false);
    track("Fuel check run", { route: routeSlug, bike: value.name, from: value.from });
  }

  // The button is needed only when the rider has something to type: their own bike, a bike with no maker's figure,
  // or a mileage of their own.
  const typing = own || (chosen !== null && (!makers || kmpl !== ""));

  function change() {
    setBikeId(saved?.bikeId ?? null);
    setTank(saved && saved.bikeId === "own" ? String(saved.tank) : "");
    setKmpl(saved && saved.from === "rider" ? String(saved.kmpl) : "");
    setPicking(true);
  }

  const back = `/routes/${routeSlug}/fuel`;

  if (!longest) {
    return (
      <div className="flex flex-col gap-3">
        <BackHead title="Fuel check" sub={routeName} back={back} />
        <Callout title="No fuel gaps to check on this route yet">
          The open map shows no pumps near this road, or the road has not been drawn. That is a gap in the map, not a
          promise about the road.
        </Callout>
      </div>
    );
  }

  if (showResult && saved) {
    const safeRange = Math.floor(saved.tank * saved.kmpl * (1 - RESERVE));
    const short = longest.gap_km - safeRange;
    const carry = short > 0 ? Math.ceil(short / saved.kmpl) + 1 : 0;
    const scale = Math.max(safeRange, longest.gap_km);
    const reserve = Math.round(saved.tank * RESERVE * 10) / 10;
    const bad = carry > 0;
    return (
      <div className="flex flex-col gap-3">
        <BackHead title="Fuel check" sub={`${saved.name} · ${routeName}`} back={back} />
        <p className="hint hidden md:block">
          {saved.name} · {routeName}
        </p>
        <div
          role="status"
          className={`flex flex-col gap-2 rounded-xl border p-3.5 ${bad ? "border-stale-fg/30 bg-stale-bg" : "border-fresh-fg/30 bg-fresh-bg"}`}
        >
          <span className={`label ${bad ? "!text-stale-fg" : "!text-fresh-fg"}`}>
            {bad ? "Carry extra fuel" : "No extra fuel needed"}
          </span>
          <p className="display num text-[2.125rem]">
            {bad ? `${carry} litres` : km(-short)}{" "}
            <small className="font-sans text-sm font-medium text-ink-2">
              {bad ? `at least, from ${longest.near_from}` : "to spare on the longest gap"}
            </small>
          </p>
          <p className="text-sm">
            Your safe range is {km(safeRange)}. The gap from {longest.near_from} to {longest.near_to} is{" "}
            {km(longest.gap_km)}.
          </p>
          <span className="label mt-1">
            {longest.near_from} to {longest.near_to} · {km(longest.gap_km)} with no pump
          </span>
          <div
            className="relative h-3 overflow-hidden rounded-full border border-line bg-surface"
            role="img"
            aria-label={`Safe range ${km(safeRange)} against a gap of ${km(longest.gap_km)}, on one scale.`}
          >
            <span
              className={`absolute inset-y-0 left-0 ${bad ? "bg-stale-fg" : "bg-sign"}`}
              style={{ width: `${(safeRange / scale) * 100}%` }}
            />
            <span
              className="absolute -inset-y-0.5 w-0.5 bg-ink"
              style={{ left: `calc(${(longest.gap_km / scale) * 100}% - 2px)` }}
            />
          </div>
          <p className="hint num">
            Safe range {km(safeRange)} · the line marks {km(longest.gap_km)}
            {bad ? ` · ${km(short)} short` : ""}
          </p>
        </div>

        <dl className="card flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2.5">
            <dt className="text-[0.9375rem] font-semibold">Tank</dt>
            <dd className="num font-semibold">{saved.tank} litres</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2.5">
            <dt>
              <b className="block text-[0.9375rem]">{terrain === "mountain" ? "Mileage at altitude" : "Mileage on this road"}</b>
              <span className="hint">
                {saved.from === "maker"
                  ? `Maker’s figure, ${cut(terrain).words}. No trip reports yet.`
                  : "What you get, as you typed it."}
              </span>
            </dt>
            <dd className="num shrink-0 font-semibold">{saved.kmpl} km a litre</dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <dt>
              <b className="block text-[0.9375rem]">Kept in reserve</b>
              <span className="hint">One fifth of the tank</span>
            </dt>
            <dd className="num shrink-0 font-semibold">{reserve} litres</dd>
          </div>
        </dl>

        {bad ? (
          <Callout tone="warn" title={`Fill up at ${longest.near_from}`}>
            {note.pumpWords
              ? `The pump there ${note.pumpWords}. Check it before you count on it.`
              : "It is the last pump on the open map before the gap. Check it before you count on it."}
          </Callout>
        ) : (
          <Callout title="This assumes every pump is working">
            {note.before
              ? `If ${longest.near_from} has no fuel, the gap from ${note.before.near} is ${km(note.before.gapKm)}.`
              : "A pump on the map may still be shut, or out of fuel."}{" "}
            A pump missing from the open map is missing here, so the gap is a worst case.
          </Callout>
        )}

        <button type="button" className="link self-start text-sm" onClick={change}>
          Change bike
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BackHead title="Fuel check" sub={routeName} back={back} />
      <label className="relative block">
        <span className="sr-only">Search your bike</span>
        <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-2" />
        <input
          className="field-input !pl-9"
          placeholder="Search your bike"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="label mb-1.5">{popular.length > 0 ? "Bikes riders take most" : "Pick your bike"}</legend>
        <div className="card flex flex-col">
          {shown.map((b) => (
            <label
              key={b.id}
              className="flex min-h-12 cursor-pointer items-center gap-2.5 border-b border-line px-3 py-2 last:border-b-0 has-checked:bg-sign-soft"
            >
              <input
                type="radio"
                name="bike"
                value={b.id}
                checked={bikeId === b.id}
                onChange={() => pickBike(b)}
                className="size-[18px] shrink-0 accent-sign"
              />
              <span className="min-w-0 flex-1 text-[0.9375rem] font-semibold">
                {b.maker} {b.model}
              </span>
              <span className="hint num shrink-0">{b.tank_litres} litres</span>
            </label>
          ))}
          <label className="flex min-h-12 cursor-pointer items-center gap-2.5 px-3 py-2 has-checked:bg-sign-soft">
            <input
              type="radio"
              name="bike"
              value="own"
              checked={own}
              onChange={() => setBikeId("own")}
              className="size-[18px] shrink-0 accent-sign"
            />
            <span className="text-[0.9375rem] font-semibold">My bike is not here</span>
          </label>
        </div>
        {shown.length === 0 ? <p className="hint">No bike on the list has that name. Choose “My bike is not here”.</p> : null}
      </fieldset>

      {own || chosen ? (
        <div className="grid grid-cols-2 gap-3">
          {own ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="fuel-tank" className="text-sm font-semibold">
                Tank, in litres
              </label>
              <input
                id="fuel-tank"
                className="field-input num"
                inputMode="decimal"
                value={tank}
                onChange={(e) => setTank(e.target.value)}
              />
            </div>
          ) : null}
          <div className={`flex flex-col gap-1 ${own ? "" : "col-span-2"}`}>
            <label htmlFor="fuel-kmpl" className="text-sm font-semibold">
              Kilometres to a litre
            </label>
            <input
              id="fuel-kmpl"
              className="field-input num"
              inputMode="decimal"
              value={kmpl}
              placeholder={makers ? String(makers) : ""}
              onChange={(e) => setKmpl(e.target.value)}
              aria-describedby="fuel-kmpl-hint"
            />
          </div>
          <p id="fuel-kmpl-hint" className="hint col-span-2">
            {makers && chosen?.claimed_kmpl
              ? `The maker’s figure is ${chosen.claimed_kmpl}. We have taken it as ${makers}, ${cut(terrain).words}, for this kind of road. Type your own if you know your bike better.`
              : "No maker’s figure is published for this bike. Put in what you get on a full day’s ride."}
          </p>
        </div>
      ) : null}

      <p className="hint">Runs on this phone. No account, and nothing is sent anywhere.</p>
      {saved ? (
        <button type="button" className="link self-start text-sm" onClick={() => setPicking(false)}>
          Keep {saved.name}
        </button>
      ) : null}

      {typing ? (
        <Foot>
          <button type="button" className="btn btn-primary btn-block" disabled={!ready} onClick={check}>
            Check this route
          </button>
        </Foot>
      ) : null}
      <Link className="sr-only" href={back}>
        Back to fuel on {routeName}
      </Link>
    </div>
  );
}
