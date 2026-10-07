"use client";

import { useMemo, useState } from "react";

import { track } from "@/lib/analytics";
import { feet } from "@/lib/format";
import type { ProfilePoint, Tunnel, Waypoint } from "@/lib/types";

import { Profile, type ProfileMark } from "../route/drawings";
import { BackHead, Foot } from "../shell";
import { Callout, SectionHeading } from "../ui";

// Proposed limits, in metres gained between two nights. To be read by a doctor who knows altitude.
// The check works in metres; riders are told in feet: about 1,600 and 4,900 feet.
const STEEP = 500;
const TOO_STEEP = 1500;

interface Halt {
  name: string;
  km: number;
  m: number;
}

type Verdict = "start" | "fine" | "steep" | "too-steep" | "descends";

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

function verdictOf(gain: number | null): Verdict {
  if (gain === null) return "start";
  if (gain < 0) return "descends";
  if (gain > TOO_STEEP) return "too-steep";
  return gain > STEEP ? "steep" : "fine";
}

/**
 * Between two nights, the halt that splits the climb most evenly.
 * Null when no halt lies between them, or none would make the climb any gentler.
 */
function gentler(before: Halt, after: Halt, halts: Halt[]): Halt | null {
  const now = after.m - before.m;
  let best: Halt | null = null;
  let bestWorst = now;
  for (const h of halts) {
    if (h.km <= before.km || h.km >= after.km) continue;
    const worst = Math.max(h.m - before.m, after.m - h.m);
    if (worst < bestWorst - 50) {
      best = h;
      bestWorst = worst;
    }
  }
  return best;
}

