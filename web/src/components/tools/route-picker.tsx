"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { parseStored, useStored } from "@/lib/use-stored";

import { routeGroups } from "../form";
import { IconBag, IconFuel, IconPeak, IconRight } from "../icons";
import { ListPicker } from "../pickers";
import { isSavedBike } from "./fuel-check";

interface Choice {
  slug: string;
  name: string;
  region_name: string;
  high: boolean;
}

export function RoutePicker({ routes }: { routes: Choice[] }) {
  const [last, setLast] = useStored("meel:route");
  const [bikeRaw] = useStored("meel:bike");
  const slug = last && routes.some((r) => r.slug === last) ? last : "";
  const saved = parseStored(bikeRaw, isSavedBike);
  const bike = saved ? `${saved.name} · ${saved.tank} litres` : null;
  const chosen = routes.find((r) => r.slug === slug);

  const router = useRouter();
  // A tool tapped before a route was picked: it opens once the route is picked.
  const [waiting, setWaiting] = useState<string | null>(null);

  function pick(value: string) {
    setLast(value || null);
    if (value && waiting) router.push(`/routes/${value}/${waiting}`);
  }

  function askForRoute(hash: string) {
    setWaiting(hash);
    document.getElementById("tool-route")?.click();
  }

  const tools = [
    { hash: "fuel-check", title: "Fuel check", hint: "Where you must carry extra fuel, for your bike", Icon: IconFuel, show: true },
    { hash: "altitude", title: "Altitude and night halts", hint: "How steeply your nights climb", Icon: IconPeak, show: chosen?.high ?? true },
    { hash: "packing", title: "Packing list", hint: "By route and month", Icon: IconBag, show: true },
  ].filter((t) => t.show);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="tool-route" id="tool-route-label" className="text-sm font-semibold">
          Route
        </label>
        <ListPicker
          id="tool-route"
          labelId="tool-route-label"
          title="Route"
          groups={routeGroups(routes)}
          value={slug}
          onValueChange={pick}
          onDismiss={() => setWaiting(null)}
          placeholder="Pick a route"
        />
      </div>

      <ul className="card flex flex-col">
        {tools.map(({ hash, title, hint, Icon }) => {
          const inner = (
            <>
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2">
                <Icon />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-[0.9375rem] leading-5">{title}</b>
                <span className="hint block">{hint}</span>
              </span>
              <IconRight className="size-4 shrink-0 text-ink-2" />
            </>
          );
          return (
            <li key={hash} className="border-b border-line last:border-b-0">
              {chosen ? (
                <Link href={`/routes/${chosen.slug}/${hash}`} className="flex min-h-12 items-center gap-2.5 px-3 py-2.5 hover:bg-surface-2">
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => askForRoute(hash)}
                  className="flex min-h-12 w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-2"
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {!chosen ? <p className="hint">Each tool works on one road’s own fuel gaps and heights. Tapping one asks which road.</p> : null}

      {bike ? (
        <div className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm">
          <b className="block">Your bike is remembered on this phone</b>
          {bike}.{" "}
          {chosen ? (
            <Link className="link" href={`/routes/${chosen.slug}/fuel-check`}>
              Change
            </Link>
          ) : (
            "Change it in any fuel check."
          )}
        </div>
      ) : null}
    </div>
  );
}
