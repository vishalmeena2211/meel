"use client";

import Link from "next/link";

import { parseStored, useStored } from "@/lib/use-stored";

import { IconBag, IconFuel, IconPeak, IconRight } from "../icons";

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
  const saved = parseStored(
    bikeRaw,
    (v): v is { tank: number; kmpl: number } =>
      typeof v === "object" && v !== null && typeof (v as { tank?: unknown }).tank === "number" && typeof (v as { kmpl?: unknown }).kmpl === "number",
  );
  const bike = saved ? `${saved.tank} litres · ${saved.kmpl} km to a litre` : null;
  const regions = [...new Set(routes.map((r) => r.region_name))];
  const chosen = routes.find((r) => r.slug === slug);

  function pick(value: string) {
    setLast(value || null);
  }

  const tools = [
    { hash: "fuel", title: "Fuel check", hint: "Where you must carry extra fuel, for your bike", Icon: IconFuel, show: true },
    { hash: "altitude", title: "Altitude and night halts", hint: "How steeply your nights climb", Icon: IconPeak, show: chosen?.high ?? true },
    { hash: "packing", title: "Packing list", hint: "By route and month", Icon: IconBag, show: true },
  ].filter((t) => t.show);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="tool-route" className="text-sm font-semibold">
          Route
        </label>
        <select id="tool-route" className="field-input" value={slug} onChange={(e) => pick(e.target.value)}>
          <option value="">Pick a route</option>
          {regions.map((region) => (
            <optgroup key={region} label={region}>
              {routes
                .filter((r) => r.region_name === region)
                .map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
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
                <Link href={`/routes/${chosen.slug}#${hash}`} className="flex min-h-12 items-center gap-2.5 px-3 py-2.5 hover:bg-surface-2">
                  {inner}
                </Link>
              ) : (
                <span className="flex min-h-12 items-center gap-2.5 px-3 py-2.5 text-ink-2" aria-disabled="true">
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {!chosen ? <p className="hint">Pick a route first. The tools use that road’s own fuel gaps and heights.</p> : null}

      {bike ? (
        <div className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm">
          <b className="block">Your bike is remembered on this phone</b>
          {bike}. Change it in any fuel check.
        </div>
      ) : null}
    </div>
  );
}