export function AltitudeScreen({
  waypoints,
  profile,
  tunnels,
  distanceKm,
  routeName,
  routeSlug,
  highest,
}: {
  waypoints: Waypoint[];
  profile: ProfilePoint[];
  tunnels: Tunnel[];
  distanceKm: number;
  routeName: string;
  routeSlug: string;
  /** The highest place anyone sleeps on this road. */
  highest: string | null;
}) {
  const halts = useMemo(() => haltsOf(waypoints), [waypoints]);
  const [nights, setNights] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const back = `/routes/${routeSlug}`;

  // Nights are always in the order the road meets them.
  const chosen = halts.filter((h) => nights.includes(h.name));
  const rows = chosen.map((h, i) => {
    const before = chosen[i - 1];
    const gain = before ? h.m - before.m : null;
    return { ...h, night: i + 1, gain, verdict: verdictOf(gain), before: before ?? null };
  });
  const worst = rows.reduce<(typeof rows)[number] | null>(
    (w, r) => (r.gain !== null && (w === null || (w.gain ?? 0) < r.gain) ? r : w),
    null,
  );
  const add = worst && worst.before && (worst.gain ?? 0) > STEEP ? gentler(worst.before, worst, halts) : null;

  const passes: ProfileMark[] = waypoints
    .filter((w) => w.kind === "pass" && w.altitude_m !== null)
    .map((w) => ({ name: w.name, km: w.km_from_start, m: w.altitude_m ?? 0 }));
  const marks: ProfileMark[] = [
    ...passes,
    ...(checked ? rows : halts.map((h) => ({ ...h, night: undefined, verdict: "fine" as Verdict }))).map((r) => ({
      name: r.name,
      km: r.km,
      m: r.m,
      night: "night" in r ? r.night : undefined,
      tooSteep: r.verdict === "too-steep",
    })),
  ].sort((a, b) => a.km - b.km);

  const toggle = (name: string) =>
    setNights(nights.includes(name) ? nights.filter((n) => n !== name) : [...nights, name]);

  if (halts.length < 2) {
    return (
      <div className="flex flex-col gap-3">
        <BackHead title="Altitude" sub={routeName} back={back} />
        <Callout title="Not enough heights to check">This route has fewer than two halts with a known height.</Callout>
      </div>
    );
  }

  if (checked && rows.length >= 2) {
    const gain = worst?.gain ?? 0;
    return (
      <div className="flex flex-col gap-3">
        <BackHead title="Altitude" sub="Your night halts" back={back} />
        <Profile profile={profile} tunnels={tunnels} distanceKm={distanceKm} marks={marks} />

        {worst && worst.verdict === "too-steep" ? (
          <div role="status" className="flex flex-col gap-1.5 rounded-xl border border-stale-fg/30 bg-stale-bg p-3.5">
            <span className="label !text-stale-fg">Night {worst.night} climbs too fast</span>
            <p className="display num text-[2.125rem]">
              +{feet(gain)} <small className="font-sans text-sm font-medium text-ink-2">between two nights</small>
            </p>
            <p className="text-sm">
              {worst.before?.name} to {worst.name} in one day.{" "}
              {add ? `Sleep at ${add.name} first.` : "No halt lies between them to break the climb."}
            </p>
          </div>
        ) : worst && worst.verdict === "steep" ? (
          <div role="status">
            <Callout tone="warn" title={add ? `Night ${worst.night} is a steep climb` : "Steep, but the gentlest this road allows"}>
              {add
                ? `+${feet(gain)} between two nights. A night at ${add.name} would spread it.`
                : `Walkers are told to gain no more than about 1,600 feet a night. No plan between these halts can do that. This one spreads the climb over ${rows.length - 1} ${rows.length - 1 === 1 ? "day" : "days"}.`}
            </Callout>
          </div>
        ) : (
          <div role="status">
            <Callout tone="info" title="No night climbs more than about 1,600 feet above the one before">
              That is the limit walkers are given. It is not a promise of how you will feel.
            </Callout>
          </div>
        )}

        <ol className="card flex flex-col">
          {rows.map((r) => (
            <li key={r.name} className="grid grid-cols-[30px_1fr_auto] items-center gap-2.5 border-b border-line px-3 py-2.5 last:border-b-0">
              <span
                className={`font-display grid size-[30px] place-items-center rounded-full border-[1.5px] border-stone-ink text-[0.9375rem] font-bold ${
                  r.verdict === "too-steep" ? "bg-stale-fg text-surface" : "bg-stone text-stone-ink"
                }`}
              >
                {r.night}
              </span>
              <span>
                <b className="block text-[0.9375rem] leading-5">{r.name}</b>
                <span className="hint num">Sleeps at {feet(r.m)}</span>
              </span>
              <span
                className={`font-display num text-right text-[1.0625rem] leading-none font-bold ${
                  r.verdict === "too-steep"
                    ? "text-stale-fg"
                    : r.verdict === "steep"
                      ? "text-ageing-fg"
                      : r.verdict === "start"
                        ? "text-ink-2"
                        : "text-fresh-fg"
                }`}
              >
                {r.gain === null ? "—" : `${r.gain > 0 ? "+" : "−"}${feet(Math.abs(r.gain))}`}
                <small className="block font-sans text-xs leading-4 font-normal text-ink-2">
                  {r.verdict === "too-steep" ? "too steep" : r.verdict}
                </small>
              </span>
            </li>
          ))}
        </ol>

        <p className="hint">
          This is not medical advice. It compares the height of your beds, nothing more. Heights are read from a 90 m
          grid and can differ from a signboard by a hundred feet or so.
        </p>
        <button type="button" className="link self-start text-sm" onClick={() => setChecked(false)}>
          Change my night halts
        </button>

        {add ? (
          <Foot>
            <button type="button" className="btn btn-primary btn-block" onClick={() => setNights([...nights, add.name])}>
              Add a night at {add.name}
            </button>
          </Foot>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BackHead title="Altitude" sub={routeName} back={back} />
      <Profile profile={profile} tunnels={tunnels} distanceKm={distanceKm} marks={marks} />
      <SectionHeading title="Where riders sleep" aside={`${halts.length} halts`} />
      <p className="hint">Tick the places you will sleep. Two or more.</p>
      <ul className="card flex flex-col">
        {halts.map((h) => {
          const on = nights.includes(h.name);
          return (
            <li key={h.name} className="border-b border-line last:border-b-0">
              <label className="flex min-h-12 cursor-pointer items-center gap-2.5 px-3 py-2 has-checked:bg-sign-soft">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(h.name)}
                  aria-label={`${h.name}, ${feet(h.m)}`}
                  className="size-[18px] shrink-0 accent-sign"
                />
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.9375rem] leading-5">{h.name}</b>
                  {h.name === highest ? <span className="hint">The highest place riders sleep on this road</span> : null}
                </span>
                <span className="num text-[0.9375rem] font-semibold">{feet(h.m)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="hint">Runs on this phone. It works with no network.</p>
      <Foot>
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={chosen.length < 2}
          onClick={() => {
            setChecked(true);
            track("Night halts checked", { route: routeSlug, nights: chosen.length });
          }}
        >
          Check my night halts
        </button>
      </Foot>
    </div>
  );
}
