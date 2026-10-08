"use client";

import type { RideCity } from "@/lib/types";
import { setRidingFrom, useRidingFrom } from "@/lib/riding-from";

import { ListPicker, type ChoiceGroup } from "./pickers";

export type CityName = Pick<RideCity, "id" | "name" | "group">;

const NONE = "none";

/** "Riding from": the city a rider sets out from, kept on this phone. The same box on the front page and on a route. */
export function RidingFromField({ cities, id = "riding-from", hint }: { cities: CityName[]; id?: string; hint?: string }) {
  const city = useRidingFrom();
  const groups: ChoiceGroup[] = [...new Set(cities.map((c) => c.group))].map((g) => ({
    label: g,
    choices: cities.filter((c) => c.group === g).map((c) => ({ value: c.id, label: c.name })),
  }));
  groups.push({ label: "Or", choices: [{ value: NONE, label: "Nowhere in particular" }] });
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} id={`${id}-label`} className="text-sm font-semibold">
        Riding from
      </label>
      <ListPicker
        id={id}
        labelId={`${id}-label`}
        title="Riding from"
        groups={groups}
        value={city && cities.some((c) => c.id === city) ? city : ""}
        onValueChange={(v) => setRidingFrom(v === NONE ? null : v)}
        placeholder="Pick a city"
        describedBy={hint ? `${id}-hint` : undefined}
      />
      {hint ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
