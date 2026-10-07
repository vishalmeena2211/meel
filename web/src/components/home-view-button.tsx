"use client";

import { track } from "@/lib/analytics";
import { setHomeView, useHomeView } from "@/lib/home-view";

import { IconList, IconMap } from "./icons";

/** In the phone's header on the front page: shows the roads drawn, or the list again. */
export function HomeViewButton() {
  const view = useHomeView();
  const map = view === "map";
  return (
    <button
      type="button"
      onClick={() => {
        setHomeView(map ? "list" : "map");
        track("Home view switched", { to: map ? "list" : "map" });
      }}
      aria-label={map ? "Show the routes as a list" : "Show the routes drawn as roads"}
      className="grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-surface hover:border-ink-2"
    >
      {map ? <IconList className="size-[18px]" /> : <IconMap className="size-[18px]" />}
    </button>
  );
}
