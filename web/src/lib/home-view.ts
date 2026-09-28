import { useSyncExternalStore } from "react";

/*
  On a phone the front page shows either the list of routes or the drawing of their roads (wireframes, frames 2.1
  and 2.2). The button in the phone's header and the list below it share this one choice. It lasts until the page is
  left, and the list is always what a rider sees first.
*/

export type HomeView = "list" | "map";

let current: HomeView = "list";
const listeners = new Set<() => void>();

function subscribe(changed: () => void): () => void {
  listeners.add(changed);
  return () => listeners.delete(changed);
}

export function setHomeView(next: HomeView): void {
  current = next;
  for (const l of listeners) l();
}

export function useHomeView(): HomeView {
  return useSyncExternalStore(subscribe, () => current, () => "list");
}
