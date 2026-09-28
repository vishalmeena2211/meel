"use client";

import { useEffect, useRef, useState } from "react";

import { sayDate } from "@/lib/format";

import { Callout } from "../ui";

/**
 * Tells a rider who has been here before what changed since, and outlines it.
 * The date of the last visit is kept on the rider's own phone, one for each route and section.
 */
export function SinceLastVisit({ routeSlug, section, noun }: { routeSlug: string; section: string; noun: string }) {
  const [found, setFound] = useState<{ count: number; since: string } | null>(null);
  const anchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = `meel:seen:${routeSlug}:${section}`;
    let last: string | null = null;
    try {
      last = window.localStorage.getItem(key);
      window.localStorage.setItem(key, new Date().toISOString());
    } catch {
      return;
    }
    if (!last) return;
    const scope = anchor.current?.parentElement ?? document;
    const changed = [...scope.querySelectorAll<HTMLElement>("[data-touched]")].filter(
      (el) => (el.dataset.touched ?? "") > (last ?? ""),
    );
    for (const el of changed) el.dataset.hi = "true";
    if (changed.length > 0) {
      const since = last;
      window.setTimeout(() => setFound({ count: changed.length, since }), 0);
    }
  }, [routeSlug, section]);

  return (
    <div ref={anchor} className={found ? "" : "hidden"}>
      {found ? (
        <Callout
          tone="stone"
          title={`${found.count} ${found.count === 1 ? noun : `${noun}s`} ${found.count === 1 ? "has" : "have"} changed since you were here on ${(sayDate(found.since.slice(0, 10)) ?? "").replace(/ \d{4}$/, "")}`}
        >
          {found.count === 1 ? "It is outlined below." : "They are outlined below."}
        </Callout>
      ) : null}
    </div>
  );
}
