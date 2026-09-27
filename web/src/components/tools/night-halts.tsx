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
  const first = halts[0];
  const last = halts[halts.length - 1];
  const [nights, setNights] = useState<string[]>(() => (first && last ? [first.name, last.name] : []));

  const chosen = nights
    .map((n) => halts.find((h) => h.name === n))
    .filter((h): h is Halt => h !== undefined);

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

  const unused = halts.filter((h) => !nights.includes(h.name));

  function add(name: string) {
    if (!name) return;
    const next = [...nights, name].sort((a, b) => {
      const ka = halts.find((h) => h.name === a)?.km ?? 0;
      const kb = halts.find((h) => h.name === b)?.km ?? 0;
      return ka - kb;
    });
    setNights(next);
  }

  if (halts.length < 2) {
    return <Callout title="Not enough heights to check">This route has fewer than two halts with a known height.</Callout>;
  }

  return (
    <div className="flex flex-col gap-3">
      <Profile profile={profile} distanceKm={distanceKm} marks={marks} />

      {worst && worst.gain !== null && worst.gain > STEEP ? (
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
        <Callout tone="info" title="No night climbs more than 500 m above the one before">
          That is the limit walkers are given. It is not a promise of how you will feel.
        </Callout>
      )}

      <ol className="card flex flex-col">
        {rows.map((r) => (
          <li
            key={r.name}
            className="grid min-h-[52px] grid-cols-[30px_1fr_auto_auto] items-center gap-2.5 border-b border-line px-3 py-2 last:border-b-0"
          >
            <span className="font-display grid size-[30px] place-items-center rounded-full bg-stone text-[0.9375rem] font-bold">
              {r.night}
            </span>
            <span>
              <b className="block text-[0.9375rem] leading-5">{r.name}</b>
              <span className="hint num">Sleeps at {metres(r.m)}</span>
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
              {r.gain === null ? "—" : `${r.gain > 0 ? "+" : "−"}${metres(Math.abs(r.gain))}`}
              <small className="block font-sans text-[0.6875rem] leading-4 font-normal text-ink-2">
                {r.verdict === "start"
                  ? "start"
                  : r.verdict === "too-steep"
                    ? "too steep"
                    : r.verdict === "steep"
                      ? "steep"
                      : r.verdict === "descends"
                        ? "descends"
                        : "fine"}
              </small>
            </span>
            <button
              type="button"
              className="link min-h-11 px-1 text-sm disabled:text-rule disabled:no-underline"
              disabled={rows.length <= 2}
              onClick={() => setNights(nights.filter((n) => n !== r.name))}
              aria-label={`Remove the night at ${r.name}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ol>

      {unused.length > 0 ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="add-night" className="text-sm font-semibold">
            Add a night
          </label>
          <select id="add-night" className="field-input" value="" onChange={(e) => add(e.target.value)}>
            <option value="">Pick a halt</option>
            {unused.map((h) => (
              <option key={h.name} value={h.name}>
                {h.name} · {metres(h.m)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <p className="hint">
        This is not medical advice. It compares the height of your beds, nothing more. Heights are read from a 90 m
        grid and can differ from a signboard by some tens of metres.
      </p>
    </div>
  );
}
