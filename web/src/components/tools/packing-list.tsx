"use client";

import { useEffect, useState } from "react";

import { monthName } from "@/lib/format";
import type { PackingList as List } from "@/lib/types";

const LINK_WORDS: Record<string, { label: string; hash: string }> = {
  "fuel-check": { label: "Fuel check", hash: "#fuel" },
  rules: { label: "Rules", hash: "#rules" },
  save: { label: "How to save", hash: "#save" },
};

export function PackingList({ list, routeSlug }: { list: List; routeSlug: string }) {
  const [month, setMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [ticked, setTicked] = useState<string[]>([]);
  const key = `meel:packing:${routeSlug}`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as unknown;
        if (Array.isArray(saved)) setTicked(saved.filter((s): s is string => typeof s === "string"));
      }
    } catch {
      // Ticks are not remembered on this phone.
    }
  }, [key]);

  function toggle(item: string) {
    const next = ticked.includes(item) ? ticked.filter((t) => t !== item) : [...ticked, item];
    setTicked(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Not remembered. The list still works.
    }
  }

  const items = list.items.filter((i) => i.months.length === 0 || i.months.includes(month));

  return (
    <div className="flex flex-col gap-3">
      <div className="scroll-row" role="group" aria-label="Month of your ride">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
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
                      <a className="link font-medium" href={link.hash}>
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
        {ticked.length} of {items.length} ticked. Your ticks are kept on this phone only. {list.written_by}
      </p>
    </div>
  );
}
