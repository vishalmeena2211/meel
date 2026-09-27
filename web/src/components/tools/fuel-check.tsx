"use client";

import { useEffect, useMemo, useState } from "react";

import { km } from "@/lib/format";
import type { Bike, FuelGap, Terrain } from "@/lib/types";

import { Callout } from "../ui";

const RESERVE = 0.2; // one fifth of the tank is never counted

interface Saved {
  bikeId: string;
  tank: number;
  kmpl: number;
}

function remember(value: Saved): void {
  try {
    window.localStorage.setItem("meel:bike", JSON.stringify(value));
  } catch {
    // Not remembered on this phone. The check still works.
  }
}

function recall(): Saved | null {
  try {
    const raw = window.localStorage.getItem("meel:bike");
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Saved>;
    if (typeof v.bikeId === "string" && typeof v.tank === "number" && typeof v.kmpl === "number") {
      return { bikeId: v.bikeId, tank: v.tank, kmpl: v.kmpl };
    }
  } catch {
    // Unreadable. Start again.
  }
  return null;
}

/** On a climb, at height, a bike does worse than its maker says. How much worse is a guess, and the page says so. */
function likelyKmpl(bike: Bike, terrain: Terrain): number | null {
  if (!bike.claimed_kmpl) return null;
  const factor = terrain === "mountain" ? 0.8 : terrain === "hills" ? 0.85 : 0.9;
  return Math.round(bike.claimed_kmpl * factor);
}

export function FuelCheck({
  bikes,
  gaps,
  terrain,
  routeName,
  pumpsListed,
}: {
  bikes: Bike[];
  gaps: FuelGap[];
  terrain: Terrain;
  routeName: string;
  pumpsListed: boolean;
}) {
  const [bikeId, setBikeId] = useState<string>("");
  const [tank, setTank] = useState<string>("");
  const [kmpl, setKmpl] = useState<string>("");

  useEffect(() => {
    const saved = recall();
    if (saved) {
      setBikeId(saved.bikeId);
      setTank(String(saved.tank));
      setKmpl(String(saved.kmpl));
    }
  }, []);

  const bike = bikes.find((b) => b.id === bikeId) ?? null;
  const longest = gaps[0] ?? null;
  const tankL = Number(tank);
  const mileage = Number(kmpl);
  const ready = tankL > 0 && mileage > 0 && longest !== null;

  const result = useMemo(() => {
    if (!ready || !longest) return null;
    const safeRange = Math.floor(tankL * mileage * (1 - RESERVE));
    const short = longest.gap_km - safeRange;
    const carry = short > 0 ? Math.ceil(short / mileage) + 1 : 0;
    const scale = Math.max(safeRange, longest.gap_km);
    return { safeRange, short, carry, scale, reserve: Math.round(tankL * RESERVE * 10) / 10 };
  }, [ready, longest, tankL, mileage]);

  function pick(id: string) {
    setBikeId(id);
    const chosen = bikes.find((b) => b.id === id);
    if (!chosen) return;
    const t = chosen.tank_litres ?? 0;
    const k = likelyKmpl(chosen, terrain) ?? 0;
    setTank(t ? String(t) : "");
    setKmpl(k ? String(k) : "");
    if (t && k) remember({ bikeId: id, tank: t, kmpl: k });
  }

  function save(nextTank: string, nextKmpl: string) {
    const t = Number(nextTank);
    const k = Number(nextKmpl);
    if (t > 0 && k > 0) remember({ bikeId: bikeId || "own", tank: t, kmpl: k });
  }

  if (!longest) {
    return (
      <Callout title="No fuel gaps to check on this route yet">
        The open map shows no pumps near this road, or the road has not been drawn. That is a gap in the map, not a
        promise about the road.
      </Callout>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1 sm:col-span-3">
          <label htmlFor="fuel-bike" className="text-sm font-semibold">
            Your bike
          </label>
          <select id="fuel-bike" className="field-input" value={bikeId} onChange={(e) => pick(e.target.value)}>
            <option value="">Pick a bike, or fill in the two boxes below</option>
            {bikes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.maker} {b.model} · {b.tank_litres} litres
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="fuel-tank" className="text-sm font-semibold">
            Tank, in litres
          </label>
          <input
            id="fuel-tank"
            className="field-input num"
            inputMode="decimal"
            value={tank}
            onChange={(e) => {
              setTank(e.target.value);
              save(e.target.value, kmpl);
            }}
          />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="fuel-kmpl" className="text-sm font-semibold">
            Kilometres to a litre, on this kind of road
          </label>
          <input
            id="fuel-kmpl"
            className="field-input num"
            inputMode="decimal"
            value={kmpl}
            onChange={(e) => {
              setKmpl(e.target.value);
              save(tank, e.target.value);
            }}
            aria-describedby="fuel-kmpl-hint"
          />
          <p id="fuel-kmpl-hint" className="hint">
            {bike?.claimed_kmpl
              ? `The maker's figure is ${bike.claimed_kmpl}. We have taken off ${terrain === "mountain" ? "one fifth" : "a little"} for ${terrain === "mountain" ? "height and climbing" : "real roads"}. Change it if you know your bike better.`
              : "No maker's figure is published for this bike. Put in what you get on a full day's ride."}
          </p>
        </div>
      </div>

      {result ? (
        <div
          role="status"
          className={`flex flex-col gap-2 rounded-xl border p-3.5 ${
            result.carry > 0 ? "border-stale-fg/30 bg-stale-bg" : "border-fresh-fg/30 bg-fresh-bg"
          }`}
        >
          <span className={`label ${result.carry > 0 ? "!text-stale-fg" : "!text-fresh-fg"}`}>
            {result.carry > 0 ? "Carry extra fuel" : "No extra fuel needed"}
          </span>
          <p className="display num text-[2.125rem]">
            {result.carry > 0 ? `${result.carry} litres` : km(-result.short)}{" "}
            <small className="font-sans text-sm font-medium text-ink-2">
              {result.carry > 0 ? `at least, from near ${longest.near_from}` : "to spare on the longest gap"}
            </small>
          </p>
          <p className="text-sm">
            Your safe range is {km(result.safeRange)}. The longest stretch with no pump on {routeName} is{" "}
            {km(longest.gap_km)}, from near {longest.near_from} to near {longest.near_to}.
          </p>
          <div
            className="relative h-3 overflow-hidden rounded-full border border-line bg-surface"
            role="img"
            aria-label={`Safe range ${km(result.safeRange)} against a gap of ${km(longest.gap_km)}, on one scale.`}
          >
            <span
              className={`absolute inset-y-0 left-0 ${result.carry > 0 ? "bg-stale-fg" : "bg-sign"}`}
              style={{ width: `${(result.safeRange / result.scale) * 100}%` }}
            />
            <span
              className="absolute -inset-y-0.5 w-0.5 bg-ink"
              style={{ left: `calc(${(longest.gap_km / result.scale) * 100}% - 2px)` }}
            />
          </div>
          <p className="hint num">
            Safe range {km(result.safeRange)} · the line marks {km(longest.gap_km)} · {result.reserve} litres kept in
            reserve
          </p>
        </div>
      ) : (
        <p className="hint">Fill in the tank and the mileage to see the answer.</p>
      )}

      <Callout title="What this assumes">
        Every pump on the map is open and has fuel. One fifth of the tank is kept in reserve.{" "}
        {pumpsListed ? "" : "This road is long, so its pumps are counted but not listed. "}
        The gap is a worst case: a pump missing from the open map is missing here.
      </Callout>
    </div>
  );
}
