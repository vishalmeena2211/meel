"use client";

import { useEffect } from "react";

import { routeOfPage, startAnalytics, track, type EventName, type EventProps } from "@/lib/analytics";

/**
 * Starts Mixpanel once the page is up, and counts the links and buttons marked with data-track.
 * A server-made part of the page names its event in the markup instead of needing script of its own:
 *   <a data-track="Route file downloaded" data-track-props='{"app":"Organic Maps"}'>
 * The route comes from the page's address, so the markup need not repeat it.
 */
export function AnalyticsStart() {
  useEffect(() => {
    void startAnalytics();
    function counted(event: MouseEvent) {
      const el = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-track]") : null;
      const name = el?.dataset.track;
      if (!el || !name) return;
      let props: EventProps = {};
      try {
        props = el.dataset.trackProps ? (JSON.parse(el.dataset.trackProps) as EventProps) : {};
      } catch {
        // A mistyped marking still counts the event, without its details.
      }
      track(name as EventName, { route: routeOfPage(), ...props });
    }
    document.addEventListener("click", counted, { capture: true });
    return () => document.removeEventListener("click", counted, { capture: true });
  }, []);
  return null;
}
