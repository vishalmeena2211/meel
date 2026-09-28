"use client";

import Link from "next/link";

import { km } from "@/lib/format";
import type { FuelGap } from "@/lib/types";
import { parseStored, useStored } from "@/lib/use-stored";

import { IconBag, IconFuel, IconRight } from "../icons";
import { isSavedBike } from "../tools/fuel-check";

const ROW = "flex min-h-12 items-center gap-2.5 border-b border-line px-3 py-2.5 last:border-b-0 hover:bg-surface-2";

/** The fuel check, as one line: what it says for the bike this phone remembers. */
export function FuelRow({ routeSlug, gap }: { routeSlug: string; gap: FuelGap | null }) {
  const [raw] = useStored("meel:bike");
  const bike = parseStored(raw, isSavedBike);
  let answer = "Where you must carry extra fuel";
  if (bike && gap) {
    const safe = Math.floor(bike.tank * bike.kmpl * 0.8);
    const short = gap.gap_km - safe;
    answer =
      short > 0
        ? `Carry at least ${Math.ceil(short / bike.kmpl) + 1} litres from ${gap.near_from}`
        : `No extra fuel needed. ${km(-short)} to spare.`;
  }
  return (
    <Link href={`/routes/${routeSlug}/fuel-check`} className={ROW}>
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2">
        <IconFuel />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[0.9375rem] leading-5">Fuel check{bike ? ` for your ${bike.name}` : " for your bike"}</b>
        <span className="hint num block">{answer}</span>
      </span>
      <IconRight className="size-4 shrink-0 text-ink-2" />
    </Link>
  );
}

/** The packing list, as one line: how much of it is ticked on this phone. */
export function PackingRow({ routeSlug, month, items }: { routeSlug: string; month: string; items: string[] }) {
  const [raw] = useStored(`meel:packing:${routeSlug}`);
  const ticked = parseStored(raw, (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string")) ?? [];
  const done = items.filter((i) => ticked.includes(i)).length;
  return (
    <Link href={`/routes/${routeSlug}/packing`} className={ROW}>
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2">
        <IconBag />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[0.9375rem] leading-5">Packing list for {month}</b>
        <span className="hint num block">
          {done} of {items.length} ticked
        </span>
      </span>
      <IconRight className="size-4 shrink-0 text-ink-2" />
    </Link>
  );
}
