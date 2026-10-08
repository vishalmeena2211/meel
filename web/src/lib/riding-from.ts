import { useSyncExternalStore } from "react";

import { track } from "./analytics";

/*
  The city a rider sets out from (wireframes, screen 36). It is kept in this browser's storage, not in an account, and
  it is the same choice on every page: the front page's list and a route's "Getting there" both read it.
  Where the browser refuses storage, it lasts until the page is closed.
*/

/** A route starting this close to a city's centre starts in the city: the Golden Quadrilateral in Delhi. */
export const IN_THE_CITY_KM = 30;

const KEY = "meel-riding-from";
const listeners = new Set<() => void>();
let kept: string | null = null;

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY) || null;
  } catch {
    return kept;
  }
}

function subscribe(changed: () => void): () => void {
  listeners.add(changed);
  // Picked in another tab: follow it here too.
  const elsewhere = (e: StorageEvent) => {
    if (e.key === KEY) changed();
  };
  window.addEventListener("storage", elsewhere);
  return () => {
    listeners.delete(changed);
    window.removeEventListener("storage", elsewhere);
  };
}

/** Remembers the city, or forgets it with null. */
export function setRidingFrom(city: string | null): void {
  kept = city;
  try {
    if (city) window.localStorage.setItem(KEY, city);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage refused: the choice lasts until the page is closed.
  }
  for (const l of listeners) l();
  track("Riding from picked", { city: city ?? "none" });
}

/** The city's id, or null when none is picked. Always null while the page is drawn on the server. */
export function useRidingFrom(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
