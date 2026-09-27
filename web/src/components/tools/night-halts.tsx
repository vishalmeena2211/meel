"use client";

import { useMemo, useState } from "react";

import { metres } from "@/lib/format";
import type { ProfilePoint, Waypoint } from "@/lib/types";

import { Profile, type ProfileMark } from "../route/drawings";
import { Callout } from "../ui";

// Proposed limits, in metres gained between two nights. To be read by a doctor who knows altitude.
const STEEP = 500;
const TOO_STEEP = 1500;

interface Halt {
  name: string;
  km: number;
  m: number;
}

function haltsOf(waypoints: Waypoint[]): Halt[] {
  const seen = new Set<string>();
  const out: Halt[] = [];
  for (const w of waypoints) {
    if (w.kind !== "place" || w.altitude_m === null || seen.has(w.name)) continue;
    seen.add(w.name);
    out.push({ name: w.name, km: w.km_from_start, m: w.altitude_m });
  }
  return out;
}

export function NightHalts({
  waypoints,
  profile,
  distanceKm,
}: {
  waypoints: Waypoint[];
  profile: ProfilePoint[];
  distanceKm: number;
}) {
  const halts = useMemo(() => haltsOf(waypoints), [waypoints]);
  const [nights, setNights] = useState<string[]>([]);

  // Nights are always in the order the road meets them.
  const chosen = halts.filter((h) => nights.includes(h.name));

  const rows = chosen.map((h, i) => {
    const before = chosen[i - 1];
    const gain = before ? h.m - before.m : null;
    const verdict: "start" | "fine" | "steep" | "too-steep" | "descends" =
      gain === null ? "start" : gain < 0 ? "descends" : gain > TOO_STEEP ? "too-steep" : gain > STEEP ? "steep" : "fine";
    return { ...h, night: i + 1, gain, verdict };
  });

  const worst = rows.reduce<(typeof rows)[number] | null>(
    (w, r) => (r.gain !== null && (w === null || (w.gain ?? 0) < r.gain) ? r : w),
    null,
  );

  const passes: ProfileMark[] = waypoints
    .filter((w) => w.kind === "pass" && w.altitude_m !== null)
    .map((w) => ({ name: w.name, km: w.km_from_start, m: w.altitude_m ?? 0 }));
  const marks: ProfileMark[] = [
    ...passes,
    ...rows.map((r) => ({ name: r.name, km: r.km, m: r.m, night: r.night, tooSteep: r.verdict === "too-steep" })),
  ].sort((a, b) => a.km - b.km);

  function toggle(name: string) {
    setNights(nights.includes(name) ? nights.filter((n) => n !== name) : [...nights, name]);
  }

  if (halts.length < 2) {
    return <Callout title="Not enough heights to check">This route has fewer than two halts with a known height.</Callout>;
  }

  return (
    <div className="flex flex-col gap-3">
      <Profile profile={profile} distanceKm={distanceKm} marks={marks} />

      {rows.length < 2 ? (
        <Callout title="Tick the places you will sleep">
          Two or more. The check then compares the height of each night with the one before.
        </Callout>
      ) : worst && worst.gain !== null && worst.gain > STEEP ? (
        <div
          role="status"
          className={`flex flex-col gap-1.5 rounded-xl border p-3.5 ${
            worst.verdict === "too-steep" ? "border-stale-fg/30 bg-stale-bg" : "border-ageing-fg/30 bg-ageing-bg"
          }`}
        >
          <span className={`label ${worst.verdict === "too-steep" ? "!text-stale-fg" : "!text-ageing-fg"}`}>
            Night {worst.night} {worst.verdict === "too-steep" ? "climbs too fast" : "is a steep climb"}
          </span>
          <p className="display num text-[2.125rem]">
            +{metres(worst.gain)} <small className="font-sans text-sm font-medium text-ink-2">between two nights</small>
          </p>
          <p className="text-sm">
            {worst.verdict === "too-steep"
              ? `Add a night lower down before ${worst.name}.`
              : "Walkers are told to gain no more than about 500 m a night. Few mountain roads allow that, so spread the climb as widely as the road lets you."}
          </p>
        </div>
      ) : (
        <div role="status">
          <Callout tone="info" title="No night climbs more than 500 m above the one before">
            That is the limit walkers are given. It is not a promise of how you will feel.
          </Callout>
        </div>
      )}

      <fieldset className="flex flex-col gap-1">
        <legend className="label mb-1">Where you will sleep</legend>
        <ul className="card flex flex-col">
          {halts.map((h) => {
            const row = rows.find((r) => r.name === h.name);
            return (
              <li key={h.name} className="border-b border-line last:border-b-0">
                <label className="grid min-h-[52px] cursor-pointer grid-cols-[30px_1fr_auto] items-center gap-2.5 px-3 py-2">
                  <span className="relative grid size-[30px] place-items-center">
                    <input
                      type="checkbox"
                      checked={row !== undefined}
                      onChange={() => toggle(h.name)}
                      className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                    />
                    <span
                      aria-hidden="true"
                      className={`font-display grid size-[30px] place-items-center rounded-full border-[1.5px] text-[0.9375rem] font-bold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sign ${
                        row ? "border-ink bg-stone" : "border-rule bg-surface text-transparent"
                      }`}
                    >
                      {row ? row.night : "0"}
                    </span>
                  </span>
                  <span>
                    <b className="block text-[0.9375rem] leading-5">{h.name}</b>
                    <span className="hint num">
                      {metres(h.m)} · {Math.round(h.km).toLocaleString("en-IN")} km from the start
                    </span>
                  </span>
                  {row ? (
                    <span
                      className={`font-display num text-right text-[1.0625rem] leading-none font-bold ${
                        row.verdict === "too-steep"
                          ? "text-stale-fg"
                          : row.verdict === "steep"
                            ? "text-ageing-fg"
                            : row.verdict === "start"
                              ? "text-ink-2"
                              : "text-fresh-fg"
                      }`}
                    >
                      {row.gain === null ? "—" : `${row.gain > 0 ? "+" : "−"}${metres(Math.abs(row.gain))}`}
                      <small className="block font-sans text-[0.6875rem] leading-4 font-normal text-ink-2">
                        {row.verdict === "start" ? "first night" : row.verdict === "too-steep" ? "too steep" : row.verdict}
                      </small>
                    </span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <p className="hint">
        This is not medical advice. It compares the height of your beds, nothing more. Heights are read from a 90 m
        grid and can differ from a signboard by some tens of metres.
      </p>
    </div>
  );
}
