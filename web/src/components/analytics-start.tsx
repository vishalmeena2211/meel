"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { followRecording, routeOfPage, startAnalytics, track, type EventName, type EventProps } from "@/lib/analytics";

/**
 * Starts Mixpanel once the page is up, and counts the links and buttons marked with data-track.
 * A server-made part of the page names its event in the markup instead of needing script of its own:
 *   <a data-track="Route file downloaded" data-track-props='{"app":"Organic Maps"}'>
 * The route comes from the page's address, so the markup need not repeat it.
 */
export function AnalyticsStart() {
  const path = usePathname();
  // The recording follows the page. It stops before a page that may not be recorded is drawn: on the click that
  // leads there, and on the browser's back button; this catches anything else.
  useEffect(() => {
    followRecording(path);
  }, [path]);

  useEffect(() => {
    void startAnalytics();
    function leaving(event: MouseEvent) {
      const a = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!a || a.origin !== window.location.origin) return;
      followRecording(a.pathname);
    }
    function back() {
      followRecording(window.location.pathname);
    }
    document.addEventListener("click", leaving, { capture: true });
    window.addEventListener("popstate", back);
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
    return () => {
      document.removeEventListener("click", counted, { capture: true });
      document.removeEventListener("click", leaving, { capture: true });
      window.removeEventListener("popstate", back);
    };
  }, []);
  return null;
}
