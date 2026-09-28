"use client";

import { useState } from "react";

import { monthName } from "@/lib/format";
import type { PackingList as List } from "@/lib/types";
import { parseStored, useStored } from "@/lib/use-stored";

const LINK_WORDS: Record<string, { label: string; to: string }> = {
  "fuel-check": { label: "Fuel check", to: "fuel-check" },
  rules: { label: "Rules", to: "rules" },
  save: { label: "Save this route", to: "" },
};

export function PackingList({
  list,
  routeSlug,
  months,
}: {
  list: List;
  routeSlug: string;
  /** The months this road is usually ridden. Only these are offered. Null means every month. */
  months: number[] | null;
}) {
  const offered = months && months.length > 0 ? months : Array.from({ length: 12 }, (_, i) => i + 1);
  const [month, setMonth] = useState<number>(() => {
    const now = new Date().getMonth() + 1;
    return offered.includes(now) ? now : (offered[0] ?? now);
  });
  const [raw, setRaw] = useStored(`meel:packing:${routeSlug}`);
  const ticked =
    parseStored(raw, (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string")) ?? [];

  function toggle(item: string) {
    const next = ticked.includes(item) ? ticked.filter((t) => t !== item) : [...ticked, item];
    setRaw(JSON.stringify(next));
  }

  const items = list.items.filter((i) => i.months.length === 0 || i.months.includes(month));

  return (
    <div className="flex flex-col gap-3">
      <div className="scroll-row" role="group" aria-label="Month of your ride">
        {offered.map((m) => (
          <button key={m} type="button" className="chip" aria-pressed={m === month} onClick={() => setMonth(m)}>
            {monthName(m, true)}
          </button>
        ))}
      </div>
      <p className="label">For this route in {monthName(month)}</p>
      <ul className="card flex flex-col">
        {items.map((i) => {
          const link = i.links_to ? LINK_WORDS[i.links_to] : undefined;
          const id = `pack-${routeSlug}-${i.item.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
          return (
            <li key={i.item} className="flex min-h-12 items-start gap-2.5 border-b border-line px-3 py-2.5 last:border-b-0">
              <input
                id={id}
                type="checkbox"
                checked={ticked.includes(i.item)}
                onChange={() => toggle(i.item)}
                className="mt-0.5 size-[18px] shrink-0 accent-sign"
              />
              <label htmlFor={id} className="min-w-0 flex-1">
                <b className="block text-[0.9375rem] leading-5">{i.item}</b>
                <span className="hint block">
                  {i.reason}
                  {link ? (
                    <>
                      {" "}
                      <a className="link font-medium" href={`/routes/${routeSlug}/${link.to}`}>
                        {link.label}
                      </a>
                    </>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="hint">
        {items.filter((i) => ticked.includes(i.item)).length} of {items.length} ticked. Your ticks are kept on this phone only. {list.written_by}
      </p>
    </div>
  );
}
